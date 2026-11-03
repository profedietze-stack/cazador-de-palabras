import { ESCENAS, cieloDeHora, type Hora } from './escenas'
import { horaDePantalla, mundoDePantalla, sistemaReduce } from './fondoMundo'
import { aplicarMundo } from './aplicarMundo'
import { montarPaisaje, opcionesDesdeAjustes } from './paisaje'
import { ajustes } from '../storage/ajustes'
import { reducirMovimientoActivo } from '../utils/movimiento'
import { activarAudio } from '../audio/AudioEngine'
import type { EscenaId } from '../data/mundos'

/**
 * Pantalla de carga. La barra mide cosas que de verdad se cargan: las tipografías, los emojis
 * propios (imágenes) y el dibujo de los mundos. El código del juego ya llegó cuando esto corre.
 * Dura al menos `MIN_SPLASH_MS` (que no parpadee), y más si la carga tarda más. En celulares
 * espera un toque: es el gesto que el navegador exige para activar el sonido.
 */

export const MIN_SPLASH_MS = 2000
/** Un paso que tarda más que esto (wifi lenta) se da por terminado: el juego anda igual, con el emoji del sistema. */
export const LIMITE_PASO_MS = 10000
/** Cada cuántos ms se repinta la barra. Un temporizador y no requestAnimationFrame: en una pestaña tapada rAF casi no corre. */
const PASO_MS = 40

export interface Paso { id: string; etiqueta: string; peso: number; hecho: number }

/** Pesos aproximados al tamaño de cada cosa: código 312 KB, emojis 388 KB, tipografías 64 KB, mundos (CPU). */
export function pasosIniciales(): Paso[] {
  return [
    { id: 'js', etiqueta: 'Código', peso: 25, hecho: 1 },   // ya descargado: si corre esto, llegó
    { id: 'tipografias', etiqueta: 'Tipografías', peso: 10, hecho: 0 },
    { id: 'emojis', etiqueta: 'Emojis', peso: 40, hecho: 0 },
    { id: 'mundos', etiqueta: 'Mundos', peso: 25, hecho: 0 },
  ]
}

/** Avance real, de 0 a 100. */
export function progresoReal(pasos: readonly Paso[]): number {
  const total = pasos.reduce((a, p) => a + p.peso, 0)
  if (total <= 0) return 100
  const hecho = pasos.reduce((a, p) => a + p.peso * Math.min(1, Math.max(0, p.hecho)), 0)
  return Math.round(Math.min(100, (hecho / total) * 100) * 10) / 10
}

/** Lo que muestra la barra: el avance real, sin pasarse de lo que permite el tiempo mínimo. */
export function progresoMostrado(real: number, transcurridoMs: number, minMs: number = MIN_SPLASH_MS): number {
  const tope = minMs <= 0 ? 100 : Math.max(0, transcurridoMs) / minMs * 100
  return Math.max(0, Math.min(real, tope, 100))
}

/** Qué se está cargando ahora (el primer paso sin terminar) o el cierre. */
export function etiquetaActual(pasos: readonly Paso[], mostrado = 100): string {
  const p = pasos.find(x => x.hecho < 1)
  if (p) return `Cargando · ${p.etiqueta}`
  return mostrado >= 99.5 ? '¡Listo para cazar!' : 'Preparando el juego…'
}

/** ¿Hay que esperar un toque? Solo en pantallas táctiles (celulares y tablets): en PC no hace falta. */
export function pideToque(tactil: boolean): boolean {
  return tactil
}

function esTactil(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

type Avanza = (fraccion: number) => void

/** Resuelve cuando `p` termina o pasan `ms`, lo que ocurra primero. Nunca rechaza. */
export function conLimite(p: Promise<unknown>, ms: number): Promise<void> {
  return new Promise<void>(res => {
    const t = setTimeout(res, ms)
    p.then(() => { clearTimeout(t); res() }, () => { clearTimeout(t); res() })
  })
}

const FUENTES = ['700 1em "Almendra SC"', '400 1em "Lilita One"', '800 1em "Baloo 2"']

export async function cargarTipografias(avanza: Avanza, fuentes: readonly string[] = FUENTES, limiteMs = LIMITE_PASO_MS): Promise<void> {
  const fs = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fs || typeof fs.load !== 'function') { avanza(1); return }
  let hechas = 0
  const una = (f: string): Promise<unknown> =>
    fs.load(f).catch(() => undefined).then(() => { hechas++; avanza(hechas / fuentes.length) })
  await conLimite(Promise.all(fuentes.map(una)), limiteMs)
  avanza(1)
}

export async function cargarEmojis(codigos: readonly string[], avanza: Avanza, base: string, limiteMs = LIMITE_PASO_MS): Promise<void> {
  if (codigos.length === 0 || typeof Image === 'undefined') { avanza(1); return }
  let hechos = 0
  const uno = (c: string): Promise<void> => new Promise<void>(res => {
    const img = new Image()
    const fin = (): void => { hechos++; avanza(hechos / codigos.length); res() }
    img.onload = fin
    img.onerror = fin   // si no baja, el juego usa el emoji del sistema: no se frena por eso
    img.src = `${base}emoji/${c}.webp`
  })
  await conLimite(Promise.all(codigos.map(uno)), limiteMs)
  avanza(1)
}

