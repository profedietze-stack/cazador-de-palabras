import { describe, it, expect } from 'vitest'
import { estrellasDe } from './progresoNiveles'
import type { GameRecord } from '../types'

const p = (cat: GameRecord['cat'], nivel: number, medalla: GameRecord['medalla']): GameRecord => ({
  cat, catNombre: cat, nivel, pts: 300, medalla, precision: 90, cazadas: 20, erradas: 2, tiempoUsado: 60, combosHechos: 1, fecha: '2026-10-30',
})

describe('estrellasDe: qué niveles de una categoría el alumno ya superó con medalla', () => {
  it('sin partidas, ninguna estrella', () => {
    expect(estrellasDe([], 'verbos')).toEqual([false, false, false])
  })
  it('una estrella por cada nivel con alguna medalla (oro, plata o bronce)', () => {
    const partidas = [p('verbos', 1, 'BRONCE'), p('verbos', 3, 'ORO')]
    expect(estrellasDe(partidas, 'verbos')).toEqual([true, false, true])
  })
  it('llegar al objetivo sin medalla (precisión baja) no cuenta como nivel superado', () => {
    expect(estrellasDe([p('verbos', 2, null)], 'verbos')).toEqual([false, false, false])
  })
  it('solo cuentan las partidas de esa categoría', () => {
    expect(estrellasDe([p('adjetivos', 1, 'ORO')], 'verbos')).toEqual([false, false, false])
  })
  it('ignora niveles fuera de 1 a 3 (un guardado editado no rompe nada)', () => {
    expect(estrellasDe([p('verbos', 0, 'ORO'), p('verbos', 9, 'ORO'), p('verbos', 2, 'PLATA')], 'verbos')).toEqual([false, true, false])
  })
})
