import { describe, it, expect } from 'vitest'
import {
  PRECISION_MINIMA, compararRanking, calcularMedalla, calcularPrecision, puntosPorAcierto, restaPorError, motivoSinMedalla,
} from './reglas'

// Auditoría 28-oct-2026 (DID-2): tocar TODO llegaba al objetivo el 100 % de las
// veces en los niveles 1 y 2 y daba Bronce, porque el Bronce no pedía precisión.
// Proporción real de correctas por ola (WordSpawner): round(3·.7)=2/3,
// round(5·.5)=3/5, round(7·.3)=2/7.
const OLAS = [
  { nivel: 1, cantidad: 3, pcCorr: 0.7 },
  { nivel: 2, cantidad: 5, pcCorr: 0.5 },
  { nivel: 3, cantidad: 7, pcCorr: 0.3 },
]

describe('medalla', () => {
  for (const { nivel, cantidad, pcCorr } of OLAS) {
    it(`tocar todo en el nivel ${nivel} no da medalla, aunque llegue al objetivo`, () => {
      const correctas = Math.round(cantidad * pcCorr)
      const precision = calcularPrecision(correctas * 100, (cantidad - correctas) * 100)
      expect(precision).toBeLessThan(PRECISION_MINIMA)
      expect(calcularMedalla(9999, 250, precision, false)).toBeNull()
      expect(calcularMedalla(9999, 250, precision, true)).toBeNull()
    })
  }

  it('escalones de precisión', () => {
    expect(calcularMedalla(300, 250, 95, false)).toBe('ORO')
    expect(calcularMedalla(300, 250, 90, false)).toBe('ORO')
    expect(calcularMedalla(300, 250, 80, false)).toBe('PLATA')
    expect(calcularMedalla(300, 250, 72, false)).toBe('BRONCE')
    expect(calcularMedalla(300, 250, 69, false)).toBeNull()
  })

  it('el tiempo extra baja a Plata, pero también exige precisión', () => {
    expect(calcularMedalla(300, 250, 99, true)).toBe('PLATA')
    expect(calcularMedalla(300, 250, 60, true)).toBeNull()
  })

  it('sin objetivo no hay medalla', () => {
    expect(calcularMedalla(249, 250, 100, false)).toBeNull()
  })

  it('explica por qué faltó la medalla solo cuando llegó al objetivo', () => {
    expect(motivoSinMedalla(300, 250, 60)).toContain('70%')
    expect(motivoSinMedalla(100, 250, 60)).toBeNull()
    expect(motivoSinMedalla(300, 250, 90)).toBeNull()
  })
})

describe('puntos', () => {
  it('cada acierto vale lo mismo según el nivel, sin depender del largo', () => {
    expect([1, 2, 3].map(puntosPorAcierto)).toEqual([10, 15, 20])
  })

  it('equivocarse resta lo que vale acertar', () => {
    for (const n of [1, 2, 3]) expect(restaPorError(n)).toBe(puntosPorAcierto(n))
  })

  it('tocar todo en el nivel 3 es negativo: las olas traen más incorrectas que correctas', () => {
    const { nivel, cantidad, pcCorr } = OLAS[2]!
    const c = Math.round(cantidad * pcCorr)
    expect(c * puntosPorAcierto(nivel) - (cantidad - c) * restaPorError(nivel)).toBeLessThan(0)
  })
})

describe('orden del ranking', () => {
  const f = (medalla: string | null, precision: number, tiempo: number, pts: number) => ({ medalla, precision, tiempo, pts })

  it('primero la medalla, después la precisión, después el tiempo, al final los puntos', () => {
    const filas = [
      f('BRONCE', 99, 10, 900), f('ORO', 90, 80, 260), f('ORO', 97, 90, 253),
      f('ORO', 97, 40, 250), f(null, 100, 5, 999), f('PLATA', 80, 60, 300),
    ]
    expect([...filas].sort(compararRanking).map(x => `${x.medalla}-${x.precision}-${x.tiempo}`)).toEqual([
      'ORO-97-40', 'ORO-97-90', 'ORO-90-80', 'PLATA-80-60', 'BRONCE-99-10', 'null-100-5',
    ])
  })

  it('el puntaje ya no manda: 253 con 97 % le gana a 260 con 90 %', () => {
    expect(compararRanking(f('ORO', 97, 50, 253), f('ORO', 90, 50, 260))).toBeLessThan(0)
  })
})

describe('el motor usa estas reglas y no copias', () => {
  it('GameEngine y WordSpawner importan reglas.ts', async () => {
    const { readFileSync } = await import('node:fs')
    const motor = readFileSync('src/game/GameEngine.ts', 'utf8')
    const spawner = readFileSync('src/game/WordSpawner.ts', 'utf8')
    expect(motor).toContain('calcularMedalla(')
    expect(motor).not.toMatch(/precision\s*>=\s*75/)
    expect(motor).not.toMatch(/Math\.floor\(ptsBase\s*\/\s*2\)/)
    expect(spawner).toContain('puntosPorAcierto(')
  })
})
