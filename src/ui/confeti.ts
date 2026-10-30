import type { Medal } from '../types'
import { reducirMovimientoActivo } from '../utils/movimiento'

// Confeti de la pantalla final. Es discreto (cae una sola vez y se retira solo), proporcional al
// resultado y se apaga con «reducir movimiento» (del alumno o del sistema).

const POR_MEDALLA: Record<Medal, number> = { BRONCE: 10, PLATA: 18, ORO: 28 }
const COLORES = ['#ffd23f', '#ff6b6b', '#4dd4ac', '#7cc4ff', '#c792ea', '#ffb347']
const RETIRAR_A_LOS_MS = 7000

/** Cuántas piezas: ninguna sin medalla, más cuanto mejor la medalla. */
export function cantidadConfeti(medalla: Medal | null): number {
  return medalla ? POR_MEDALLA[medalla] : 0
}

const cancelaciones = new WeakMap<HTMLElement, () => void>()

/** Lanza `cantidad` piezas en `contenedor`. Devuelve la función que las quita antes de tiempo. */
export function lanzarConfeti(contenedor: HTMLElement, cantidad: number): () => void {
  cancelaciones.get(contenedor)?.()   // lo de la vez anterior no se acumula
  contenedor.replaceChildren()
  contenedor.setAttribute('aria-hidden', 'true')
  if (cantidad <= 0 || reducirMovimientoActivo()) return () => {}

  for (let i = 0; i < cantidad; i++) {
    const p = document.createElement('div')
    p.className = 'conf'
    p.style.left = `${Math.round(Math.random() * 98)}%`
    p.style.width = `${6 + Math.round(Math.random() * 6)}px`
    p.style.height = `${10 + Math.round(Math.random() * 6)}px`
    p.style.background = COLORES[i % COLORES.length]!
    p.style.setProperty('--d', `${(3 + Math.random() * 2.5).toFixed(1)}s`)
    p.style.setProperty('--dl', `${(Math.random() * 1.2).toFixed(1)}s`)
    contenedor.appendChild(p)
  }

  const timer = setTimeout(() => contenedor.replaceChildren(), RETIRAR_A_LOS_MS)
  const cancelar = (): void => { clearTimeout(timer); contenedor.replaceChildren() }
  cancelaciones.set(contenedor, cancelar)
  return cancelar
}