/** Dibuja cada mundo una vez (cede el hilo entre uno y otro): deja listo el trabajo y destapa errores antes de jugar. */
export async function prepararMundos(avanza: Avanza, hora: Hora, ids: readonly EscenaId[] = Object.keys(ESCENAS) as EscenaId[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    try { ESCENAS[ids[i]!].dibujar(hora, false) } catch { /* un mundo roto no frena el arranque; ya lo vería el aviso de errores */ }
    avanza((i + 1) / ids.length)
    await new Promise<void>(r => setTimeout(r, 0))
  }
  avanza(1)
}

export interface OpcionesSplash {
  /** Lo que arranca el juego (mostrar el menú…): corre cuando la carga terminó, justo antes del desvanecido. */
  alTerminar: () => void
  /** Códigos de archivo de los emojis a bajar (por defecto, los del build). */
  emojis?: readonly string[]
  minMs?: number
  /** Base de las rutas (por defecto, la del build). */
  base?: string
}

declare global { interface Window { __splashListo?: boolean } }

function emojisDelBuild(): readonly string[] {
  return typeof __EMOJIS__ !== 'undefined' ? __EMOJIS__ : []
}

/** Saca la pantalla de carga sin pasar por ella (por ejemplo, al volver a un duelo en curso). */
export function saltarSplash(alTerminar: () => void): void {
  document.getElementById('splash')?.remove()
  window.__splashListo = true
  alTerminar()
}

export function iniciarSplash(op: OpcionesSplash): void {
  const el = document.getElementById('splash')
  if (!el) { window.__splashListo = true; op.alTerminar(); return }
  const minMs = op.minMs ?? MIN_SPLASH_MS
  const base = op.base ?? import.meta.env.BASE_URL
  const titulo = el.querySelector<HTMLElement>('.splash-titulo')
  const barra = el.querySelector<HTMLElement>('.splash-barra')
  const estado = el.querySelector<HTMLElement>('.splash-estado')
  const pct = el.querySelector<HTMLElement>('.splash-pct')
  const btnToque = el.querySelector<HTMLButtonElement>('.splash-toque')

  // El mismo paisaje de inicio que el menú (hora según el tema).
  const hora = horaDePantalla('menuPrincipal')
  const cielo = cieloDeHora(hora)
  const fondo = el.querySelector<HTMLElement>('.fondo-mundo')
  let desmontarFondo: (() => void) | null = null
  try {
    const mundo = mundoDePantalla('menuPrincipal')
    aplicarMundo(mundo, cielo)
    if (fondo) desmontarFondo = montarPaisaje(fondo, mundo, opcionesDesdeAjustes(ajustes(), sistemaReduce(), cielo, hora))
  } catch { /* sin paisaje la pantalla de carga igual funciona */ }

  const pasos = pasosIniciales()
  const marcar = (id: string): Avanza => f => { const p = pasos.find(x => x.id === id); if (p) p.hecho = Math.max(p.hecho, f) }
  void cargarTipografias(marcar('tipografias')).then(() => { el.classList.add('fuentes-listas') })
  void cargarEmojis(op.emojis ?? emojisDelBuild(), marcar('emojis'), base)
  void prepararMundos(marcar('mundos'), hora)
  // La tipografía del título tiene que estar antes de mostrarlo; si tarda, se muestra igual.
  setTimeout(() => el.classList.add('fuentes-listas'), 1500)

  const t0 = performance.now()
  let mostrado = 0
  let terminado = false

  const pintar = (v: number): void => {
    el.style.setProperty('--p', String(Math.round(v * 10) / 10))
    const n = Math.round(v)
    if (pct) pct.textContent = `${n} %`
    if (barra) { barra.setAttribute('aria-valuenow', String(n)); barra.setAttribute('aria-valuetext', `${n} %`) }
    if (estado) estado.textContent = etiquetaActual(pasos, v)
    if (titulo) titulo.setAttribute('aria-label', `Cazador de Palabras, cargando ${n} por ciento`)
  }

  const salir = (): void => {
    op.alTerminar()
    window.__splashListo = true
    el.classList.add('saliendo')
    const quitar = (): void => { desmontarFondo?.(); el.remove() }
    if (reducirMovimientoActivo()) quitar()
    else setTimeout(quitar, 500)
  }

  const esperarToque = (): void => {
    if (estado) estado.textContent = '¡Listo para cazar!'
    if (btnToque) {
      btnToque.hidden = false
      btnToque.focus({ preventScroll: true })
    }
    let usado = false
    const tocar = (): void => {
      if (usado) return
      usado = true
      activarAudio()   // dentro del toque: así el navegador deja sonar la música y los efectos
      salir()
    }
    // Solo `click`, no `touchend`: tras un touchend el navegador manda además un clic, que caería
    // en el botón del menú que queda justo debajo (y abriría una pantalla sin que nadie la pida).
    el.addEventListener('click', tocar)
    el.style.cursor = 'pointer'
  }

  const cuadro = (): void => {
    if (terminado) return
    const real = progresoReal(pasos)
    const objetivo = progresoMostrado(real, performance.now() - t0, minMs)
    // Se acerca al objetivo con suavidad, sin retroceder.
    mostrado = Math.max(mostrado, mostrado + (objetivo - mostrado) * 0.25 + (objetivo > mostrado ? 0.05 : 0))
    if (mostrado > objetivo) mostrado = objetivo
    pintar(mostrado)
    if (real >= 100 && objetivo >= 100 && mostrado >= 99.5) {
      terminado = true
      pintar(100)
      if (pideToque(esTactil())) esperarToque()
      else salir()
      return
    }
    setTimeout(cuadro, PASO_MS)
  }
  pintar(0)
  setTimeout(cuadro, PASO_MS)
}
