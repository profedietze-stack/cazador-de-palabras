import { DECO_PALABRAS, DECO_COLORES } from '../data/decoWords'
import { G } from '../game/state'
import { iniciarStickersMenu, limpiarStickersMenu } from './StickerSystem'
import { getTotalCombosJugador } from '../storage/GameStorage'
import { ajustes } from '../storage/ajustes'
import { reducirMovimientoActivo } from '../utils/movimiento'
import { avanzar, balanceo, entrada, aplicarPosicion, lanzarChapuzon, DT_MAX_MS } from '../game/caida'

// Fondo decorativo del menú.
//
// Auditoría 28-oct (ING-1): se guardaba un id de requestAnimationFrame por
// fotograma de cada palabra (~2000 por segundo, el arreglo solo se vaciaba al
// salir del menú) y, si se volvía al menú antes de que venciera un setTimeout
// pendiente, el bucle viejo seguía vivo junto al nuevo: tras 20 idas y vueltas
// había 54 palabras decorativas contra 39 al inicio y los listeners se duplicaban.
//
// Ahora: un número de generación que invalida todo lo anterior, los temporizadores
// registrados para poder cancelarlos, y un solo id de rAF vivo por palabra.

let decoActivo = false
let generacion = 0
const temporizadores = new Set<ReturnType<typeof setTimeout>>()
const animaciones = new Map<HTMLElement, number>()

const reducirMovimiento = reducirMovimientoActivo

function programar(gen: number, ms: number, fn: () => void): void {
  const id = setTimeout(() => {
    temporizadores.delete(id)
    if (gen === generacion && decoActivo) fn()
  }, ms)
  temporizadores.add(id)
}

export function iniciarDecoMenu(): void {
  // Puede llegar tarde (ScreenManager lo agenda 80 ms después de mostrar el
  // menú): si el alumno ya se fue, no se arranca nada.
  if (!document.getElementById('menuPrincipal')?.classList.contains('active')) return
  detenerDecoMenu()
  if (reducirMovimiento()) return   // sin fondo animado para quien pidió menos movimiento
  if (!ajustes().fondoDecorativo) return   // Ajustes ▸ fondo decorativo apagado
  decoActivo = true
  const gen = ++generacion
  const bg = document.getElementById('menuBg')!
  bg.innerHTML = ''

  if (G.jugador) {
    const tc = getTotalCombosJugador()
    programar(gen, 600, () => iniciarStickersMenu(tc))
  }

  const totalIniciales = 18
  for (let i = 0; i < totalIniciales; i++) {
    programar(gen, i * 260, () => lanzarDecoWord(bg, gen, true, i / totalIniciales))
  }

  const bucle = (): void => {
    lanzarDecoWord(bg, gen, false, 0)
    programar(gen, 900 + Math.random() * 1200, bucle)
  }
  programar(gen, totalIniciales * 260 + 200, bucle)
}

export function detenerDecoMenu(): void {
  decoActivo = false
  generacion++                       // invalida lo que haya en vuelo
  temporizadores.forEach(id => clearTimeout(id))
  temporizadores.clear()
  animaciones.forEach(id => cancelAnimationFrame(id))
  animaciones.clear()
  const bg = document.getElementById('menuBg')
  if (bg) bg.innerHTML = ''
  limpiarStickersMenu()
}

/** Cantidad de animaciones vivas: para el test que cuenta fugas. */
export function decoPendientes(): { temporizadores: number; animaciones: number } {
  return { temporizadores: temporizadores.size, animaciones: animaciones.size }
}

function lanzarDecoWord(bg: HTMLElement, gen: number, inicial: boolean, progreso: number): void {
  const el = document.createElement('div')
  el.className = 'deco-palabra'
  el.textContent = DECO_PALABRAS[Math.floor(Math.random() * DECO_PALABRAS.length)]!

  const size = 18 + Math.random() * 16
  el.style.fontSize = size + 'px'
  el.style.color = DECO_COLORES[Math.floor(Math.random() * DECO_COLORES.length)]!

  const W = window.innerWidth
  const x = Math.random() * (W - 120)
  el.style.left = x + 'px'

  const H = window.innerHeight
  const startY = inicial ? Math.random() * H * progreso * 1.4 - 60 : -55

  // Misma velocidad de antes (px por fotograma × 60 = px por segundo): igual en 60, 120 o 144 Hz.
  const pxPorSeg = (0.35 + (size / 34) * 0.65 + Math.random() * 0.4) * 60
  const amplitud = 6 + Math.random() * 12
  const frecuencia = 0.7 + Math.random() * 0.9
  let fase = Math.random() * Math.PI * 2
  let y = startY
  let ultimo: number | null = null
  let hundida = false
  const lineaAgua = H * 0.86   // el agua ocupa el 14 % de abajo del paisaje

  aplicarPosicion(el, { y, escala: inicial ? 1 : entrada(y).escala })
  if (!inicial) el.style.opacity = '0'

  bg.appendChild(el)

  const terminar = (): void => {
    animaciones.delete(el)
    el.remove()
  }

  const animar = (ahora: number): void => {
    if (gen !== generacion || !decoActivo) { terminar(); return }
    const dt = ultimo === null ? 1000 / 60 : ahora - ultimo
    ultimo = ahora
    y = avanzar(y, pxPorSeg, dt)
    fase += Math.min(Math.max(dt, 0), DT_MAX_MS) / 1000 * frecuencia
    const { dx, rot } = balanceo(fase, amplitud, 3)
    const e = entrada(y)
    aplicarPosicion(el, { x: dx, y, rot, escala: inicial ? 1 : e.escala })
    if (!inicial && e.opacidad < 1) el.style.opacity = String(e.opacidad)
    else if (el.style.opacity) el.style.opacity = ''
    // Al llegar a la laguna se hunde con una onda, como las de la partida.
    if (!hundida && y >= lineaAgua - 30) {
      hundida = true
      el.classList.add('se-hunde')
      lanzarChapuzon(bg, x + dx + el.offsetWidth / 2, lineaAgua)
    }
    if (y > H + 40) { terminar(); return }
    animaciones.set(el, requestAnimationFrame(animar))
  }
  animaciones.set(el, requestAnimationFrame(animar))
}
