// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  proporcionesLaterales, ladosDelNivel, elegirLado, planEntradaLateral, avanceDeEntrada, desfaseEn,
  factorCaidaLateral, ESPACIO_LATERAL_MS, DURACION_ENTRADA_S, FACTOR_VELOCIDAD_LATERAL, type Lado,
} from './entradas'
import { G } from './state'
import { animarCaida } from './WordPhysics'
import { cambiarAjustes, restablecerAjustes } from '../storage/ajustes'
import { textoLados } from '../screens/PreLevelScreen'

/** Reparte `n` palabras con el azar parejo y devuelve cuántas entraron por cada lado. */
function repartir(nivel: number, practica: boolean, n = 1000): Record<Lado, number> {
  const c: Record<Lado, number> = { arriba: 0, derecha: 0, izquierda: 0 }
  for (let i = 0; i < n; i++) c[elegirLado(nivel, practica, (i + 0.5) / n, 1e9 + i * 1e5, {})]++
  return c
}

describe('qué lados trae cada nivel', () => {
  it('nivel 1: solo arriba; nivel 2: arriba y derecha; nivel 3: los tres', () => {
    expect(ladosDelNivel(1)).toEqual(['arriba'])
    expect(ladosDelNivel(2)).toEqual(['arriba', 'derecha'])
    expect(ladosDelNivel(3)).toEqual(['arriba', 'derecha', 'izquierda'])
  })
  it('la práctica siempre cae desde arriba', () => {
    for (const n of [1, 2, 3]) expect(ladosDelNivel(n, true)).toEqual(['arriba'])
    expect(repartir(3, true)).toEqual({ arriba: 1000, derecha: 0, izquierda: 0 })
  })
  it('un nivel desconocido no inventa lados', () => {
    expect(proporcionesLaterales(7, false)).toEqual({ derecha: 0, izquierda: 0 })
    expect(proporcionesLaterales(0, false)).toEqual({ derecha: 0, izquierda: 0 })
  })
})

describe('elegirLado: proporciones', () => {
  it('nivel 1: ninguna lateral', () => {
    expect(repartir(1, false)).toEqual({ arriba: 1000, derecha: 0, izquierda: 0 })
  })
  it('nivel 2: un 25 % por la derecha, nada por la izquierda', () => {
    const c = repartir(2, false)
    expect(c.derecha).toBe(250)
    expect(c.izquierda).toBe(0)
    expect(c.arriba).toBe(750)
  })
  it('nivel 3: un 20 % por cada costado (40 % lateral)', () => {
    const c = repartir(3, false)
    expect(c.derecha).toBe(200)
    expect(c.izquierda).toBe(200)
    expect(c.arriba).toBe(600)
  })
})

describe('elegirLado: no se juntan dos por el mismo costado', () => {
  it('nivel 2 (solo derecha): si acaba de entrar una, la siguiente cae desde arriba', () => {
    expect(elegirLado(2, false, 0.1, 1000, { derecha: 1000 - (ESPACIO_LATERAL_MS - 100) })).toBe('arriba')
  })
  it('pasado el espacio, puede volver a entrar por el mismo costado', () => {
    expect(elegirLado(2, false, 0.1, 10000, { derecha: 10000 - ESPACIO_LATERAL_MS })).toBe('derecha')
  })
  it('nivel 3: si el costado que tocaba está ocupado entra por el otro', () => {
    expect(elegirLado(3, false, 0.1, 1000, { derecha: 900 })).toBe('izquierda')
    expect(elegirLado(3, false, 0.3, 1000, { izquierda: 900 })).toBe('derecha')
  })
  it('nivel 3: con los dos ocupados cae desde arriba', () => {
    expect(elegirLado(3, false, 0.1, 1000, { derecha: 900, izquierda: 950 })).toBe('arriba')
  })
  it('el nivel 2 nunca manda una por la izquierda, ni siquiera de reemplazo', () => {
    for (let i = 0; i < 100; i++) expect(elegirLado(2, false, i / 100, 1000, { derecha: 900 })).not.toBe('izquierda')
  })
})

