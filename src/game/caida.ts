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

/** Cómo aterriza una palabra que se escapa: en el agua (onda), entre el follaje (hojas), en el pasto alto (briznas) o en la nieve (copos). */
export type TipoAterrizaje = 'agua' | 'hojas' | 'pasto' | 'nieve'

const TIPOS: readonly TipoAterrizaje[] = ['agua', 'hojas', 'pasto', 'nieve']

/** El aterrizaje de la escena que está en pantalla dentro de `raiz` (un selector); sin escena, agua. */
export function aterrizajeDe(raiz: string): TipoAterrizaje {
  const t = document.querySelector<HTMLElement>(`${raiz} .paisaje`)?.dataset['aterrizaje']
  return TIPOS.find(x => x === t) ?? 'agua'
}

/** La línea donde aterrizan las palabras (px desde arriba de `raiz`): la marca de la escena o, si no hay, la laguna. */
export function lineaDeAterrizaje(raiz: string): number | null {
  const marca = document.querySelector(`${raiz} .pa-linea`) ?? document.querySelector(`${raiz} .pa-agua`)
  return marca ? marca.getBoundingClientRect().top : null
}

/** Hojas que saltan donde la palabra se pierde entre el follaje. Sin «reducir movimiento». */
export function lanzarHojas(contenedor: HTMLElement, cx: number, cy: number): void {
  if (reducirMovimientoActivo()) return
  const colores = ['#7fd08a', '#4fa86a', '#c9dd45', '#e0c24a']
  const nodos: HTMLElement[] = []
  for (let i = 0; i < 8; i++) {
    const h = document.createElement('div')
    h.className = 'hoja-aterriza'
    const ang = -Math.PI / 2 + ((i - 3.5) / 3.5) * 1.1
    const dist = 20 + (i % 3) * 9
    h.style.left = `${cx}px`
    h.style.top = `${cy}px`
    h.style.background = colores[i % colores.length]!
    h.style.setProperty('--dx', `${r2(Math.cos(ang) * dist)}px`)
    h.style.setProperty('--dy', `${r2(Math.sin(ang) * dist)}px`)
    h.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (40 + i * 18)}deg`)
    contenedor.appendChild(h)
    nodos.push(h)
  }
  retirarLuego(contenedor, nodos, 900)
}

/** Briznas de pasto que se sacuden donde la palabra se pierde en el pastizal. Sin «reducir movimiento». */
export function lanzarBriznas(contenedor: HTMLElement, cx: number, cy: number): void {
  if (reducirMovimientoActivo()) return
  const colores = ['#e8b350', '#f3c870', '#d99a3a', '#c9a050']
  const nodos: HTMLElement[] = []
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('div')
    b.className = 'brizna-aterriza'
    b.style.left = `${r2(cx + (i - 4) * 5)}px`
    b.style.top = `${cy}px`
    b.style.background = colores[i % colores.length]!
    b.style.setProperty('--dx', `${r2((i - 4) * 3)}px`)
    b.style.setProperty('--dy', `${-(14 + (i % 3) * 8)}px`)
    b.style.setProperty('--rot', `${(i - 4) * 9}deg`)
    contenedor.appendChild(b)
    nodos.push(b)
  }
  retirarLuego(contenedor, nodos, 800)
}

/** Copos de nieve que se levantan donde la palabra se entierra. Sin «reducir movimiento». */
export function lanzarCopos(contenedor: HTMLElement, cx: number, cy: number): void {
  if (reducirMovimientoActivo()) return
  const nodos: HTMLElement[] = []
  for (let i = 0; i < 10; i++) {
    const c = document.createElement('div')
    c.className = 'copo-aterriza'
    const ang = -Math.PI / 2 + ((i - 4.5) / 4.5) * 1.3
    const dist = 14 + (i % 4) * 7
    c.style.left = `${cx}px`
    c.style.top = `${cy}px`
    c.style.width = c.style.height = `${4 + (i % 3) * 2}px`
    c.style.setProperty('--dx', `${r2(Math.cos(ang) * dist)}px`)
    c.style.setProperty('--dy', `${r2(Math.sin(ang) * dist)}px`)
    contenedor.appendChild(c)
    nodos.push(c)
  }
  retirarLuego(contenedor, nodos, 900)
}

/** Efecto de aterrizaje según la escena. */
export function lanzarAterrizaje(contenedor: HTMLElement, cx: number, cy: number, tipo: TipoAterrizaje): void {
  if (tipo === 'hojas') lanzarHojas(contenedor, cx, cy)
  else if (tipo === 'pasto') lanzarBriznas(contenedor, cx, cy)
  else if (tipo === 'nieve') lanzarCopos(contenedor, cx, cy)
  else lanzarChapuzon(contenedor, cx, cy)
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
