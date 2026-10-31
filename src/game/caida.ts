import { reducirMovimientoActivo } from '../utils/movimiento'

// Movimiento de las palabras que caen (partida y menú de inicio): funciones puras para el
// desplazamiento, el balanceo y la entrada, y los dos efectos (chispas del acierto y onda del
// chapuzón en la laguna).
//
// Todo se escribe como variables CSS (--x, --y, --r, --s) que la regla `.palabra` compone en un
// solo `transform`: así la animación de acierto o error parte de donde está la palabra y no salta
// al origen, y la GPU mueve la palabra sin recalcular el diseño en cada fotograma.

/** Tope de tiempo que se avanza por fotograma: tras un tirón o una pestaña en segundo plano no hay teletransporte. */
export const DT_MAX_MS = 50

/**
 * Nueva altura tras `dtMs`. La velocidad es en píxeles por SEGUNDO (la de antes en píxeles por
 * fotograma × 60): a 60 Hz cae lo mismo que siempre y en una pantalla de 120 o 144 Hz también.
 */
export function avanzar(y: number, pxPorSeg: number, dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return y
  return y + pxPorSeg * Math.min(dtMs, DT_MAX_MS) / 1000
}

/** Vaivén lateral y una inclinación mínima que lo acompaña (las palabras no giran: se leerían mal). */
export function balanceo(fase: number, amplitudPx: number, inclinacionMaxGrados: number): { dx: number; rot: number } {
  return {
    dx: amplitudPx ? Math.sin(fase) * amplitudPx : 0,
    rot: inclinacionMaxGrados ? Math.cos(fase) * inclinacionMaxGrados : 0,
  }
}

/** La palabra aparece de a poco al cruzar el borde de arriba (de y = −40 a y = 30). */
export function entrada(y: number): { opacidad: number; escala: number } {
  const t = Math.min(1, Math.max(0, (y + 40) / 70))
  return { opacidad: t, escala: 1 - 0.15 * (1 - t) }
}

const alturas = new WeakMap<HTMLElement, number>()

const r2 = (n: number): number => Math.round(n * 100) / 100

/** Escribe la posición como variables CSS y recuerda la altura (el teclado ordena por ella). */
export function aplicarPosicion(el: HTMLElement, p: { x?: number; y: number; rot?: number; escala?: number }): void {
  el.style.setProperty('--x', `${r2(p.x ?? 0)}px`)
  el.style.setProperty('--y', `${r2(p.y)}px`)
  el.style.setProperty('--r', `${r2(p.rot ?? 0)}deg`)
  el.style.setProperty('--s', String(r2(p.escala ?? 1)))
  alturas.set(el, p.y)
}

/** Altura (en px desde arriba del área de juego) de una palabra; 0 si nunca se posicionó. */
export function alturaDe(el: HTMLElement): number {
  return alturas.get(el) ?? 0
}

/** Cuántos píxeles debe haber entrado la palabra en el agua (borde de arriba) para empezar a hundirse. */
export const ENTRADA_AGUA_PX = 6

/** La palabra se hunde cuando su borde de arriba ya pasó la línea del agua: se hunde DENTRO de la laguna. */
export function debeHundirse(y: number, lineaAgua: number): boolean {
  return y >= lineaAgua + ENTRADA_AGUA_PX
}

/** Altura de la onda del chapuzón: el borde de abajo de la palabra, ya sumergida (no la línea de la orilla). */
export function yDelChapuzon(yPalabra: number, altoPalabra: number): number {
  return yPalabra + altoPalabra
}

const MAX_CHISPAS = 16

/** Más chispas cuanto más alto el combo, con tope. */
export function cantidadChispas(comboNivel: number): number {
  return Math.min(MAX_CHISPAS, 6 + 2 * Math.max(0, comboNivel))
}

function retirarLuego(contenedor: HTMLElement, nodos: HTMLElement[], ms: number): void {
  setTimeout(() => { for (const n of nodos) if (n.parentElement === contenedor) n.remove() }, ms)
}

/** Chispas del color del mundo que salen de la palabra acertada. Sin «reducir movimiento». */
export function lanzarChispas(contenedor: HTMLElement, cx: number, cy: number, cantidad: number, color: string): void {
  const n = Math.min(MAX_CHISPAS, Math.floor(cantidad))
  if (n <= 0 || reducirMovimientoActivo()) return
  const nodos: HTMLElement[] = []
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div')
    c.className = 'chispa'
    const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const dist = 26 + Math.random() * 28
    c.style.left = `${cx}px`
    c.style.top = `${cy}px`
    c.style.background = color
    c.style.setProperty('--dx', `${r2(Math.cos(ang) * dist)}px`)
    c.style.setProperty('--dy', `${r2(Math.sin(ang) * dist)}px`)
    contenedor.appendChild(c)
    nodos.push(c)
  }
  retirarLuego(contenedor, nodos, 700)
}

/** Onda que se abre en el agua donde cae una palabra. Sin «reducir movimiento». */
export function lanzarChapuzon(contenedor: HTMLElement, cx: number, cy: number): void {
  if (reducirMovimientoActivo()) return
  const o = document.createElement('div')
  o.className = 'onda-chapuzon'
  o.style.left = `${cx}px`
  o.style.top = `${cy}px`
  contenedor.appendChild(o)
  retirarLuego(contenedor, [o], 900)
}
