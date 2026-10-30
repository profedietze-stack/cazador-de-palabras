// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { lanzarConfeti, cantidadConfeti } from './confeti'
import { cambiarAjustes, restablecerAjustes } from '../storage/ajustes'

let cont: HTMLElement

beforeEach(() => {
  localStorage.clear()
  restablecerAjustes()
  document.body.innerHTML = '<div id="confeti"></div>'
  cont = document.getElementById('confeti')!
  ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener() {} })
})
afterEach(() => { vi.useRealTimers() })

describe('cantidadConfeti: la celebración es proporcional al resultado', () => {
  it('sin medalla no hay confeti y crece de bronce a oro', () => {
    expect(cantidadConfeti(null)).toBe(0)
    expect(cantidadConfeti('BRONCE')).toBe(10)
    expect(cantidadConfeti('PLATA')).toBe(18)
    expect(cantidadConfeti('ORO')).toBe(28)
  })
})

describe('lanzarConfeti', () => {
  it('crea tantas piezas como se pidan y cancelar las quita', () => {
    const cancelar = lanzarConfeti(cont, 12)
    expect(cont.querySelectorAll('.conf').length).toBe(12)
    cancelar()
    expect(cont.querySelectorAll('.conf').length).toBe(0)
  })

  it('con cantidad 0 no agrega nada', () => {
    lanzarConfeti(cont, 0)
    expect(cont.children.length).toBe(0)
  })

  it('lanzar de nuevo no acumula las piezas de la vez anterior', () => {
    lanzarConfeti(cont, 5)
    lanzarConfeti(cont, 7)
    expect(cont.querySelectorAll('.conf').length).toBe(7)
  })

  it('con «reducir movimiento» de Ajustes no hay confeti, y cancelar no falla (Review Focus 4)', () => {
    cambiarAjustes({ reducirMovimiento: true })
    const cancelar = lanzarConfeti(cont, 28)
    expect(cont.children.length).toBe(0)
    expect(() => cancelar()).not.toThrow()
  })

  it('con «reducir movimiento» del sistema tampoco', () => {
    ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true, addEventListener() {} })
    lanzarConfeti(cont, 28)
    expect(cont.children.length).toBe(0)
  })

  it('es discreto: las piezas se retiran solas a los pocos segundos', () => {
    vi.useFakeTimers()
    lanzarConfeti(cont, 10)
    expect(cont.querySelectorAll('.conf').length).toBe(10)
    vi.advanceTimersByTime(8000)
    expect(cont.querySelectorAll('.conf').length).toBe(0)
  })

  it('las piezas son decorativas: el contenedor las oculta a los lectores de pantalla', () => {
    lanzarConfeti(cont, 3)
    expect(cont.getAttribute('aria-hidden')).toBe('true')
  })
})
