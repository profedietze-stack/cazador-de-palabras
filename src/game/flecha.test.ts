// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { cambiarAjustes, restablecerAjustes } from '../storage/ajustes'
import { planearFlecha, lanzarFlecha, MS_VUELO_MIN, MS_VUELO_MAX, MAX_ANGULO } from './flecha'

const caja = { x: 200, y: 100, w: 120, h: 40 }

function azarFijo(...v: number[]): () => number {
  let i = 0
  return () => v[i++ % v.length]!
}

describe('planearFlecha', () => {
  it('sale de abajo del área y llega dentro de la palabra', () => {
    for (let i = 0; i < 200; i++) {
      const p = planearFlecha(400, 500, caja)
      expect(p.oy).toBeGreaterThan(500)
      expect(p.tx).toBeGreaterThanOrEqual(caja.x)
      expect(p.tx).toBeLessThanOrEqual(caja.x + caja.w)
      expect(p.ty).toBeGreaterThanOrEqual(caja.y)
      expect(p.ty).toBeLessThanOrEqual(caja.y + caja.h)
    }
  })

  it('apunta hacia el lado de la palabra: a la derecha, ángulo positivo', () => {
    const der = planearFlecha(400, 500, { x: 300, y: 100, w: 80, h: 40 }, azarFijo(0.5))
    const izq = planearFlecha(400, 500, { x: 10, y: 100, w: 80, h: 40 }, azarFijo(0.5))
    expect(der.angulo).toBeGreaterThan(0)
    expect(izq.angulo).toBeLessThan(0)
  })

  it('el ángulo coincide con la dirección real del vuelo', () => {
    const p = planearFlecha(400, 500, caja)
    const esperado = Math.atan2(p.tx - p.ox, p.oy - p.ty) * 180 / Math.PI
    expect(p.angulo).toBeCloseTo(esperado, 6)
  })

  it('no clava todas igual: el ángulo cambia según el azar y se mantiene ligero', () => {
    const angulos = new Set<number>()
    for (let i = 0; i < 50; i++) {
      const p = planearFlecha(400, 500, caja)
      angulos.add(Math.round(p.angulo * 10))
      expect(Math.abs(p.ladeo)).toBeLessThanOrEqual(4)
      expect(Math.abs(p.angulo)).toBeLessThanOrEqual(MAX_ANGULO + 1e-9)
    }
    expect(angulos.size).toBeGreaterThan(10)
  })

  it('el vuelo dura entre el mínimo y el máximo, más cuanto más lejos', () => {
    const cerca = planearFlecha(400, 500, { x: 150, y: 420, w: 100, h: 40 }, azarFijo(0.5))
    const lejos = planearFlecha(400, 500, { x: 150, y: 0, w: 100, h: 40 }, azarFijo(0.5))
    for (const p of [cerca, lejos]) {
      expect(p.ms).toBeGreaterThanOrEqual(MS_VUELO_MIN)
      expect(p.ms).toBeLessThanOrEqual(MS_VUELO_MAX)
    }
    expect(lejos.ms).toBeGreaterThanOrEqual(cerca.ms)
  })

  it('es determinista con el mismo azar', () => {
    const a = planearFlecha(400, 500, caja, azarFijo(0.1, 0.9, 0.3, 0.7))
    const b = planearFlecha(400, 500, caja, azarFijo(0.1, 0.9, 0.3, 0.7))
    expect(a).toEqual(b)
  })

  it('una palabra baja y de costado se alcanza casi derecho, no de lado', () => {
    for (let i = 0; i < 100; i++) {
      const p = planearFlecha(900, 600, { x: 20, y: 560, w: 100, h: 40 })
      expect(Math.abs(p.angulo)).toBeLessThanOrEqual(MAX_ANGULO + 1e-9)
    }
  })

  it('el punto de salida no se va lejos de los bordes del área', () => {
    for (let i = 0; i < 100; i++) {
      const p = planearFlecha(300, 400, { x: i * 3, y: 50, w: 60, h: 30 })
      expect(p.ox).toBeGreaterThanOrEqual(-20)
      expect(p.ox).toBeLessThanOrEqual(320)
    }
  })
})