describe('planEntradaLateral', () => {
  it('entra desde afuera y termina en la mitad de su lado, sin salirse de la pantalla', () => {
    for (let i = 0; i < 200; i++) {
      const der = planEntradaLateral('derecha', 900, 600, 120)
      expect(der.left).toBeGreaterThanOrEqual(900 * 0.5 - 120)
      expect(der.left + 120).toBeLessThanOrEqual(900 - 10 + 1e-9)
      expect(der.left + der.desfase).toBeGreaterThanOrEqual(900)   // empieza afuera, a la derecha
      const izq = planEntradaLateral('izquierda', 900, 600, 120)
      expect(izq.left).toBeGreaterThanOrEqual(10 - 1e-9)
      expect(izq.left).toBeLessThanOrEqual(900 * 0.5)
      expect(izq.left + izq.desfase + 120).toBeLessThanOrEqual(0)  // empieza afuera, a la izquierda
    }
  })
  it('entra a media altura, no pegada arriba ni abajo', () => {
    for (let i = 0; i < 100; i++) {
      const p = planEntradaLateral('derecha', 900, 600, 120)
      expect(p.y0).toBeGreaterThanOrEqual(600 * 0.08 - 1e-9)
      expect(p.y0).toBeLessThanOrEqual(600 * 0.3 + 1e-9)
    }
  })
  it('en un celular angosto una palabra larga entra entera', () => {
    const p = planEntradaLateral('derecha', 360, 560, 300)
    expect(p.left).toBeGreaterThanOrEqual(10 - 1e-9)
    expect(p.left + 300).toBeLessThanOrEqual(360 - 10 + 1e-9)
  })
  it('una palabra más ancha que la pantalla no da valores absurdos', () => {
    const p = planEntradaLateral('izquierda', 200, 400, 500)
    expect(Number.isFinite(p.left)).toBe(true)
    expect(Number.isFinite(p.desfase)).toBe(true)
  })
})

describe('la curva', () => {
  it('el corrimiento va de entero a cero y no se pasa', () => {
    expect(desfaseEn(400, 0)).toBe(400)
    expect(desfaseEn(400, DURACION_ENTRADA_S)).toBeCloseTo(0, 6)
    expect(desfaseEn(400, 99)).toBeCloseTo(0, 6)
    expect(desfaseEn(-400, 99)).toBeCloseTo(0, 6)
    let antes = Infinity
    for (let t = 0; t <= DURACION_ENTRADA_S; t += 0.1) {
      const d = desfaseEn(400, t)
      expect(d).toBeLessThanOrEqual(antes + 1e-9)
      antes = d
    }
  })
  it('entra rápido y frena: la velocidad horizontal baja', () => {
    const v = (t: number): number => (desfaseEn(400, t) - desfaseEn(400, t + 0.1)) / 0.1
    expect(v(0)).toBeGreaterThan(v(1))
    expect(v(1)).toBeGreaterThan(v(2))
  })
  it('la caída arranca lenta y llega a la de las laterales (80 % de la normal)', () => {
    expect(factorCaidaLateral(0)).toBeLessThan(factorCaidaLateral(1))
    expect(factorCaidaLateral(99)).toBeCloseTo(FACTOR_VELOCIDAD_LATERAL, 6)
    expect(FACTOR_VELOCIDAD_LATERAL).toBeLessThan(1)
    expect(avanceDeEntrada(-5)).toBe(0)
  })
})

