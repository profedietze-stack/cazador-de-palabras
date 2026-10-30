// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { actualizarFondo, mundoDePantalla } from './fondoMundo'
import { cambiarAjustes, restablecerAjustes } from '../storage/ajustes'
import { aplicarAjustes } from './aplicarAjustes'
import { G } from '../game/state'

let pantalla: HTMLElement

beforeEach(() => {
  localStorage.clear()
  restablecerAjustes()
  aplicarAjustes()
  G.cat = null
  document.body.innerHTML = '<div id="menuPrincipal" class="screen active"><div class="fondo-mundo"></div></div>'
  pantalla = document.getElementById('menuPrincipal')!
  document.documentElement.removeAttribute('style')
})

describe('el fondo de cada pantalla', () => {
  it('monta el paisaje del mundo de inicio en el menú y fija sus variables', () => {
    actualizarFondo(pantalla)
    const f = pantalla.querySelector<HTMLElement>('.fondo-mundo')!
    expect(f.dataset['mundo']).toBe('inicio')
    expect(f.querySelectorAll('.pa-colina').length).toBe(3)
    expect(document.documentElement.style.getPropertyValue('--cielo-alto')).not.toBe('')
  })

  it('las pantallas de una categoría usan el mundo de G.cat; el menú, el de inicio', () => {
    G.cat = 'verbos'
    expect(mundoDePantalla('preNivel').id).toBe('verbos')
    expect(mundoDePantalla('gameScreen').id).toBe('verbos')
    expect(mundoDePantalla('resultadoScreen').id).toBe('verbos')
    expect(mundoDePantalla('menuPrincipal').id).toBe('inicio')
    expect(mundoDePantalla('seleccionCategoria').id).toBe('inicio')
  })

  it('con el fondo apagado el paisaje queda quieto, no liso (Review Focus 4)', () => {
    cambiarAjustes({ fondoDecorativo: false })
    actualizarFondo(pantalla)
    const capas = [...pantalla.querySelectorAll('.pa-colina')]
    expect(capas.length).toBe(3)
    expect(capas.every(c => c.classList.contains('quieto'))).toBe(true)
    expect(pantalla.querySelectorAll('.pa-luci').length).toBe(0)
  })

  it('con «reducir movimiento» queda quieto y sin luciérnagas', () => {
    cambiarAjustes({ reducirMovimiento: true })
    actualizarFondo(pantalla)
    expect([...pantalla.querySelectorAll('.pa-colina')].every(c => c.classList.contains('quieto'))).toBe(true)
    expect(pantalla.querySelectorAll('.pa-luci').length).toBe(0)
  })

  it('con alto contraste no hay paisaje: fondo liso', () => {
    cambiarAjustes({ altoContraste: true })
    actualizarFondo(pantalla)
    const f = pantalla.querySelector<HTMLElement>('.fondo-mundo')!
    expect(f.children.length).toBe(0)
    expect(f.classList.contains('liso')).toBe(true)
  })

  it('una pantalla sin .fondo-mundo no se toca y no falla', () => {
    document.body.innerHTML = '<div id="infoScreen" class="screen"></div>'
    expect(() => actualizarFondo(document.getElementById('infoScreen')!)).not.toThrow()
  })

  it('al pasar a otra pantalla se desmonta el paisaje de la anterior', () => {
    document.body.innerHTML = '<div id="menuPrincipal" class="screen"><div class="fondo-mundo"></div></div><div id="preNivel" class="screen"><div class="fondo-mundo"></div></div>'
    const a = document.getElementById('menuPrincipal')!, b = document.getElementById('preNivel')!
    actualizarFondo(a)
    actualizarFondo(b)
    expect(a.querySelectorAll('.pa-colina').length).toBe(0)
    expect(b.querySelectorAll('.pa-colina').length).toBe(3)
  })
})
