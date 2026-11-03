// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { G } from './state'
import { animarCaida, REMEDIR_MS } from './WordPhysics'
import { restablecerAjustes } from '../storage/ajustes'

/**
 * La primera palabra de la partida nace mientras el juego pasa a pantalla completa y se monta el
 * fondo: el área todavía es chica y la escena no está. Se hundía «en el agua» casi arriba de todo
 * (con ondas, sin hojas) en lugar de perderse entre el follaje abajo, como las demás.
 */
describe('primera palabra: el aterrizaje no se decide con el área a medio acomodar', () => {
  let alto: number
  let cola: Array<(t: number) => void>
  let ahora: number
  let area: HTMLElement
  let palabra: HTMLElement

  const cuadros = (n: number): void => {
    for (let i = 0; i < n; i++) {
      const fn = cola.shift()
      ahora += 16
      fn?.(ahora)
    }
  }
  const yDe = (): number => {
    const m = /translate3d\([^,]+,\s*([-\d.]+)px/.exec(palabra.style.transform) ?? /--y:\s*([-\d.]+)px/.exec(palabra.getAttribute('style') ?? '')
    return m ? parseFloat(m[1]!) : NaN
  }

  beforeEach(() => {
    localStorage.clear()
    restablecerAjustes()
    ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener() {} })
    document.body.innerHTML = '<div id="gameScreen"><div id="gameArea"></div></div>'
    area = document.getElementById('gameArea')!
    alto = 100   // área todavía chica, sin escena
    Object.defineProperty(area, 'clientHeight', { get: () => alto, configurable: true })
    cola = []; ahora = 0
    vi.stubGlobal('requestAnimationFrame', (fn: (t: number) => void) => { cola.push(fn); return cola.length })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    G.activo = true; G.pausado = false; G.velocidadBase = 1
    palabra = document.createElement('div')
    palabra.className = 'palabra'
    area.appendChild(palabra)
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); G.activo = false })

  it('si el área crece y aparece el bosque mientras cae, se pierde entre las hojas abajo', () => {
    animarCaida(palabra, 24)
    cuadros(3)

    // El juego termina de acomodarse: área completa y escena del bosque montada.
    alto = 600
    const pais = document.createElement('div')
    pais.className = 'paisaje'
    pais.dataset['aterrizaje'] = 'hojas'
    document.getElementById('gameScreen')!.prepend(pais)

    // Con el alto viejo (100) la línea quedaba en ~78 px: ahí se hundía. Se la deja llegar hasta
    // pasado ese punto pero bien arriba de lo que corresponde (60 % de 600 = 360).
    while (yDe() < 150 && cola.length) cuadros(1)
    expect(yDe()).toBeGreaterThanOrEqual(150)
    expect(palabra.classList.contains('se-hunde')).toBe(false)
    expect(area.querySelector('.onda-chapuzon')).toBeNull()
    expect(palabra.isConnected).toBe(true)

    // Sigue cayendo hasta la línea de verdad y ahí sí aterriza, con hojas y sin agua.
    let guardia = 0
    while (!palabra.classList.contains('se-hunde') && guardia++ < 400) cuadros(1)
    expect(palabra.classList.contains('se-hunde')).toBe(true)
    expect(yDe()).toBeGreaterThanOrEqual(600 * 0.6)
    expect(area.querySelector('.hoja-aterriza')).not.toBeNull()
    expect(area.querySelector('.onda-chapuzon')).toBeNull()
  })

  it('con el área todavía en cero no se la da por perdida', () => {
    alto = 0
    animarCaida(palabra, 24)
    cuadros(60)
    expect(palabra.isConnected).toBe(true)
  })

  it('vuelve a medir seguido y no en cada fotograma', () => {
    expect(REMEDIR_MS).toBeGreaterThanOrEqual(200)
    expect(REMEDIR_MS).toBeLessThanOrEqual(1000)
  })
})
