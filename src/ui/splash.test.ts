// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.mock('../audio/AudioEngine', () => ({ activarAudio: vi.fn() }))

import { activarAudio } from '../audio/AudioEngine'
import { restablecerAjustes } from '../storage/ajustes'
import {
  MIN_SPLASH_MS, LIMITE_PASO_MS, pasosIniciales, progresoReal, progresoMostrado, etiquetaActual, pideToque,
  conLimite, cargarEmojis, cargarTipografias, prepararMundos, iniciarSplash, saltarSplash,
} from './splash'

const html = readFileSync('index.html', 'utf8')
const bloqueSplash = html.slice(html.indexOf('<div id="splash">'), html.indexOf('<script src="%BASE_URL%splash-guardia.js"'))

describe('el avance de la barra', () => {
  it('arranca en el 25 % (el código ya llegó) y suma por peso', () => {
    const p = pasosIniciales()
    expect(progresoReal(p)).toBe(25)
    p[1]!.hecho = 1                       // tipografías: 10
    expect(progresoReal(p)).toBe(35)
    p[2]!.hecho = 0.5                     // emojis a la mitad: 20
    expect(progresoReal(p)).toBe(55)
    p[2]!.hecho = 1; p[3]!.hecho = 1
    expect(progresoReal(p)).toBe(100)
  })
  it('los pesos suman 100 y los valores fuera de rango no la rompen', () => {
    const p = pasosIniciales()
    expect(p.reduce((a, x) => a + x.peso, 0)).toBe(100)
    p.forEach(x => { x.hecho = 7 })
    expect(progresoReal(p)).toBe(100)
    p.forEach(x => { x.hecho = -3 })
    expect(progresoReal(p)).toBe(0)
    expect(progresoReal([])).toBe(100)
  })
  it('lo que se muestra nunca pasa de lo real ni de lo que permite el tiempo mínimo', () => {
    expect(progresoMostrado(100, 0)).toBe(0)
    expect(progresoMostrado(100, MIN_SPLASH_MS / 2)).toBe(50)
    expect(progresoMostrado(100, MIN_SPLASH_MS)).toBe(100)
    expect(progresoMostrado(40, MIN_SPLASH_MS * 3)).toBe(40)
    expect(progresoMostrado(100, -50)).toBe(0)
  })
  it('el texto dice qué se carga ahora, y no dice «listo» antes de llegar', () => {
    const p = pasosIniciales()
    expect(etiquetaActual(p)).toBe('Cargando · Tipografías')
    p.forEach(x => { x.hecho = 1 })
    expect(etiquetaActual(p, 60)).toBe('Preparando el juego…')
    expect(etiquetaActual(p, 100)).toBe('¡Listo para cazar!')
  })
  it('el tiempo mínimo es de 2 segundos', () => {
    expect(MIN_SPLASH_MS).toBe(2000)
  })
  it('solo en pantallas táctiles se pide un toque', () => {
    expect(pideToque(true)).toBe(true)
    expect(pideToque(false)).toBe(false)
  })
})

