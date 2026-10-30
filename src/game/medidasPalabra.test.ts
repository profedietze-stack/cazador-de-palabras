import { describe, it, expect } from 'vitest'
import { medidasPalabra } from './WordSpawner'

// Una palabra larga con el tamaño «Muy grande» en un celular de 360 px no puede salirse de la
// pantalla (el alumno no la podría tocar), ni achicarse por debajo del piso de legibilidad.

const LARGA = 15   // por ejemplo «responsabilidad»

describe('medidasPalabra', () => {
  it('con tamaño normal el tamaño sale entre 18 y 32 px, como siempre', () => {
    expect(medidasPalabra(360, 6, 1, 0, 0).size).toBe(18)
    expect(medidasPalabra(360, 6, 1, 1, 0).size).toBe(32)
  })

  it('con tamaño normal la posición no cambió: 20 px más una fracción del ancho libre', () => {
    expect(medidasPalabra(360, 6, 1, 0.5, 0).left).toBe(20)
    expect(medidasPalabra(360, 6, 1, 0.5, 1).left).toBe(20 + (360 - 160))
  })

  it('agrandadas, una palabra larga entra en 360 px en cualquier tirada (Review Focus 3)', () => {
    for (const mult of [1.25, 1.5]) {
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          const m = medidasPalabra(360, LARGA, mult, i / 20, j / 20)
          expect(m.size).toBeGreaterThanOrEqual(18)
          expect(m.left).toBeGreaterThanOrEqual(0)
          expect(m.left + m.ancho).toBeLessThanOrEqual(360)
        }
      }
    }
  })

  it('agrandadas, una palabra corta sí crece (hasta 48 px con «Muy grande»)', () => {
    expect(medidasPalabra(360, 4, 1.5, 1, 0).size).toBeCloseTo(48, 5)
  })

  it('agrandadas nunca bajan de 18 px, ni en una pantalla angosta', () => {
    expect(medidasPalabra(240, LARGA, 1.5, 0, 0).size).toBeGreaterThanOrEqual(18)
  })
})