describe('lanzarFlecha', () => {
  let area: HTMLElement
  let palabra: HTMLElement

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = '<div id="gameArea"></div>'
    area = document.getElementById('gameArea')!
    palabra = document.createElement('div')
    palabra.className = 'palabra'
    palabra.textContent = 'casa'
    area.appendChild(palabra)
    Object.defineProperty(area, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(area, 'clientHeight', { value: 500, configurable: true })
    palabra.getBoundingClientRect = () => ({ left: 150, top: 120, width: 100, height: 40, right: 250, bottom: 160, x: 150, y: 120, toJSON() {} }) as DOMRect
  })
  afterEach(() => { restablecerAjustes(); vi.restoreAllMocks(); delete (HTMLElement.prototype as any).animate })

  it('cuelga la flecha de la palabra, sin texto y oculta a los lectores de pantalla', () => {
    lanzarFlecha(palabra, area, true)
    const f = palabra.querySelector('.flecha')!
    expect(f).not.toBeNull()
    expect(f.getAttribute('aria-hidden')).toBe('true')
    expect(f.textContent).toBe('')
    expect(palabra.textContent).toBe('casa')
  })

  it('sin animaciones en el navegador queda clavada de una vez (devuelve 0)', () => {
    expect(lanzarFlecha(palabra, area, true)).toBe(0)
    expect((palabra.querySelector('.flecha') as HTMLElement).style.transform).toContain('rotate(')
  })

  it('con animaciones vuela, devuelve el tiempo de vuelo y anima el acierto sin desvanecerse', () => {
    const animate = vi.fn()
    ;(HTMLElement.prototype as any).animate = animate
    const ms = lanzarFlecha(palabra, area, true)
    expect(ms).toBeGreaterThanOrEqual(MS_VUELO_MIN)
    expect(ms).toBeLessThanOrEqual(MS_VUELO_MAX)
    const [frames, opts] = animate.mock.calls[0]!
    expect(opts.duration).toBeGreaterThan(ms)
    expect(frames[0].transform).toContain('translate(')
    // acierto: termina visible
    expect(frames[frames.length - 1].opacity).toBe(1)
  })

  it('un error rebota y cae: termina transparente y torcida', () => {
    const animate = vi.fn()
    ;(HTMLElement.prototype as any).animate = animate
    lanzarFlecha(palabra, area, false)
    const frames = animate.mock.calls[0]![0] as Keyframe[]
    expect(frames[frames.length - 1]!.opacity).toBe(0)
    expect(frames.length).toBeGreaterThanOrEqual(4)
  })

  it('con «reducir movimiento» no vuela', () => {
    cambiarAjustes({ reducirMovimiento: true })
    const animate = vi.fn()
    ;(HTMLElement.prototype as any).animate = animate
    expect(lanzarFlecha(palabra, area, true)).toBe(0)
    expect(animate).not.toHaveBeenCalled()
  })
})

describe('la flecha en el juego', () => {
  const motor = readFileSync('src/game/GameEngine.ts', 'utf8')

  it('cazarPalabra lanza la flecha y retrasa el sonido y los efectos del impacto, no el puntaje', () => {
    expect(motor).toContain('lanzarFlecha(el, area, esOk)')
    expect(motor).toContain('sonidoLanzar()')
    expect(motor).toContain('sonidoClavar()')
    expect(motor).toContain('sonidoRebote()')
    // el puntaje se suma antes de cualquier espera
    const i = motor.indexOf('G.pts += pts')
    const j = motor.indexOf('alImpactar(() => {', motor.indexOf('const alImpactar'))
    expect(i).toBeGreaterThan(0)
    expect(i).toBeLessThan(j)
  })

  it('los sonidos nuevos respetan el volumen de efectos', () => {
    const a = readFileSync('src/audio/AudioEngine.ts', 'utf8')
    for (const f of ['function ruido(', 'function barrido(']) {
      const cuerpo = a.slice(a.indexOf(f), a.indexOf(f) + 400)
      expect(cuerpo).toContain("ganancia(ajustes(), 'efectos')")
    }
  })
})
