// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { montarPaisaje, opcionesDesdeAjustes, iniciarPausaPorVisibilidad, type OpcionesPaisaje } from './paisaje'
import { aplicarMundo } from './aplicarMundo'
import { MUNDOS } from '../data/mundos'
import { AJUSTES_DE_FABRICA as F } from '../storage/ajustes'

let el: HTMLElement
const op = (o: Partial<OpcionesPaisaje> = {}): OpcionesPaisaje => ({ animado: true, particulas: true, cielo: 'noche', ...o })

beforeEach(() => {
  document.body.innerHTML = '<div id="fondo"></div>'
  el = document.getElementById('fondo')!
  document.documentElement.removeAttribute('style')
})

describe('montarPaisaje', () => {
  it('dibuja tres capas de colinas (SVG) y un astro', () => {
    montarPaisaje(el, MUNDOS.verbos, op())
    expect(el.querySelectorAll('.pa-colina svg').length).toBe(3)
    expect(el.querySelectorAll('.pa-astro').length).toBe(1)
    expect(el.dataset['mundo']).toBe('verbos')
  })

  it('de noche el astro es la luna y salen luciérnagas; de día es el sol y salen destellos', () => {
    montarPaisaje(el, MUNDOS.verbos, op({ cielo: 'noche' }))
    expect(el.querySelector('.pa-astro')!.classList.contains('pa-luna')).toBe(true)
    expect(el.querySelectorAll('.pa-luci').length).toBe(12)
    montarPaisaje(el, MUNDOS.verbos, op({ cielo: 'dia' }))
    expect(el.querySelector('.pa-astro')!.classList.contains('pa-sol')).toBe(true)
    expect(el.querySelectorAll('.pa-luci').length).toBe(0)
    expect(el.querySelectorAll('.pa-destello').length).toBe(8)
  })

  it('sin partículas no hay luciérnagas ni destellos (la partida no las lleva)', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op({ particulas: false }))
    expect(el.querySelectorAll('.pa-luci, .pa-destello').length).toBe(0)
  })

  it('con animado:false todas las capas quedan quietas y no hay partículas, aunque se pidan', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op({ animado: false, particulas: true }))
    const capas = [...el.querySelectorAll('.pa-colina')]
    expect(capas.length).toBe(3)
    for (const c of capas) {
      expect(c.classList.contains('quieto')).toBe(true)
      expect((c as HTMLElement).style.animation).toBe('')
    }
    expect(el.querySelectorAll('.pa-luci, .pa-destello').length).toBe(0)
  })

  it('con apagarTodo (alto contraste) no hay paisaje: el contenedor queda sin hijos y liso', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op({ apagarTodo: true }))
    expect(el.children.length).toBe(0)
    expect(el.classList.contains('liso')).toBe(true)
  })

  it('desmontar lo vacía, y montar dos veces no duplica las capas', () => {
    const desmontar = montarPaisaje(el, MUNDOS.adjetivos, op())
    montarPaisaje(el, MUNDOS.adjetivos, op())
    expect(el.querySelectorAll('.pa-colina').length).toBe(3)
    desmontar()
    expect(el.children.length).toBe(0)
    expect(el.classList.contains('paisaje')).toBe(false)
  })
})

describe('aplicarMundo', () => {
  it('escribe las variables CSS del mundo y del cielo', () => {
    aplicarMundo(MUNDOS.verbos, 'noche')
    const s = document.documentElement.style
    expect(s.getPropertyValue('--cielo-alto')).toBe(MUNDOS.verbos.noche.cieloAlto)
    expect(s.getPropertyValue('--cielo-bajo')).toBe(MUNDOS.verbos.noche.cieloBajo)
    expect(s.getPropertyValue('--colina-1')).toBe(MUNDOS.verbos.noche.colinas[0])
    expect(s.getPropertyValue('--colina-3')).toBe(MUNDOS.verbos.noche.colinas[2])
    expect(s.getPropertyValue('--acento')).toBe(MUNDOS.verbos.noche.acento)
    expect(s.getPropertyValue('--astro')).toBe(MUNDOS.verbos.noche.astro)
  })
  it('cambiar de mundo reemplaza los valores', () => {
    aplicarMundo(MUNDOS.verbos, 'noche')
    aplicarMundo(MUNDOS.conjunciones, 'noche')
    expect(document.documentElement.style.getPropertyValue('--cielo-alto')).toBe(MUNDOS.conjunciones.noche.cieloAlto)
  })
})

describe('opcionesDesdeAjustes', () => {
  it('anima solo si el alumno no pidió menos movimiento, el sistema tampoco y el fondo está encendido', () => {
    expect(opcionesDesdeAjustes(F, false, 'noche').animado).toBe(true)
    expect(opcionesDesdeAjustes({ ...F, reducirMovimiento: true }, false, 'noche').animado).toBe(false)
    expect(opcionesDesdeAjustes(F, true, 'noche').animado).toBe(false)
    expect(opcionesDesdeAjustes({ ...F, fondoDecorativo: false }, false, 'noche').animado).toBe(false)
  })
  it('las partículas siguen a la animación y el alto contraste apaga todo', () => {
    expect(opcionesDesdeAjustes(F, false, 'dia').particulas).toBe(true)
    expect(opcionesDesdeAjustes({ ...F, fondoDecorativo: false }, false, 'dia').particulas).toBe(false)
    expect(opcionesDesdeAjustes({ ...F, altoContraste: true }, false, 'noche').apagarTodo).toBe(true)
    expect(opcionesDesdeAjustes(F, false, 'noche').apagarTodo).toBe(false)
    expect(opcionesDesdeAjustes(F, false, 'dia').cielo).toBe('dia')
  })
})

describe('pausa con la pestaña oculta', () => {
  it('marca <html> cuando la pestaña se oculta y lo saca cuando vuelve', () => {
    iniciarPausaPorVisibilidad()
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.documentElement.classList.contains('pestana-oculta')).toBe(true)
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.documentElement.classList.contains('pestana-oculta')).toBe(false)
  })
})

describe('paisaje.css', () => {
  const css = readFileSync('src/styles/paisaje.css', 'utf8')
  it('define el desplazamiento y lo apaga con menos movimiento (del sistema y de Ajustes)', () => {
    expect(css).toContain('@keyframes pa-desliza')
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.pa-colina/)
    expect(css).toMatch(/html\[data-movimiento="reducido"\][^{]*\{[^}]*animation:\s*none/)
    expect(css).toMatch(/\.quieto\s*\{[^}]*animation:\s*none/)
    expect(css).toMatch(/html\.pestana-oculta[^{]*\{[^}]*animation-play-state:\s*paused/)
  })
  it('los colores salen de las variables del mundo, no están escritos en el CSS', () => {
    for (const v of ['--cielo-alto', '--cielo-bajo', '--colina-1', '--colina-2', '--colina-3', '--astro']) expect(css).toContain(`var(${v})`)
  })
})