describe('los cargadores', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('conLimite: sigue cuando termina, o cuando se acaba el tiempo si nunca termina', async () => {
    let listo = false
    void conLimite(new Promise(() => {}), 500).then(() => { listo = true })
    await vi.advanceTimersByTimeAsync(499)
    expect(listo).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(listo).toBe(true)
    await expect(conLimite(Promise.reject(new Error('x')), 500)).resolves.toBeUndefined()
  })

  it('emojis: baja cada archivo de verdad (con su ruta) y el avance sube de a poco hasta 1', async () => {
    const pedidos: string[] = []
    class FalsaImg {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(v: string) { pedidos.push(v); setTimeout(() => this.onload?.(), 10) }
    }
    vi.stubGlobal('Image', FalsaImg)
    const avances: number[] = []
    const p = cargarEmojis(['1f3af', '1f440', '1f4a1', '27a1'], f => avances.push(f), '/base/')
    await vi.advanceTimersByTimeAsync(50)
    await p
    expect(pedidos).toEqual(['/base/emoji/1f3af.webp', '/base/emoji/1f440.webp', '/base/emoji/1f4a1.webp', '/base/emoji/27a1.webp'])
    expect(avances).toContain(0.25)
    expect(avances[avances.length - 1]).toBe(1)
    expect([...avances].sort((a, b) => a - b)).toEqual(avances)
  })

  it('emojis: un archivo que no baja no frena la carga', async () => {
    class FalsaImg {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(v: string) { setTimeout(() => (v.includes('roto') ? this.onerror : this.onload)?.(), 5) }
    }
    vi.stubGlobal('Image', FalsaImg)
    const avances: number[] = []
    const p = cargarEmojis(['roto', 'bueno'], f => avances.push(f), '/')
    await vi.advanceTimersByTimeAsync(20)
    await p
    expect(avances[avances.length - 1]).toBe(1)
  })

  it('emojis: con una red que no contesta, se da por terminado al llegar al límite', async () => {
    class FalsaImg { onload = null; onerror = null; set src(_: string) { /* nunca llega */ } }
    vi.stubGlobal('Image', FalsaImg)
    const avances: number[] = []
    let listo = false
    void cargarEmojis(['a', 'b'], f => avances.push(f), '/', 3000).then(() => { listo = true })
    await vi.advanceTimersByTimeAsync(2900)
    expect(listo).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(listo).toBe(true)
    expect(avances[avances.length - 1]).toBe(1)
  })

  it('tipografías: pide cada una y tolera que falte la API o que una falle', async () => {
    const pedidas: string[] = []
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: (f: string) => { pedidas.push(f); return f.includes('Lilita') ? Promise.reject(new Error('x')) : Promise.resolve([]) } } })
    const a1: number[] = []
    await cargarTipografias(f => a1.push(f), ['700 1em "Almendra SC"', '400 1em "Lilita One"'])
    expect(pedidas).toEqual(['700 1em "Almendra SC"', '400 1em "Lilita One"'])
    expect(a1[a1.length - 1]).toBe(1)
    Object.defineProperty(document, 'fonts', { configurable: true, value: undefined })
    const a2: number[] = []
    await cargarTipografias(f => a2.push(f))
    expect(a2).toEqual([1])
  })

  it('mundos: dibuja los diez, uno por vez, hasta 1', async () => {
    const avances: number[] = []
    const p = prepararMundos(f => avances.push(f), 'noche')
    await vi.runAllTimersAsync()
    await p
    expect(avances.filter(a => a < 1).length).toBe(9)
    expect(avances[avances.length - 1]).toBe(1)
  })
})

