import { G } from '../game/state'
import { mundoDe, type Mundo } from '../data/mundos'
import { ajustes, alCambiarAjustes } from '../storage/ajustes'
import { cieloActual } from './aplicarAjustes'
import { aplicarMundo } from './aplicarMundo'
import { montarPaisaje, opcionesDesdeAjustes } from './paisaje'

// El fondo de cada pantalla: el paisaje del mundo que le toca, dentro del `.fondo-mundo` de la
// pantalla (las que todavía no lo tienen conservan su fondo anterior).

/** Pantallas que se pintan con el mundo de la categoría en juego; el resto usa el de inicio. */
const DE_CATEGORIA = new Set(['preNivel', 'gameScreen', 'resultadoScreen'])

export function mundoDePantalla(id: string): Mundo {
  return mundoDe(DE_CATEGORIA.has(id) ? G.cat : null)
}

function sistemaReduce(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

let desmontarActual: (() => void) | null = null

/** Monta el paisaje en la pantalla indicada y desmonta el de la anterior. */
export function actualizarFondo(pantalla: HTMLElement): void {
  desmontarActual?.()
  desmontarActual = null
  const cont = pantalla.querySelector<HTMLElement>('.fondo-mundo')
  if (!cont) return
  const cielo = cieloActual()
  const mundo = mundoDePantalla(pantalla.id)
  aplicarMundo(mundo, cielo)
  desmontarActual = montarPaisaje(cont, mundo, opcionesDesdeAjustes(ajustes(), sistemaReduce(), cielo))
}

/** Rehace el fondo de la pantalla activa cuando cambia un ajuste (tema, fondo, movimiento, contraste). */
export function iniciarFondoReactivo(): void {
  alCambiarAjustes(() => {
    const activa = document.querySelector<HTMLElement>('.screen.active')
    if (activa) actualizarFondo(activa)
  })
}