describe('animarCaida con entrada lateral', () => {
  let cola: Array<(t: number) => void>
  let ahora: number
  let area: HTMLElement
  let palabra: HTMLElement

  const cuadros = (n: number): void => {
    for (let i = 0; i < n; i++) { const f = cola.shift(); ahora += 16; f?.(ahora) }
  }
  const v = (nombre: string): number => parseFloat(palabra.style.getPropertyValue(nombre))

  beforeEach(() => {
    localStorage.clear()
    restablecerAjustes()
    ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener() {} })
    document.body.innerHTML = '<div id="gameScreen"><div id="gameArea"></div></div>'
    area = document.getElementById('gameArea')!
    Object.defineProperty(area, 'clientHeight', { get: () => 600, configurable: true })
    Object.defineProperty(area, 'clientWidth', { get: () => 900, configurable: true })
    cola = []; ahora = 0
    vi.stubGlobal('requestAnimationFrame', (fn: (t: number) => void) => { cola.push(fn); return cola.length })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    G.activo = true; G.pausado = false; G.velocidadBase = 1
    palabra = document.createElement('div')
    palabra.className = 'palabra'
    area.appendChild(palabra)
  })
  afterEach(() => { restablecerAjustes(); vi.restoreAllMocks(); vi.unstubAllGlobals(); G.activo = false })

  it('empieza afuera de la pantalla, a media altura, y se acomoda curvándose hacia abajo', () => {
    const plan = planEntradaLateral('derecha', 900, 600, 120, 0.5, 0.5)
    animarCaida(palabra, 24, plan)
    expect(v('--x')).toBeGreaterThan(300)          // todavía afuera
    expect(v('--y')).toBeCloseTo(plan.y0, 0)
    cuadros(2)
    const x1 = v('--x'), y1 = v('--y')
    cuadros(60)                                    // ~1 s
    const x2 = v('--x'), y2 = v('--y')
    cuadros(60)
    const x3 = v('--x'), y3 = v('--y')
    expect(x1).toBeGreaterThan(x2); expect(x2).toBeGreaterThan(x3)      // avanza hacia adentro
    expect(y1).toBeLessThan(y2); expect(y2).toBeLessThan(y3)            // y baja siempre
    // curva: cada segundo avanza menos de lado y más hacia abajo
    expect(x1 - x2).toBeGreaterThan(x2 - x3)
    expect(y3 - y2).toBeGreaterThan(y2 - y1)
  })

  it('por la izquierda entra desde el otro lado', () => {
    animarCaida(palabra, 24, planEntradaLateral('izquierda', 900, 600, 120, 0.5, 0.5))
    expect(v('--x')).toBeLessThan(-300)
    cuadros(200)
    expect(Math.abs(v('--x'))).toBeLessThan(25)    // ya en su lugar (queda el balanceo)
  })

  it('con «reducir movimiento» no se desliza: aparece en su lugar y cae derecha', () => {
    cambiarAjustes({ reducirMovimiento: true })
    animarCaida(palabra, 24, planEntradaLateral('derecha', 900, 600, 120, 0.5, 0.5))
    expect(v('--x')).toBe(0)
    cuadros(30)
    expect(v('--x')).toBe(0)
    expect(v('--y')).toBeGreaterThan(0)
  })

  it('sin entrada lateral cae como siempre: desde arriba del área', () => {
    animarCaida(palabra, 24)
    expect(v('--y')).toBeLessThan(0)
  })
})

describe('el aviso de la pantalla previa y el juego', () => {
  it('nivel 1 no avisa; 2 dice derecha; 3 dice derecha e izquierda', () => {
    expect(textoLados(1)).toBe('')
    expect(textoLados(2)).toContain('por la derecha')
    expect(textoLados(2)).not.toContain('izquierda')
    expect(textoLados(3)).toContain('por la derecha y por la izquierda')
    expect(textoLados(3)).toContain('práctica')
  })
  it('el spawner elige el lado con el nivel y la práctica, y la pantalla previa tiene su línea', () => {
    const sp = readFileSync('src/game/WordSpawner.ts', 'utf8')
    expect(sp).toContain('elegirLado(G.nivel, G.practica')
    expect(sp).toContain('animarCaida(el, size, lateral)')
    expect(readFileSync('index.html', 'utf8')).toContain('id="avisoLados"')
  })
})
