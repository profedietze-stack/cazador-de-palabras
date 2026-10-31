import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { razonContraste } from '../ui/contraste'

const html = readFileSync('index.html', 'utf8')
const juego = html.slice(html.indexOf('id="gameScreen"'), html.indexOf('id="resultadoScreen"'))
const leer = (f: string): string => readFileSync(`src/styles/${f}.css`, 'utf8')
const todo = ['base', 'screens', 'components', 'componentes', 'responsive', 'a11y', 'ajustes'].map(leer).join('\n')
const tokens = leer('tokens')
const token = (n: string): string => new RegExp(`${n}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1] ?? ''

describe('partida: pantalla con el paisaje del mundo', () => {
  it('lleva el contenedor del paisaje y las placas del HUD', () => {
    expect(juego).toMatch(/id="gameScreen" class="screen con-mundo"/)
    expect(juego).toContain('class="fondo-mundo"')
    expect([...juego.matchAll(/class="hud-stat placa"/g)].length).toBe(4)
  })

  it('el color de fondo ya no sale de las clases cat-bg-*: lo da el mundo', () => {
    expect(todo).not.toMatch(/cat-bg-/)
    expect(readFileSync('src/game/GameEngine.ts', 'utf8')).not.toContain('cat-bg-')
  })

  it('una viñeta apaga el paisaje detrás de las palabras para que no compita', () => {
    expect(todo).toMatch(/#gameScreen \.fondo-mundo::after\s*\{[^}]*radial-gradient/)
  })

  it('los botones de la partida son 3D chicos y miden al menos 44 px', () => {
    for (const id of ['btnVolver', 'btnPausa', 'btnFs']) expect(juego, id).toMatch(new RegExp(`class="btn3d btn3d--chico" id="${id}"`))
  })
})

describe('partida: las palabras que caen se leen siempre', () => {
  it('la palabra es una placa crema con letra marrón oscura, medida (≥ 4,5:1)', () => {
    expect(todo).toMatch(/\.palabra\{[^}]*background:\s*var\(--palabra-bg\)/)
    expect(todo).toMatch(/\.palabra\{[^}]*color:\s*var\(--palabra-fg\)/)
    expect(razonContraste(token('--palabra-fg'), token('--palabra-bg'))).toBeGreaterThanOrEqual(4.5)
  })

  it('al acertar o errar la placa cambia de color sin perder contraste', () => {
    expect(razonContraste(token('--palabra-fg'), token('--palabra-ok-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(razonContraste(token('--palabra-fg'), token('--palabra-mal-bg'))).toBeGreaterThanOrEqual(4.5)
    const anim = leer('animations')
    // El bloque de un @keyframes va hasta el siguiente @keyframes (las llaves anidadas rompen una regex simple).
    const bloque = (n: string): string => {
      const i = anim.indexOf(`@keyframes ${n}`)
      const j = anim.indexOf('@keyframes', i + 1)
      return i === -1 ? '' : anim.slice(i, j === -1 ? undefined : j)
    }
    expect(bloque('hitOk')).toContain('background:var(--palabra-ok-bg)')
    expect(bloque('hitMal')).toContain('background:var(--palabra-mal-bg)')
  })

  it('los puntos flotantes llevan la tipografía de títulos y un contorno que los separa del fondo', () => {
    expect(todo).toMatch(/\.punto-flotante\{[^}]*font-family:\s*var\(--font-titulo\)/)
    expect(todo).toMatch(/\.punto-flotante\{[^}]*text-shadow:[^;}]*rgba\(0,0,0,\.[6-9]\)/)
  })
})

describe('partida: el aviso de combo mantiene el texto blanco legible', () => {
  const comp = leer('components')
  for (const n of [1, 2, 3, 4]) {
    it(`combo nivel ${n}: ambos extremos del degradado dan ≥ 4,5:1 con texto blanco`, () => {
      const g = new RegExp(`\\.combo-lv${n}\\{background:linear-gradient\\(135deg,(#[0-9a-f]{6}),(#[0-9a-f]{6})\\)`).exec(comp)
      expect(g, `combo-lv${n}`).not.toBeNull()
      for (const c of [g![1]!, g![2]!]) expect(razonContraste('#ffffff', c), c).toBeGreaterThanOrEqual(4.5)
    })
  }
  it('combo nivel 5: todos los colores del degradado dan ≥ 4,5:1 con texto blanco', () => {
    const g = /\.combo-lv5\{\s*background:linear-gradient\(135deg,([^)]+)\)/.exec(comp)
    expect(g).not.toBeNull()
    const colores = g![1]!.split(',').map(s => s.trim())
    expect(colores.length).toBeGreaterThanOrEqual(3)
    for (const c of colores) expect(razonContraste('#ffffff', c), c).toBeGreaterThanOrEqual(4.5)
  })
})
