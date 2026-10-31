// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DT_MAX_MS, avanzar, balanceo, entrada, aplicarPosicion, alturaDe,
  cantidadChispas, lanzarChispas, lanzarChapuzon,
} from './caida'
import { cambiarAjustes, restablecerAjustes } from '../storage/ajustes'

const leer = (f: string): string => readFileSync(f, 'utf8')
let cont: HTMLElement

beforeEach(() => {
  localStorage.clear()
  restablecerAjustes()
  ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener() {} })
  document.body.innerHTML = '<div id="cont"></div>'
  cont = document.getElementById('cont')!
})
afterEach(() => { vi.useRealTimers() })

describe('avanzar: el movimiento se mide por tiempo, no por fotograma', () => {
  const caer = (hz: number): number => {
    let y = 0
    for (let i = 0; i < hz; i++) y = avanzar(y, 100, 1000 / hz)   // un segundo a 100 px/s
    return y
  }
  it('en una pantalla de 60 Hz, de 120 Hz y de 144 Hz cae lo mismo en un segundo', () => {
    expect(caer(60)).toBeCloseTo(100, 5)
    expect(caer(120)).toBeCloseTo(100, 5)
    expect(caer(144)).toBeCloseTo(100, 5)
  })
  it('a 60 Hz equivale a la velocidad en píxeles por fotograma de antes (px/s = px/fotograma × 60)', () => {
    expect(avanzar(0, 2.4 * 60, 1000 / 60)).toBeCloseTo(2.4, 5)
  })
  it('un salto de tiempo grande (pestaña en segundo plano, tirón) no teletransporta la palabra', () => {
    expect(avanzar(0, 100, 5000)).toBeCloseTo(100 * DT_MAX_MS / 1000, 5)
    expect(DT_MAX_MS).toBeLessThanOrEqual(50)
  })
  it('un dt negativo o NaN no la mueve hacia atrás', () => {
    expect(avanzar(10, 100, -5)).toBe(10)
    expect(avanzar(10, 100, NaN)).toBe(10)
  })
})

describe('balanceo: vaivén lateral con una inclinación mínima (las palabras no giran)', () => {
  it('sin amplitud no hay desplazamiento ni inclinación', () => {
    expect(balanceo(1.7, 0, 0)).toEqual({ dx: 0, rot: 0 })
  })
  it('nunca pasa de la amplitud ni de la inclinación máxima, en ninguna fase', () => {
    for (let f = 0; f < 6.3; f += 0.1) {
      const b = balanceo(f, 12, 3)
      expect(Math.abs(b.dx)).toBeLessThanOrEqual(12 + 1e-9)
      expect(Math.abs(b.rot)).toBeLessThanOrEqual(3 + 1e-9)
    }
  })
  it('es continuo: dos fases cercanas dan casi lo mismo (sin saltos)', () => {
    const a = balanceo(1, 12, 3), b = balanceo(1.02, 12, 3)
    expect(Math.abs(a.dx - b.dx)).toBeLessThan(0.5)
  })
})

describe('entrada: aparece de a poco al cruzar el borde de arriba', () => {
  it('arriba de todo es invisible y chica; ya adentro, plena', () => {
    expect(entrada(-60)).toEqual({ opacidad: 0, escala: 0.85 })
    expect(entrada(30)).toEqual({ opacidad: 1, escala: 1 })
    expect(entrada(500)).toEqual({ opacidad: 1, escala: 1 })
  })
  it('crece sin retrocesos entre medio', () => {
    let ant = entrada(-40)
    for (let y = -39; y <= 30; y++) {
      const e = entrada(y)
      expect(e.opacidad).toBeGreaterThanOrEqual(ant.opacidad)
      expect(e.escala).toBeGreaterThanOrEqual(ant.escala)
      ant = e
    }
  })
})

describe('aplicarPosicion / alturaDe', () => {
  it('escribe las variables CSS de la transformación y recuerda la altura', () => {
    const el = document.createElement('div')
    aplicarPosicion(el, { x: 4, y: 120, rot: 2, escala: 0.9 })
    expect(el.style.getPropertyValue('--x')).toBe('4px')
    expect(el.style.getPropertyValue('--y')).toBe('120px')
    expect(el.style.getPropertyValue('--r')).toBe('2deg')
    expect(el.style.getPropertyValue('--s')).toBe('0.9')
    expect(alturaDe(el)).toBe(120)
  })
  it('sin x, rot ni escala usa 0, 0° y 1', () => {
    const el = document.createElement('div')
    aplicarPosicion(el, { y: 5 })
    expect([el.style.getPropertyValue('--x'), el.style.getPropertyValue('--r'), el.style.getPropertyValue('--s')]).toEqual(['0px', '0deg', '1'])
  })
  it('un elemento nunca posicionado está en la altura 0', () => {
    expect(alturaDe(document.createElement('div'))).toBe(0)
  })
})

