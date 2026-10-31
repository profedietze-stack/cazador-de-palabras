// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { iniciarAjustes } from './aplicarAjustes'
import { iniciarFondoReactivo, actualizarFondo } from './fondoMundo'
import { MUNDOS } from '../data/mundos'

// Revisión final: con el tema «Auto», cuando el sistema pasa de oscuro a claro (o al revés) en vivo,
// cambiaba el texto (--sobre-cielo) pero el paisaje seguía con el cielo anterior: texto marrón
// sobre cielo de noche, casi ilegible, hasta cambiar de pantalla.

let oscuro = true
const oyentes: Array<() => void> = []

beforeEach(() => {
  localStorage.setItem('cdp:ajustes', JSON.stringify({ sonido: false, tema: 'auto' }))
  oscuro = true
  oyentes.length = 0
  ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({
    get matches() { return q.includes('dark') ? oscuro : false },
    addEventListener: (_: string, fn: () => void) => { oyentes.push(fn) },
  })
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = '<div id="menuPrincipal" class="screen active"><div class="fondo-mundo"></div></div>'
})

describe('«Auto»: el sistema cambia de esquema con el juego abierto', () => {
  it('el paisaje se rehace con el cielo y el astro del esquema nuevo', () => {
    iniciarAjustes()
    iniciarFondoReactivo()
    actualizarFondo(document.getElementById('menuPrincipal')!)
    const f = document.querySelector('#menuPrincipal .fondo-mundo')!
    expect(document.documentElement.dataset['cielo']).toBe('noche')
    expect(f.querySelector('.pa-luna')).not.toBeNull()

    oscuro = false
    oyentes.forEach(fn => fn())   // el navegador avisa el cambio

    expect(document.documentElement.dataset['cielo']).toBe('dia')
    expect(document.documentElement.style.getPropertyValue('--cielo-alto')).toBe(MUNDOS.inicio.dia.cieloAlto)
    expect(f.querySelector('.pa-sol')).not.toBeNull()
    expect(f.querySelector('.pa-luna')).toBeNull()

    oscuro = true
    oyentes.forEach(fn => fn())
    expect(document.documentElement.style.getPropertyValue('--cielo-alto')).toBe(MUNDOS.inicio.noche.cieloAlto)
    expect(f.querySelector('.pa-luna')).not.toBeNull()
  })
})
