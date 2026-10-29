import { describe, it, expect } from 'vitest'
import { validarDatos, validarPartida, validarLayout } from './validarDatos'

// Los diez casos de datos corruptos de la auditoría (ING-2): ninguno puede dejar
// una forma que reviente `.map`, `.reduce`, `.push` o `.forEach` en las pantallas.

const buena = { cat: 'verbos', catNombre: 'Verbos', nivel: 2, pts: 350, medalla: 'ORO', precision: 95, cazadas: 40, erradas: 2, tiempoUsado: 80, combosHechos: 3, fecha: '2026-10-28' }

describe('validarDatos: tipos cambiados', () => {
  const casos: Array<[string, unknown]> = [
    ['partidas es texto', { partidas: 'x' }],
    ['partidas es número', { partidas: 5 }],
    ['partidas con null adentro', { partidas: [null, 3, 'x', buena] }],
    ['logros es número', { logros: 5 }],
    ['logros con basura', { logros: [{ id: 'a' }, null, 7] }],
    ['null literal', null],
    ['número suelto', 42],
    ['arreglo', []],
    ['tituloAnterior es objeto', { tituloAnterior: { a: 1 } }],
    ['campos desconocidos', { partidas: [], __proto__x: 1, otro: [1, 2] }],
  ]
  for (const [nombre, entrada] of casos) {
    it(`${nombre}: da algo con la forma esperada y no lanza`, () => {
      const d = validarDatos(entrada)
      expect(Array.isArray(d.partidas) || d.partidas === undefined).toBe(true)
      expect(Array.isArray(d.logros) || d.logros === undefined).toBe(true)
      expect(d.tituloAnterior === undefined || typeof d.tituloAnterior === 'string').toBe(true)
      // lo que usan las pantallas
      ;(d.partidas ?? []).map(p => p.pts).reduce((a, b) => a + b, 0)
      ;(d.logros ?? []).forEach(l => l.id.toFixed())
    })
  }

  it('conserva las partidas válidas y descarta las rotas', () => {
    const d = validarDatos({ partidas: [null, buena, { cat: 'inventada', nivel: 1, pts: 1, precision: 1, cazadas: 1, erradas: 0 }, { ...buena, pts: 'mucho' }] })
    expect(d.partidas).toHaveLength(1)
    expect(d.partidas![0]).toMatchObject({ cat: 'verbos', pts: 350, medalla: 'ORO' })
  })

  it('una medalla inválida cae en null; una precisión fuera de rango descarta la partida', () => {
    expect(validarPartida({ ...buena, medalla: 'DIAMANTE' })!.medalla).toBeNull()
    expect(validarPartida({ ...buena, precision: 250 })).toBeNull()
    expect(validarPartida({ ...buena, nivel: 9 })).toBeNull()
  })

  it('un guardado bueno vuelve igual', () => {
    const d = validarDatos({ partidas: [buena], logros: [{ id: 3, fecha: 'x' }], tituloAnterior: 'Cazador Novato' })
    expect(d.partidas![0]).toEqual(buena)
    expect(d.logros).toEqual([{ id: 3, fecha: 'x' }])
    expect(d.tituloAnterior).toBe('Cazador Novato')
  })

  it('no acumula sin tope', () => {
    const muchas = Array.from({ length: 2000 }, () => buena)
    expect(validarDatos({ partidas: muchas }).partidas!.length).toBeLessThanOrEqual(500)
  })
})

describe('validarLayout (stickers)', () => {
  it('solo acepta una lista de objetos', () => {
    expect(validarLayout({ a: 1 })).toBeNull()
    expect(validarLayout('x')).toBeNull()
    expect(validarLayout(null)).toBeNull()
    expect(validarLayout([1, null, { x: 1 }, 'y'])).toEqual([{ x: 1 }])
  })
})
