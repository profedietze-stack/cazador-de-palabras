import { describe, it, expect } from 'vitest'
import { MUNDOS, mundoDe, PLACA_OSCURA, PLACA_CREMA, TEXTO_SOBRE_CREMA } from './mundos'
import { CATS } from './categories'
import { razonContraste, componer } from '../ui/contraste'
import type { CategoryKey } from '../types'

const HEX = /^#[0-9a-f]{6}$/i
const colores = (m: (typeof MUNDOS)[keyof typeof MUNDOS], cielo: 'noche' | 'dia'): string[] => {
  const p = m[cielo]
  return [p.cieloAlto, p.cieloBajo, ...p.colinas, p.acento, p.astro]
}

describe('los mundos son datos', () => {
  const ids = Object.keys(MUNDOS)

  it('hay un mundo por categoría más el de inicio, con el id igual a su clave', () => {
    expect(ids.sort()).toEqual([...Object.keys(CATS), 'inicio'].sort())
    for (const [k, m] of Object.entries(MUNDOS)) expect(m.id).toBe(k)
  })

  it('el nombre de cada mundo de categoría es el de la categoría', () => {
    for (const k of Object.keys(CATS) as CategoryKey[]) expect(MUNDOS[k].nombre).toBe(CATS[k].nombre)
  })

  it('todos los colores son #rrggbb, en noche y en día', () => {
    for (const m of Object.values(MUNDOS)) {
      for (const cielo of ['noche', 'dia'] as const) for (const c of colores(m, cielo)) expect(c, `${m.id} ${cielo}`).toMatch(HEX)
    }
  })

  it('mundoDe(null) es el de inicio y mundoDe(cat) el de la categoría', () => {
    expect(mundoDe(null).id).toBe('inicio')
    expect(mundoDe('verbos').id).toBe('verbos')
  })
})

describe('contraste medido en la noche (≥ 4,5:1)', () => {
  for (const m of Object.values(MUNDOS)) {
    it(`${m.id}: texto blanco sobre la placa oscura, sobre el cielo alto y el bajo`, () => {
      for (const cielo of [m.noche.cieloAlto, m.noche.cieloBajo]) {
        const placa = componer(PLACA_OSCURA.color, PLACA_OSCURA.alfa, cielo)
        expect(razonContraste('#ffffff', placa), `${m.id} sobre ${cielo}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('el texto marrón sobre la placa crema (igual en todos los mundos)', () => {
    expect(razonContraste(TEXTO_SOBRE_CREMA, PLACA_CREMA)).toBeGreaterThanOrEqual(4.5)
  })
})

// Las paletas de día se definen y miden en la Tarea 12.
describe.skip('contraste medido en el día (Tarea 12)', () => {
  it('pendiente', () => { expect(true).toBe(true) })
})