describe('el flujo completo', () => {
  let alTerminar: ReturnType<typeof vi.fn>
  let tactil: boolean

  const montar = (): void => {
    document.body.innerHTML = bloqueSplash + '<div class="screen" id="menuPrincipal"></div>'
  }
  /** Todo carga al instante: así el único freno es el tiempo mínimo. */
  const cargaInstantanea = (): void => {
    class Img { onload: (() => void) | null = null; onerror = null; set src(_: string) { queueMicrotask(() => this.onload?.()) } }
    vi.stubGlobal('Image', Img)
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: () => Promise.resolve([]) } })
  }

  beforeEach(() => {
    localStorage.clear()
    restablecerAjustes()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({ matches: q.includes('pointer: coarse') ? tactil : false, addEventListener() {} })
    tactil = false
    alTerminar = vi.fn()
    delete (window as { __splashListo?: boolean }).__splashListo
    vi.mocked(activarAudio).mockClear()
    montar()
    cargaInstantanea()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('en PC no arranca antes de los 2 segundos aunque todo esté cargado, y después sigue solo', async () => {
    iniciarSplash({ alTerminar, emojis: ['a', 'b', 'c'], base: '/' })
    await vi.advanceTimersByTimeAsync(1900)
    expect(alTerminar).not.toHaveBeenCalled()
    expect(document.getElementById('splash')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(900)
    expect(alTerminar).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(700)
    expect(document.getElementById('splash')).toBeNull()
    expect(window.__splashListo).toBe(true)
    expect(activarAudio).not.toHaveBeenCalled()   // en PC no hace falta el toque
  })

  it('la barra y el porcentaje suben con el tiempo y el título se llena', async () => {
    iniciarSplash({ alTerminar, emojis: ['a'], base: '/' })
    await vi.advanceTimersByTimeAsync(1000)
    const el = document.getElementById('splash')!
    const p = parseFloat(el.style.getPropertyValue('--p'))
    expect(p).toBeGreaterThan(20)
    expect(p).toBeLessThan(80)
    expect(el.querySelector('.splash-pct')!.textContent).toBe(`${Math.round(p)} %`)
    expect(el.querySelector('.splash-barra')!.getAttribute('aria-valuenow')).toBe(String(Math.round(p)))
    expect(el.classList.contains('fuentes-listas')).toBe(true)
  })

  it('en celulares espera el toque: muestra el botón, no sigue solo, y con el toque despierta el audio y arranca', async () => {
    tactil = true
    iniciarSplash({ alTerminar, emojis: ['a'], base: '/' })
    const boton = document.querySelector<HTMLButtonElement>('.splash-toque')!
    expect(boton.hidden).toBe(true)
    await vi.advanceTimersByTimeAsync(2600)
    expect(boton.hidden).toBe(false)
    await vi.advanceTimersByTimeAsync(20000)
    expect(alTerminar).not.toHaveBeenCalled()
    expect(document.getElementById('splash')).not.toBeNull()
    expect(document.getElementById('splash')!.querySelector('.splash-estado')!.textContent).toBe('¡Listo para cazar!')

    document.getElementById('splash')!.click()
    expect(activarAudio).toHaveBeenCalledTimes(1)
    expect(alTerminar).toHaveBeenCalledTimes(1)
    document.getElementById('splash')?.click()   // un segundo toque no arranca dos veces
    expect(alTerminar).toHaveBeenCalledTimes(1)
    expect(activarAudio).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(700)
    expect(document.getElementById('splash')).toBeNull()
  })

  it('con una red que no contesta, la espera tiene tope y el juego arranca igual', async () => {
    class Colgada { onload = null; onerror = null; set src(_: string) { /* nunca llega */ } }
    vi.stubGlobal('Image', Colgada)
    iniciarSplash({ alTerminar, emojis: ['a', 'b'], base: '/' })
    await vi.advanceTimersByTimeAsync(LIMITE_PASO_MS - 1000)
    expect(alTerminar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2500)
    expect(alTerminar).toHaveBeenCalledTimes(1)
  })

  it('sin pantalla de carga en el HTML, arranca directo', () => {
    document.body.innerHTML = ''
    iniciarSplash({ alTerminar })
    expect(alTerminar).toHaveBeenCalledTimes(1)
  })

  it('saltarSplash (volver a un duelo) la quita y arranca de inmediato', () => {
    saltarSplash(alTerminar)
    expect(document.getElementById('splash')).toBeNull()
    expect(alTerminar).toHaveBeenCalledTimes(1)
    expect(window.__splashListo).toBe(true)
  })
})

describe('lo que está escrito en el HTML y en el arranque', () => {
  const main = readFileSync('src/main.ts', 'utf8')

  it('la pantalla de carga se ve desde el primer instante: está en el HTML, antes que cualquier pantalla', () => {
    expect(html).toContain('<div id="splash">')
    expect(html.indexOf('<div id="splash">')).toBeLessThan(html.indexOf('id="modalNombre"'))
    expect(bloqueSplash).toContain('class="splash-barra" role="progressbar"')
    expect(bloqueSplash).toContain('class="btn3d btn3d--principal splash-toque" hidden')
    expect(bloqueSplash).toContain('Tocá para empezar')
  })
  it('precarga la tipografía del título y la guardia es un archivo propio (la CSP no permite scripts inline)', () => {
    expect(html).toContain('rel="preload" href="%BASE_URL%fonts/almendra-sc-latin.woff2"')
    expect(html).toContain('<script src="%BASE_URL%splash-guardia.js" defer></script>')
    expect(readFileSync('public/splash-guardia.js', 'utf8')).toContain('__splashListo')
  })
  it('main.ts arranca con la pantalla de carga, salvo que se vuelva a un duelo', () => {
    expect(main).toContain('iniciarSplash({ alTerminar: arrancar })')
    expect(main).toContain('if (leerDueloGuardado()) saltarSplash(arrancar)')
    // El menú solo se abre desde `arrancar` (que corre al terminar la carga): una sola llamada, dentro de ella.
    expect(main.match(/mostrar\('menuPrincipal'\)/g)?.length).toBe(1)
    expect(main.indexOf("mostrar('menuPrincipal')")).toBeGreaterThan(main.indexOf('const arrancar'))
    expect(main.indexOf("mostrar('menuPrincipal')")).toBeLessThan(main.indexOf('iniciarSplash({'))
    expect(main).toContain("import './styles/splash.css'")
  })
  it('el aviso de la pantalla de carga no usa solo requestAnimationFrame (en una pestaña tapada casi no corre)', () => {
    expect(readFileSync('src/ui/splash.ts', 'utf8')).not.toContain('requestAnimationFrame(')
  })
  it('las palabras que caen se apagan con «menos movimiento»', () => {
    const css = readFileSync('src/styles/splash.css', 'utf8')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('html[data-movimiento="reducido"] .splash-palabras{display:none}')
  })
  it('los emojis de la carga salen del build, los mismos que public/emoji', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8')
    expect(cfg).toContain('__EMOJIS__: JSON.stringify(emojisUsados().map(codigoDeArchivo))')
  })
})
