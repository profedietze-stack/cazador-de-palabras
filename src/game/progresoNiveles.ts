import type { CategoryKey, GameRecord } from '../types'

/** Qué niveles (1 a 3) de una categoría el alumno ya superó con alguna medalla. */
export function estrellasDe(partidas: readonly GameRecord[], cat: CategoryKey): [boolean, boolean, boolean] {
  const e: [boolean, boolean, boolean] = [false, false, false]
  for (const p of partidas) {
    if (p.cat === cat && p.medalla && p.nivel >= 1 && p.nivel <= 3) e[p.nivel - 1] = true
  }
  return e
}
