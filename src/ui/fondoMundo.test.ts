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

/** Una pantalla de partida: usa el mundo de G.cat. */
function enPartida(): HTMLElement {
  document.body.innerHTML = '<div id="preNivel" class="screen active"><div class="fondo-mundo"></div></div>'
  return document.getElementById('preNivel')!
}

describe('el fondo de cada pantalla', () => {
  it('monta la escena del campamento en el menú y fija sus variables', () => {
    actualizarFondo(pantalla)
    const f = pantalla.querySelector<HTMLElement>('.fondo-mundo')!
    expect(f.dataset['mundo']).toBe('inicio')
    expect(f.dataset['escena']).toBe('campamento')
    expect(f.querySelectorAll('svg').length).toBe(3)   // el fondo ancho y un borde a cada lado
    expect(f.querySelectorAll('.pa-colina').length).toBe(0)
    expect(document.documentElement.style.getPropertyValue('--cielo-alto')).not.toBe('')
  })

  it('las pantallas de una categoría usan el mundo de G.cat; el menú, el de inicio', () => {
    G.cat = 'articulos'
    expect(mundoDePantalla('preNivel').id).toBe('articulos')
    expect(mundoDePantalla('gameScreen').id).toBe('articulos')
    expect(mundoDePantalla('resultadoScreen').id).toBe('articulos')
    expect(mundoDePantalla('menuPrincipal').id).toBe('inicio')
    expect(mundoDePantalla('seleccionCategoria').id).toBe('inicio')
  })

  it('con el fondo apagado el paisaje queda quieto, no liso (Review Focus 4)', () => {
    cambiarAjustes({ fondoDecorativo: false })
    G.cat = 'articulos'
    pantalla = enPartida()
    actualizarFondo(pantalla)
    const capas = [...pantalla.querySelectorAll('.pa-colina')]
    expect(capas.length).toBe(3)
    expect(capas.every(c => c.classList.contains('quieto'))).toBe(true)
    expect(pantalla.querySelectorAll('.pa-luci').length).toBe(0)
  })

  it('con «reducir movimiento» queda quieto y sin luciérnagas', () => {
    cambiarAjustes({ reducirMovimiento: true })
    G.cat = 'articulos'
    pantalla = enPartida()
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
    G.cat = 'articulos'
    actualizarFondo(a)
    expect(a.querySelectorAll('svg').length).toBe(3)
    actualizarFondo(b)
    expect(a.querySelector('.fondo-mundo')!.children.length).toBe(0)
    expect(b.querySelectorAll('.pa-colina').length).toBe(3)
  })
})

describe('la hora del día de cada pantalla', () => {
  it('en una partida la fija el nivel: 1 amanecer, 2 día, 3 noche', async () => {
    const { horaDePantalla } = await import('./fondoMundo')
    G.cat = 'sustantivos'
    for (const [nivel, hora] of [[1, 'amanecer'], [2, 'dia'], [3, 'noche']] as const) {
      G.nivel = nivel
      for (const id of ['preNivel', 'gameScreen', 'resultadoScreen']) expect(horaDePantalla(id), `${id} nivel ${nivel}`).toBe(hora)
    }
  })
  it('fuera de una partida sigue el tema: oscuro = noche, claro = día', async () => {
    const { horaDePantalla } = await import('./fondoMundo')
    G.nivel = 2
    expect(horaDePantalla('menuPrincipal')).toBe('noche')
    cambiarAjustes({ tema: 'claro' })
    aplicarAjustes()
    expect(horaDePantalla('menuPrincipal')).toBe('dia')
    expect(horaDePantalla('seleccionCategoria')).toBe('dia')
  })
  it('el bosque del nivel 3 se monta de noche aunque el tema sea claro', () => {
    cambiarAjustes({ tema: 'claro' })
    aplicarAjustes()
    G.cat = 'sustantivos'
    G.nivel = 3
    const p = enPartida()
    actualizarFondo(p)
    const f = p.querySelector<HTMLElement>('.fondo-mundo')!
    expect([f.dataset['escena'], f.dataset['hora']]).toEqual(['bosque', 'noche'])
    G.nivel = 1
  })
})
