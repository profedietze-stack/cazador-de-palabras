import { DECO_PALABRAS, DECO_COLORES } from '../data/decoWords'
import { G } from '../game/state'
import { iniciarStickersMenu, limpiarStickersMenu } from './StickerSystem'
import { getTotalCombosJugador } from '../storage/GameStorage'

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

const reducirMovimiento = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

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
  el.style.top = startY + 'px'

  const speed = 0.35 + (size / 34) * 0.65 + Math.random() * 0.4
  const oscila = size > 26
  const ampX = 10 + Math.random() * 20
  const freqX = 0.4 + Math.random() * 0.6
  const startX = x
  let t = 0
  let posY = startY

  bg.appendChild(el)

  const terminar = (): void => {
    animaciones.delete(el)
    el.remove()
  }

  const animar = (): void => {
    if (gen !== generacion || !decoActivo) { terminar(); return }
    posY += speed
    t += 0.03
    el.style.top = posY + 'px'
    if (oscila) el.style.left = (startX + Math.sin(t * freqX * Math.PI * 2) * ampX) + 'px'
    if (posY > H + 40) { terminar(); return }
    animaciones.set(el, requestAnimationFrame(animar))
  }
  animaciones.set(el, requestAnimationFrame(animar))
}
