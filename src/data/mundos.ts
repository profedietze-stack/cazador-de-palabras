import type { CategoryKey } from '../types'
import { CATS } from './categories'

// Cada categoría es un «mundo» con su paisaje y su paleta (rediseño «Aventura»). Un mundo
// es un dato: cambiar el paisaje de uno no toca las pantallas, que solo leen estas paletas
// (ver ui/aplicarMundo.ts y ui/paisaje.ts).
//
// Valores de la noche: maqueta aprobada `docs/superpowers/specs/rediseno-visual-aventura/
// aventura-pantallas.html`. El día (tema claro) lo define y mide la Tarea 12.

export type MundoId = CategoryKey | 'inicio'

export interface Paleta {
  cieloAlto: string
  cieloBajo: string
  /** De la colina más lejana a la más cercana. */
  colinas: [string, string, string]
  acento: string
  /** Luna de noche, sol de día. */
  astro: string
}

export interface Mundo {
  id: MundoId
  nombre: string
  noche: Paleta
  dia: Paleta
}

/** Placas de interfaz, iguales en todos los mundos: oscura translúcida (texto blanco) y crema (texto marrón). */
export const PLACA_OSCURA = { color: '#08282c', alfa: 0.72 } as const
export const PLACA_CREMA = '#fff6dc'
export const TEXTO_SOBRE_CREMA = '#3a2200'

const LUNA = '#fff4c2'

const noche = (cieloAlto: string, cieloBajo: string, colinas: [string, string, string], acento = '#ffb347'): Paleta =>
  ({ cieloAlto, cieloBajo, colinas, acento, astro: LUNA })

const selva = noche('#0e3b43', '#1c6b5f', ['#14564f', '#1d7a5f', '#2a9a6a'])

// TODO Tarea 12: paleta de día propia de cada mundo (por ahora copia de la noche).
const mundo = (id: MundoId, nombre: string, n: Paleta): Mundo => ({ id, nombre, noche: n, dia: { ...n } })

export const MUNDOS: Record<MundoId, Mundo> = {
  inicio:         mundo('inicio', 'Inicio', selva),
  sustantivos:    mundo('sustantivos', CATS.sustantivos.nombre, selva),
  adjetivos:      mundo('adjetivos', CATS.adjetivos.nombre, noche('#5b2a6e', '#e0568a', ['#6b2f6e', '#a63d7a', '#d45a8a'], '#ffd23f')),
  verbos:         mundo('verbos', CATS.verbos.nombre, noche('#123a7a', '#2e6fd6', ['#1d4fa0', '#2a66c4', '#4a8be0'])),
  adverbios:      mundo('adverbios', CATS.adverbios.nombre, noche('#0b5c6b', '#18a5b5', ['#0f7a86', '#1aa3a8', '#e8d28a'])),
  articulos:      mundo('articulos', CATS.articulos.nombre, noche('#2a2470', '#6d5dfc', ['#3b3590', '#5a4fd0', '#7c70f0'])),
  pronombres:     mundo('pronombres', CATS.pronombres.nombre, noche('#6e1b4a', '#d23d85', ['#7d2456', '#a83272', '#d65b97'], '#ffd23f')),
  preposiciones:  mundo('preposiciones', CATS.preposiciones.nombre, noche('#1f6b3a', '#52b788', ['#2c8a4e', '#3fa468', '#74cf9b'])),
  conjunciones:   mundo('conjunciones', CATS.conjunciones.nombre, noche('#5a1409', '#f4511e', ['#7a1f0c', '#a8310f', '#e0561f'], '#ffe66d')),
  interjecciones: mundo('interjecciones', CATS.interjecciones.nombre, noche('#15532a', '#c0d62d', ['#1f7a3d', '#59a82f', '#c9dd45'], '#ffe66d')),
}

/** El mundo de una categoría; sin categoría (menú, ajustes, ranking…) es el de inicio. */
export function mundoDe(cat: CategoryKey | null): Mundo {
  return MUNDOS[cat ?? 'inicio']
}