describe('chispas del acierto', () => {
  it('cantidadChispas crece con el combo y tiene tope', () => {
    expect(cantidadChispas(0)).toBe(6)
    expect(cantidadChispas(1)).toBeGreaterThan(cantidadChispas(0))
    expect(cantidadChispas(5)).toBeGreaterThan(cantidadChispas(3))
    expect(cantidadChispas(99)).toBeLessThanOrEqual(16)
  })
  it('crea las chispas con su dirección, y se retiran solas', () => {
    vi.useFakeTimers()
    lanzarChispas(cont, 50, 60, 8, '#ffb347')
    const cs = [...cont.querySelectorAll<HTMLElement>('.chispa')]
    expect(cs.length).toBe(8)
    for (const c of cs) {
      expect(c.style.getPropertyValue('--dx')).toMatch(/px$/)
      expect(c.style.getPropertyValue('--dy')).toMatch(/px$/)
      expect(c.style.left).toBe('50px')
    }
    vi.advanceTimersByTime(2000)
    expect(cont.querySelectorAll('.chispa').length).toBe(0)
  })
  it('no pasa de 16 piezas aunque se pidan más', () => {
    lanzarChispas(cont, 0, 0, 500, '#fff')
    expect(cont.querySelectorAll('.chispa').length).toBe(16)
  })
  it('con «reducir movimiento» (Ajustes o sistema) no hay chispas (Review Focus 4)', () => {
    cambiarAjustes({ reducirMovimiento: true })
    lanzarChispas(cont, 0, 0, 8, '#fff')
    expect(cont.children.length).toBe(0)
    cambiarAjustes({ reducirMovimiento: false })
    ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true, addEventListener() {} })
    lanzarChispas(cont, 0, 0, 8, '#fff')
    expect(cont.children.length).toBe(0)
  })
})

describe('chapuzón al caer en la laguna', () => {
  it('crea una onda en el punto y se retira sola', () => {
    vi.useFakeTimers()
    lanzarChapuzon(cont, 70, 300)
    const o = cont.querySelector<HTMLElement>('.onda-chapuzon')!
    expect(o).not.toBeNull()
    expect(o.style.left).toBe('70px')
    expect(o.style.top).toBe('300px')
    vi.advanceTimersByTime(2000)
    expect(cont.querySelector('.onda-chapuzon')).toBeNull()
  })
  it('con «reducir movimiento» no hay onda', () => {
    cambiarAjustes({ reducirMovimiento: true })
    lanzarChapuzon(cont, 0, 0)
    expect(cont.children.length).toBe(0)
  })
})

describe('el motor usa el movimiento nuevo', () => {
  it('WordPhysics: por tiempo y con transform, sin top ni velocidad por fotograma', () => {
    const f = leer('src/game/WordPhysics.ts')
    expect(f).toContain('avanzar(')
    expect(f).toContain('aplicarPosicion(')
    expect(f).not.toMatch(/style\.top/)
    expect(f).not.toMatch(/y \+= speed/)
    expect(f).not.toContain('rotate(')   // la inclinación va en la transformación CSS, ±3° como máximo
  })
  it('WordSpawner ordena por alturaDe (el teclado recorre de la más baja a la más alta)', () => {
    const f = leer('src/game/WordSpawner.ts')
    expect(f).toContain('alturaDe(')
    expect(f).not.toMatch(/style\.top/)
  })
  it('GameEngine lanza chispas al acertar según el combo', () => {
    const f = leer('src/game/GameEngine.ts')
    expect(f).toContain('lanzarChispas(')
    expect(f).toContain('cantidadChispas(')
  })
  it('el menú de inicio usa el mismo movimiento que la partida', () => {
    const f = leer('src/ui/DecoBackground.ts')
    expect(f).toContain('avanzar(')
    expect(f).toContain('aplicarPosicion(')
    expect(f).toContain('balanceo(')
    expect(f).toContain('lanzarChapuzon(')
    expect(f).not.toMatch(/style\.top\s*=/)
  })
})

describe('estilos de la caída', () => {
  const todo = ['screens', 'animations', 'componentes', 'ajustes', 'a11y'].map(f => leer(`src/styles/${f}.css`)).join('\n')
  const bloque = (n: string): string => {
    const i = todo.indexOf(`@keyframes ${n}`)
    const j = todo.indexOf('@keyframes', i + 1)
    return i === -1 ? '' : todo.slice(i, j === -1 ? undefined : j)
  }
  const TRANSFORM = 'translate3d(var(--x,0px),var(--y,0px),0)'

  it('la palabra se coloca con las variables (top 0 y transform), no con top', () => {
    expect(todo).toMatch(/\.palabra\{[^}]*top:\s*0/)
    expect(todo).toContain(TRANSFORM + ' rotate(var(--r,0deg)) scale(var(--s,1))')
  })
  it('acierto y error parten de la posición actual (sin saltar al origen) y el error tiembla', () => {
    expect(bloque('hitOk')).toContain('translate3d(var(--x,0px),')
    expect(bloque('hitMal')).toContain('translate3d(calc(var(--x,0px) + ')
  })
  it('el error no infla la palabra más de un 5 %', () => {
    const escalas = [...bloque('hitMal').matchAll(/scale\(([\d.]+)\)/g)].map(m => Number(m[1]))
    expect(Math.max(...escalas)).toBeLessThanOrEqual(1.05)
  })
  it('existen las chispas, la onda del chapuzón y el hundimiento', () => {
    expect(todo).toContain('@keyframes chispa')
    expect(todo).toContain('@keyframes ondaChapuzon')
    expect(todo).toMatch(/\.palabra\.se-hunde[^{]*\{[^}]*animation:/)
  })
  it('chispas y onda se ocultan con menos movimiento (sistema y Ajustes)', () => {
    expect(todo).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.chispa/)
    expect(todo).toMatch(/html\[data-movimiento="reducido"\] \.chispa[^{]*\{[^}]*display:\s*none/)
  })
  it('las palabras decorativas del menú se mueven con el mismo transform', () => {
    expect(todo).toMatch(/\.deco-palabra\{[^}]*top:\s*0/)
    expect(todo).toMatch(/\.deco-palabra\{[^}]*transform:\s*translate3d\(var\(--x,0px\),var\(--y,0px\),0\)/)
  })
})
