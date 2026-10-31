import type { CategoryKey } from '../types'
import { CATS } from './categories'

// Cada categoría es un «mundo» con su paisaje y su paleta (rediseño «Aventura»). Un mundo
// es un dato: cambiar el paisaje de uno no toca las pantallas, que solo leen estas paletas
// (ver ui/aplicarMundo.ts y ui/paisaje.ts).
//
// Valores de la noche: maqueta aprobada `docs/superpowers/specs/rediseno-visual-aventura/
// aventura-pantallas.html`. El día (tema claro) es el mismo mundo con cielo claro y sol.

export type MundoId = CategoryKey | 'inicio'

export interface Paleta {
  cieloAlto: string
  cieloBajo: string
  /** De la colina más lejana a la más cercana. */
  colinas: [string, string, string]
  acento: string
  /** Laguna al pie de las montañas (la franja de abajo del paisaje). */
  agua: string
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
const SOL = '#ffd23f'
const ACENTO_NOCHE = '#ffb347'
const ACENTO_DIA = '#e8740a'

const canal = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16)
/** Mezcla dos colores #rrggbb: `t` = 0 deja `a` y 1 deja `b`. */
const mezclar = (a: string, b: string, t: number): string =>
  '#' + [1, 3, 5].map(i => Math.round(canal(a, i) * (1 - t) + canal(b, i) * t).toString(16).padStart(2, '0')).join('')

// El agua toma el tono del cielo bajo (así acompaña a cada mundo) pero tirando a azul, para que
// se lea como agua y no como otra colina. Los tests miden que se distinga de las colinas y del cielo.
const aguaDeNoche = (cieloBajo: string): string => mezclar(cieloBajo, '#0a3c5a', 0.78)
const aguaDeDia = (cieloBajo: string): string => mezclar(cieloBajo, '#2a9fd0', 0.72)

const noche = (cieloAlto: string, cieloBajo: string, colinas: [string, string, string], acento = ACENTO_NOCHE): Paleta =>
  ({ cieloAlto, cieloBajo, colinas, acento, agua: aguaDeNoche(cieloBajo), astro: LUNA })

// De día: el mismo mundo con cielo claro y sol. Las colinas más cercanas son más oscuras que el
// cielo bajo (el paisaje se ve) y todo está medido en src/data/mundos.test.ts.
const dia = (cieloAlto: string, cieloBajo: string, colinas: [string, string, string]): Paleta =>
  ({ cieloAlto, cieloBajo, colinas, acento: ACENTO_DIA, agua: aguaDeDia(cieloBajo), astro: SOL })

const mundo = (id: MundoId, nombre: string, n: Paleta, d: Paleta): Mundo => ({ id, nombre, noche: n, dia: d })

const selvaNoche = noche('#0e3b43', '#1c6b5f', ['#14564f', '#1d7a5f', '#2a9a6a'])
const selvaDia = dia('#4fb6d6', '#b3e3cd', ['#5fb98f', '#3fa070', '#1f7a48'])

export const MUNDOS: Record<MundoId, Mundo> = {
  inicio:         mundo('inicio', 'Inicio', selvaNoche, selvaDia),
  sustantivos:    mundo('sustantivos', CATS.sustantivos.nombre, selvaNoche, selvaDia),
  adjetivos:      mundo('adjetivos', CATS.adjetivos.nombre,
    noche('#5b2a6e', '#e0568a', ['#6b2f6e', '#a63d7a', '#d45a8a'], '#ffd23f'),
    dia('#ff9ec8', '#ffd9ea', ['#e58fb5', '#d46fa0', '#a83a76'])),
  verbos:         mundo('verbos', CATS.verbos.nombre,
    noche('#123a7a', '#2e6fd6', ['#1d4fa0', '#2a66c4', '#4a8be0']),
    dia('#5aa9ff', '#c8e4ff', ['#4a8fd8', '#3577c0', '#1f5a9e'])),
  adverbios:      mundo('adverbios', CATS.adverbios.nombre,
    noche('#0b5c6b', '#18a5b5', ['#0f7a86', '#1aa3a8', '#e8d28a']),
    dia('#5fd0e8', '#b4ecf5', ['#7fd8e0', '#2fb5c8', '#0f7f94'])),
  articulos:      mundo('articulos', CATS.articulos.nombre,
    noche('#2a2470', '#6d5dfc', ['#3b3590', '#5a4fd0', '#7c70f0']),
    dia('#a899ff', '#e2dcff', ['#8a78ef', '#7260d8', '#4a38b0'])),
  pronombres:     mundo('pronombres', CATS.pronombres.nombre,
    noche('#6e1b4a', '#d23d85', ['#7d2456', '#a83272', '#d65b97'], '#ffd23f'),
    dia('#ff93c1', '#ffd9ea', ['#e56aa0', '#d14d88', '#a02a66'])),
  preposiciones:  mundo('preposiciones', CATS.preposiciones.nombre,
    noche('#1f6b3a', '#52b788', ['#2c8a4e', '#3fa468', '#74cf9b']),
    dia('#86dc90', '#c6ecb8', ['#6bc27a', '#4eab62', '#2f8645'])),
  conjunciones:   mundo('conjunciones', CATS.conjunciones.nombre,
    noche('#5a1409', '#f4511e', ['#7a1f0c', '#a8310f', '#e0561f'], '#ffe66d'),
    dia('#ffa273', '#ffe0c4', ['#e8704a', '#d4562f', '#a8381a'])),
  interjecciones: mundo('interjecciones', CATS.interjecciones.nombre,
    noche('#15532a', '#c0d62d', ['#1f7a3d', '#59a82f', '#c9dd45'], '#ffe66d'),
    dia('#c8dc44', '#d9e878', ['#8fc83a', '#6fb02a', '#4c8a1f'])),
}

/** El mundo de una categoría; sin categoría (menú, ajustes, ranking…) es el de inicio. */
export function mundoDe(cat: CategoryKey | null): Mundo {
  return MUNDOS[cat ?? 'inicio']
}
