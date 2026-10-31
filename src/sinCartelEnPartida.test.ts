import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { normalizarAjustes } from './storage/ajustes'

// Decisión del docente: durante la partida nadie lee un cartel que explica el error, es un
// distractor. El «¿Por qué?» de cada palabra mal tocada se muestra DESPUÉS, en la pantalla final.

const leer = (f: string): string => readFileSync(f, 'utf8')
const html = leer('index.html')
const motor = leer('src/game/GameEngine.ts')

describe('durante la partida no aparece ningún cartel de explicación', () => {
  it('la pantalla de juego no tiene el contenedor del «¿Por qué?»', () => {
    const juego = html.slice(html.indexOf('id="gameScreen"'), html.indexOf('id="resultadoScreen"'))
    expect(juego).not.toContain('id="porQue"')
  })
  it('el motor no lo muestra al errar (pero sí registra el fallo para la pantalla final)', () => {
    expect(motor).not.toContain('mostrarPorQue')
    expect(motor).not.toContain("getElementById('porQue')")
    expect(motor).toContain('G.fallosPartida[palabra]')
    expect(motor).toContain('falloEnRepaso(')
  })
  it('ya no existe el estilo del cartel ni el ajuste para elegir cuánto dura', () => {
    expect(leer('src/styles/screens.css')).not.toContain('.por-que')
    expect(html).not.toContain('porQueSeg')
    expect(leer('src/storage/ajustes.ts')).not.toContain('porQueSeg')
    expect('porQueSeg' in normalizarAjustes({ porQueSeg: 5 })).toBe(false)   // un guardado viejo se ignora sin romper
  })
})

describe('la pantalla final dice en qué palabras se equivocó y por qué', () => {
  it('el repaso se muestra abierto, no plegado', () => {
    expect(leer('src/game/repasoHtml.ts')).toContain('<details class="repaso" open>')
  })
  it('el repaso sale de las palabras falladas en la partida', () => {
    const r = leer('src/screens/ResultScreen.ts')
    expect(r).toContain('G.fallosPartida')
    expect(r).toContain('repasoHtml(')
  })
})

describe('botones de la partida y estadísticas de la pantalla final', () => {
  it('los botones Salir/Pausa/Pantalla completa están en su propia fila, no sobre las palabras que caen', () => {
    const juego = html.slice(html.indexOf('id="gameScreen"'), html.indexOf('id="resultadoScreen"'))
    const iArea = juego.indexOf('id="gameArea"')
    expect(juego.indexOf('class="game-btns"')).toBeGreaterThan(-1)
    expect(juego.indexOf('class="game-btns"')).toBeLessThan(iArea)
    expect(leer('src/styles/screens.css')).not.toMatch(/\.game-btns\{[^}]*position:\s*absolute/)
  })
  it('las etiquetas de la pantalla final son cortas y no se parten en dos líneas', () => {
    const r = leer('src/screens/ResultScreen.ts')
    expect(r).not.toContain('Palabras correctas:')
    expect(r).not.toContain('Palabras incorrectas:')
    expect(r).toContain('<span>Correctas:</span>')
    expect(r).toContain('<span>Incorrectas:</span>')
  })
})
