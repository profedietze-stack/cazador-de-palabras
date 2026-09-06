import { describe, it, expect } from 'vitest'
import { createRoom, addPlayer, setBoard, catchWord } from '../DuelRoom'
import type { RoomState, DuelWord } from '../types'

// Reglas del juego, no seguridad. Cada test describe como deberia comportarse
// el duelo desde el punto de vista de quien lo juega.

function sala(words: DuelWord[], nivel = 1): RoomState {
  const room = createRoom('TEST1')
  addPlayer(room, 'sock-a', 'Ana')
  addPlayer(room, 'sock-b', 'Beto')
  setBoard(room, words, 60, ['sust'], nivel)
  room.phase = 'playing'
  return room
}

const palabra = (id: string, isCorrect: boolean): DuelWord =>
  ({ id, text: 'p' + id, isCorrect, takenBy: null })

describe('palabras incorrectas', () => {
  it('no dan puntos', () => {
    const room = sala([palabra('0', false)])
    const r = catchWord(room, 'sock-a', '0')
    expect(r.pointsEarned).toBe(0)
  })

  it('NO deberian acercarte a ganar un poder', () => {
    // Si contaran, alcanza con tocar palabras equivocadas —que no cuestan
    // nada— para cosechar poderes gratis. El poder tiene que premiar acertar.
    const room = sala([palabra('0', false), palabra('1', false), palabra('2', false)])
    catchWord(room, 'sock-a', '0')
    catchWord(room, 'sock-a', '1')
    const tercera = catchWord(room, 'sock-a', '2')
    expect(tercera.powerEarned).toBeNull()
  })

  it('aciertos seguidos si dan un poder cada 3', () => {
    const room = sala([palabra('0', true), palabra('1', true), palabra('2', true)])
    catchWord(room, 'sock-a', '0')
    catchWord(room, 'sock-a', '1')
    const tercera = catchWord(room, 'sock-a', '2')
    expect(tercera.powerEarned).not.toBeNull()
  })
})

describe('DOBLE', () => {
  it('no se gasta en una palabra que no da puntos', () => {
    // Gastar el poder para duplicar 0 es perderlo por nada.
    const room = sala([palabra('0', false), palabra('1', true)])
    const ana = room.players.get('A')!
    ana.activeEffects.push({ type: 'DOUBLE', expiresAt: null, capturesRemaining: 1 })

    catchWord(room, 'sock-a', '0')   // incorrecta: no deberia consumirlo
    const buena = catchWord(room, 'sock-a', '1')

    expect(buena.pointsEarned).toBe(20)  // 10 x nivel 1, duplicado
  })
})

describe('ROBAR', () => {
  it('no se gasta cuando no hay puntos que robar', () => {
    // Si el rival toca una palabra equivocada, el ladron no roba nada: el
    // poder tiene que seguir esperando la proxima captura que valga puntos.
    const room = sala([palabra('0', false), palabra('1', true)])
    const beto = room.players.get('B')!
    beto.activeEffects.push({ type: 'STEAL', expiresAt: null, capturesRemaining: 1 })

    const mala = catchWord(room, 'sock-a', '0')
    expect(mala.stolenByRival).toBe(false)

    const buena = catchWord(room, 'sock-a', '1')
    expect(buena.stolenByRival).toBe(true)
    expect(room.players.get('B')!.score).toBe(10)
    expect(room.players.get('A')!.score).toBe(0)
  })
})

describe('poder ganado con el inventario lleno', () => {
  it('no se pierde el turno: se vuelve a intentar en la siguiente captura', () => {
    // Con el inventario lleno el poder se descartaba en silencio y habia que
    // esperar otras 3 capturas. Quien acumula poderes terminaba recibiendo
    // menos que quien los gasta rapido, sin que nada lo explique.
    const room = sala([0, 1, 2, 3].map(i => palabra(String(i), true)))
    const ana = room.players.get('A')!
    ana.powerInventory = ['FREEZE', 'STEAL']   // lleno (max 2)

    catchWord(room, 'sock-a', '0')
    catchWord(room, 'sock-a', '1')
    const tercera = catchWord(room, 'sock-a', '2')
    expect(tercera.powerEarned).toBeNull()     // lleno: no entra

    ana.powerInventory = ['FREEZE']            // gasta uno
    const cuarta = catchWord(room, 'sock-a', '3')
    expect(cuarta.powerEarned).not.toBeNull()  // ahora si
  })
})
