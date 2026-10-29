import { describe, it, expect, beforeEach } from 'vitest'
import { createRoom, addPlayer, setBoard, catchWord } from '../DuelRoom'
import { generateDecoys, usePower, registerSocket } from '../PowerManager'
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
  it('restan puntos en vez de no hacer nada', () => {
    const room = sala([palabra('0', false)])
    const r = catchWord(room, 'sock-a', '0')
    expect(r.pointsEarned).toBeLessThan(0)
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

describe('penalizacion por errar', () => {
  it('errar resta lo mismo que vale acertar, igual que en el juego de un jugador', () => {
    const room = sala([palabra('0', true), palabra('1', false)])
    catchWord(room, 'sock-a', '0')                 // +10
    const mala = catchWord(room, 'sock-a', '1')    // -10
    expect(mala.pointsEarned).toBe(-10)
    expect(room.players.get('A')!.score).toBe(0)
  })

  it('en nivel 2 la resta acompaña al puntaje', () => {
    const room = sala([palabra('0', false)], 2)    // base 20 -> resta 20
    const mala = catchWord(room, 'sock-a', '0')
    expect(mala.pointsEarned).toBe(-20)
  })

  it('el puntaje nunca baja de cero', () => {
    const room = sala([palabra('0', false), palabra('1', false)])
    catchWord(room, 'sock-a', '0')
    catchWord(room, 'sock-a', '1')
    expect(room.players.get('A')!.score).toBe(0)
  })

  it('la penalizacion no se puede robar ni duplicar', () => {
    // Los poderes de captura miran puntos ganados, no perdidos: el rival no
    // deberia cobrar cuando te equivocas, ni tu DOBLE agrandar tu propio error.
    const room = sala([palabra('0', false)])
    const ana = room.players.get('A')!
    const beto = room.players.get('B')!
    ana.activeEffects.push({ type: 'DOUBLE', expiresAt: null, capturesRemaining: 1 })
    beto.activeEffects.push({ type: 'STEAL', expiresAt: null, capturesRemaining: 1 })

    const mala = catchWord(room, 'sock-a', '0')
    expect(mala.pointsEarned).toBe(-10)
    expect(mala.stolenByRival).toBe(false)
    expect(beto.score).toBe(0)
    // Los dos poderes siguen intactos para la proxima captura que valga.
    expect(ana.activeEffects.length).toBe(1)
    expect(beto.activeEffects.length).toBe(1)
  })
})

describe('señuelos del DECOY', () => {
  it('salen del mazo de la partida, no de la lista de reserva', () => {
    const room = sala([palabra('0', true)])
    room.words[0]!.text = 'mesa'
    room.decoyPool = ['perro', 'gato', 'casa', 'arbol', 'silla', 'ventana']

    const senuelos = generateDecoys(room)
    expect(senuelos).toHaveLength(4)
    for (const s of senuelos) {
      expect(room.decoyPool).toContain(s)
    }
  })

  it('nunca repite una palabra que ya esta en el tablero', () => {
    const room = sala([palabra('0', true)])
    room.words[0]!.text = 'perro'
    // El mazo trae "perro" por error: no debe aparecer como señuelo, porque un
    // duplicado de algo visible se nota al instante.
    room.decoyPool = ['perro', 'gato', 'casa', 'arbol', 'silla']

    for (let i = 0; i < 20; i++) {
      expect(generateDecoys(room)).not.toContain('perro')
    }
  })

  it('cae en la lista de reserva si el cliente no mando mazo', () => {
    // Clientes viejos que no envian decoyPool: el poder tiene que seguir
    // funcionando aunque los señuelos sean genericos.
    const room = sala([palabra('0', true)])
    room.decoyPool = []
    expect(generateDecoys(room)).toHaveLength(4)
  })
})

describe('señuelos: la lista de reserva tambien se filtra', () => {
  it('no repite una palabra del tablero aunque venga de la reserva', () => {
    // Lo encontro una prueba en un duelo real: sin mazo del cliente, salio
    // "luna" como señuelo y "luna" estaba en el tablero. El filtro se aplicaba
    // solo al mazo del cliente, no a la reserva.
    const room = sala([palabra('0', true), palabra('1', true)])
    room.words[0]!.text = 'luna'
    room.words[1]!.text = 'agua'
    room.decoyPool = []   // cliente viejo: se usa la reserva

    for (let i = 0; i < 30; i++) {
      const senuelos = generateDecoys(room)
      expect(senuelos).not.toContain('luna')
      expect(senuelos).not.toContain('agua')
      expect(senuelos).toHaveLength(4)
    }
  })
})

describe('ROBAR de punta a punta (usePower + catchWord)', () => {
  // Los cooldowns viven en un Map a nivel de modulo, por socket: sin esto el
  // ROBAR de un test deja al siguiente en espera y falla por contagio.
  beforeEach(() => { registerSocket('sock-a'); registerSocket('sock-b') })

  it('el que lo activa se queda con la siguiente captura del rival', () => {
    // Este test atraviesa las DOS mitades del poder. Los anteriores colocaban
    // el efecto a mano y salteaban usePower, que era justo donde estaba el
    // desacuerdo: usePower marcaba a la victima y catchWord buscaba la marca
    // en el ladron, asi que ROBAR no hacia nada nunca.
    const room = sala([palabra('0', true)])
    const ana = room.players.get('A')!
    ana.powerInventory = ['STEAL']

    const r = usePower(room, 'sock-a', 'STEAL')
    expect(r.ok).toBe(true)

    const captura = catchWord(room, 'sock-b', '0')   // captura Beto
    expect(captura.stolenByRival).toBe(true)
    expect(room.players.get('A')!.score).toBe(10)    // se los lleva Ana
    expect(room.players.get('B')!.score).toBe(0)     // Beto no suma
  })

  it('el ESCUDO del rival lo bloquea', () => {
    const room = sala([palabra('0', true)])
    const ana = room.players.get('A')!
    const beto = room.players.get('B')!
    ana.powerInventory = ['STEAL']
    beto.activeEffects.push({ type: 'SHIELD', expiresAt: null, capturesRemaining: 1 })

    const r = usePower(room, 'sock-a', 'STEAL')
    expect(r.ok && r.blocked).toBe(true)

    const captura = catchWord(room, 'sock-b', '0')
    expect(captura.stolenByRival).toBe(false)
    expect(room.players.get('B')!.score).toBe(10)    // Beto conserva lo suyo
  })
})

describe('DOBLE y ESCUDO de punta a punta (usePower + catchWord)', () => {
  beforeEach(() => { registerSocket('sock-a'); registerSocket('sock-b') })

  it('DOBLE: la siguiente captura correcta vale el doble', () => {
    const room = sala([palabra('0', true)])
    room.players.get('A')!.powerInventory = ['DOUBLE']

    expect(usePower(room, 'sock-a', 'DOUBLE').ok).toBe(true)
    const r = catchWord(room, 'sock-a', '0')
    expect(r.pointsEarned).toBe(20)
  })

  it('DOBLE: sobrevive a una equivocada y se cobra en la siguiente correcta', () => {
    const room = sala([palabra('0', false), palabra('1', true)])
    room.players.get('A')!.powerInventory = ['DOUBLE']

    usePower(room, 'sock-a', 'DOUBLE')
    catchWord(room, 'sock-a', '0')                 // erra: no lo gasta
    expect(catchWord(room, 'sock-a', '1').pointsEarned).toBe(20)
  })

  it('ESCUDO: bloquea el CONGELAR y el rival puede seguir capturando', () => {
    const room = sala([palabra('0', true)])
    room.players.get('B')!.powerInventory = ['SHIELD']
    room.players.get('A')!.powerInventory = ['FREEZE']

    expect(usePower(room, 'sock-b', 'SHIELD').ok).toBe(true)
    const freeze = usePower(room, 'sock-a', 'FREEZE')
    expect(freeze.ok && freeze.blocked).toBe(true)

    // Si el escudo no hubiera bloqueado, esta captura fallaria por congelamiento.
    expect(catchWord(room, 'sock-b', '0').success).toBe(true)
  })

  it('ESCUDO: se gasta al bloquear, y el segundo poder si entra', () => {
    const room = sala([palabra('0', true)])
    room.players.get('B')!.powerInventory = ['SHIELD']
    room.players.get('A')!.powerInventory = ['FREEZE', 'DECOY']

    usePower(room, 'sock-b', 'SHIELD')
    usePower(room, 'sock-a', 'FREEZE')             // consume el escudo
    const segundo = usePower(room, 'sock-a', 'DECOY')
    expect(segundo.ok && segundo.blocked).toBe(false)   // ya no hay escudo
  })
})

describe('tocar todo no es una estrategia (auditoría DID-20)', () => {
  // Antes el tablero era 12 correctas / 8 incorrectas con resta a la mitad: tocar
  // todo rendía 80 de 120 posibles y el duelo se ganaba por velocidad de dedo.
  it('tocar todo el tablero rinde bastante menos que jugarlo bien, en los tres niveles', async () => {
    const { construirTablero } = await import('../tablero')
    for (const nivel of [1, 2, 3]) {
      let tocarTodo = 0, perfecto = 0
      const N = 200
      for (let i = 0; i < N; i++) {
        const tablero = construirTablero(['sustantivos'], nivel)!
        const room = sala(tablero.map(w => ({ ...w, takenBy: null })), nivel)
        for (const w of room.words) catchWord(room, 'sock-a', w.id)
        tocarTodo += room.players.get('A')!.score

        const room2 = sala(tablero.map(w => ({ ...w, takenBy: null })), nivel)
        for (const w of room2.words.filter(x => x.isCorrect)) catchWord(room2, 'sock-a', w.id)
        perfecto += room2.players.get('A')!.score
      }
      const media = tocarTodo / N, optimo = perfecto / N
      expect(media, `nivel ${nivel}: tocar todo ${media.toFixed(0)} vs perfecto ${optimo}`).toBeLessThan(optimo * 0.4)
    }
  })
})

describe('reconexión: reglas puras', () => {
  it('marcar caído no saca al jugador de la sala; reconectar con su token lo reengancha', async () => {
    const { marcarDesconectado, reconectar } = await import('../DuelRoom')
    const room = sala([palabra('0', true)])
    const ana = room.players.get('A')!
    const caido = marcarDesconectado(room, 'sock-a', 1234)!
    expect(caido.desconectadoEn).toBe(1234)
    expect(room.players.size).toBe(2)
    const r = reconectar(room, ana.token, 'sock-nuevo')!
    expect(r.socketAnterior).toBe('sock-a')
    expect(ana.socketId).toBe('sock-nuevo')
    expect(ana.desconectadoEn).toBeNull()
  })

  it('un token inventado, vacío o de otro tipo no reconecta a nadie', async () => {
    const { reconectar } = await import('../DuelRoom')
    const room = sala([palabra('0', true)])
    for (const t of ['', 'abc', 'x'.repeat(24), undefined as unknown as string, 5 as unknown as string]) {
      expect(reconectar(room, t, 'sock-x')).toBeNull()
    }
  })

  it('el puntaje sigue siendo del jugador después de volver', async () => {
    const { marcarDesconectado, reconectar } = await import('../DuelRoom')
    const room = sala([palabra('0', true), palabra('1', true)])
    catchWord(room, 'sock-a', '0')
    const ana = room.players.get('A')!
    marcarDesconectado(room, 'sock-a')
    reconectar(room, ana.token, 'sock-a2')
    catchWord(room, 'sock-a2', '1')
    expect(ana.score).toBe(20)
  })
})
