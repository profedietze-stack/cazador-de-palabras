import type { Medal } from '../types'

// Reglas de puntaje y medallas del modo de un jugador, sin DOM, para poder
// probarlas. Antes vivian dentro de GameEngine y tres cosas premiaban no saber:
//   - el Bronce no pedia ninguna precision (tocar todo llegaba al objetivo el
//     100 % de las veces en los niveles 1 y 2);
//   - el error restaba la mitad de lo que valia acertar;
//   - cada palabra valia su largo, asi que se premiaba lo largo y facil de
//     reconocer y se podia ignorar lo corto (el, a, me) sin ningun costo.

/** Por debajo de esto, llegar al objetivo no cuenta: tocar todo da 67 % / 60 %. */
export const PRECISION_MINIMA = 70

/** Puntos de una palabra correcta: fijos por nivel, no por largo. */
export function puntosPorAcierto(nivel: number): number {
  return Math.round(10 * (1 + (nivel - 1) * 0.5))
}

/** Un error cuesta lo mismo que un acierto: equivocarse no sale gratis. */
export function restaPorError(nivel: number): number {
  return puntosPorAcierto(nivel)
}

export function calcularPrecision(cazadas: number, erradas: number): number {
  const total = cazadas + erradas
  return total > 0 ? Math.round(cazadas / total * 100) : 100
}

export function calcularMedalla(
  pts: number, objetivo: number, precision: number, tiempoExtra: boolean,
): Medal | null {
  if (pts < objetivo) return null
  if (precision < PRECISION_MINIMA) return null
  if (tiempoExtra) return 'PLATA'
  if (precision >= 90) return 'ORO'
  if (precision >= 75) return 'PLATA'
  return 'BRONCE'
}

/**
 * Orden del ranking: medalla, después precisión, después tiempo, y recién al
 * final los puntos. Los puntos finales de una partida son casi siempre el
 * objetivo (perfecto 260 contra 253 de quien toca todo), así que ordenar por
 * ellos dejaba el podio librado al azar de quién cerró con una palabra larga.
 */
const RANGO_MEDALLA: Record<string, number> = { ORO: 0, PLATA: 1, BRONCE: 2 }
export function compararRanking(
  a: { medalla?: string | null; precision: number; tiempo?: number | null; pts: number },
  b: { medalla?: string | null; precision: number; tiempo?: number | null; pts: number },
): number {
  const ra = RANGO_MEDALLA[a.medalla ?? ''] ?? 3, rb = RANGO_MEDALLA[b.medalla ?? ''] ?? 3
  if (ra !== rb) return ra - rb
  if (a.precision !== b.precision) return b.precision - a.precision
  const ta = a.tiempo ?? Infinity, tb = b.tiempo ?? Infinity
  if (ta !== tb) return ta - tb
  return b.pts - a.pts
}

/** Texto para el alumno cuando llegó al objetivo pero no le alcanzó la precisión. */
export function motivoSinMedalla(pts: number, objetivo: number, precision: number): string | null {
  if (pts >= objetivo && precision < PRECISION_MINIMA) {
    return `Llegaste al objetivo, pero con ${precision}% de precisión. Necesitás al menos ${PRECISION_MINIMA}%: leé cada palabra antes de tocarla.`
  }
  return null
}
