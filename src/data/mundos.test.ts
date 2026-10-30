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

// Tema claro = el mismo mundo de día: cielo claro y sol. Se mide en los 10 mundos.
const SOL = '#ffd23f'
const LUNA = '#fff4c2'
// Contorno del título cartel (el amarillo sobre un cielo claro no se ve: lo separa el contorno).
const CONTORNO_TITULO = '#7a3f00'
// En la partida de día el cielo se atenúa con esta capa para que las palabras crema resalten.
const ATENUADO_PARTIDA = { color: '#0a1928', alfa: 0.42 } as const
const PALABRA_BG = '#fff6dc'

describe('contraste medido en el día (≥ 4,5:1 el texto, ≥ 3:1 lo gráfico)', () => {
  for (const m of Object.values(MUNDOS)) {
    describe(m.id, () => {
      it('texto blanco sobre la placa oscura, sobre el cielo alto y el bajo', () => {
        for (const cielo of [m.dia.cieloAlto, m.dia.cieloBajo]) {
          const placa = componer(PLACA_OSCURA.color, PLACA_OSCURA.alfa, cielo)
          expect(razonContraste('#ffffff', placa), `sobre ${cielo}`).toBeGreaterThanOrEqual(4.5)
        }
      })

      it('el texto suelto sobre el cielo (subtítulos, créditos) es marrón oscuro y se lee ≥ 4,5:1', () => {
        for (const cielo of [m.dia.cieloAlto, m.dia.cieloBajo]) {
          expect(razonContraste(TEXTO_SOBRE_CREMA, cielo), `sobre ${cielo}`).toBeGreaterThanOrEqual(4.5)
        }
      })

      it('el contorno del título se separa del cielo alto (≥ 3:1)', () => {
        expect(razonContraste(CONTORNO_TITULO, m.dia.cieloAlto)).toBeGreaterThanOrEqual(3)
      })

      it('la colina más cercana se distingue del cielo bajo (≥ 3:1): el paisaje se ve', () => {
        expect(razonContraste(m.dia.colinas[2], m.dia.cieloBajo)).toBeGreaterThanOrEqual(3)
      })

      it('la palabra crema resalta (≥ 3:1) contra el cielo atenuado de la partida', () => {
        for (const cielo of [m.dia.cieloAlto, m.dia.cieloBajo]) {
          const fondo = componer(ATENUADO_PARTIDA.color, ATENUADO_PARTIDA.alfa, cielo)
          expect(razonContraste(PALABRA_BG, fondo), `sobre ${cielo}`).toBeGreaterThanOrEqual(3)
        }
      })

      it('es distinto de la noche y trae sol de día y luna de noche', () => {
        expect(m.dia.cieloAlto).not.toBe(m.noche.cieloAlto)
        expect(m.dia.cieloBajo).not.toBe(m.noche.cieloBajo)
        expect(m.dia.astro).toBe(SOL)
        expect(m.noche.astro).toBe(LUNA)
      })
    })
  }

  it('el mundo de inicio de día es el de Sustantivos (selva), como de noche', () => {
    expect(MUNDOS.inicio.dia).toEqual(MUNDOS.sustantivos.dia)
  })
})
