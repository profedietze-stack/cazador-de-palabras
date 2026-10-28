import { describe, it, expect } from 'vitest'
import { resumirSala, type RegistroErrores } from './panelDocente'

const r = (jugador: string, cat: string, cazadas: number, erradas: number, fallos: Record<string, number> = {}): RegistroErrores =>
  ({ jugador, cat, nivel: 1, cazadas, erradas, fallos })

describe('panel del docente', () => {
  const registros = [
    r('Ana', 'adverbios', 20, 2, { rápido: 1, mucho: 1 }),
    r('Ana', 'adverbios', 18, 3, { rápido: 2 }),
    r('Beto', 'adverbios', 8, 12, { rápido: 4, bien: 3, mucho: 2, nada: 1 }),
    r('Beto', 'verbos', 5, 10, { casa: 5 }),
    r('Beto', 'adverbios', 6, 9, { rápido: 2 }),
    r('Caro', 'verbos', 25, 0),
  ]
  const p = resumirSala(registros)

  it('cuenta los intentos, incluidos los que no tuvieron medalla', () => {
    expect(p.intentos).toBe(6)
  })

  it('precisión por categoría, la más floja primero', () => {
    expect(p.porCategoria.map(c => c.cat)).toEqual(['adverbios', 'verbos'])
    expect(p.porCategoria[0]!.precision).toBe(Math.round((20 + 18 + 8 + 6) / (20 + 18 + 8 + 6 + 2 + 3 + 12 + 9) * 100))
    expect(p.porCategoria[1]!.intentos).toBe(2)
  })

  it('palabras más falladas de la clase, con cuántos alumnos las fallaron', () => {
    expect(p.palabras[0]).toEqual({ palabra: 'rápido', cat: 'adverbios', veces: 9, alumnos: 2 })
    expect(p.palabras.map(x => x.palabra)).toContain('casa')
    expect(p.palabras.length).toBeLessThanOrEqual(10)
  })

  it('marca como «necesita ayuda» solo a quien tuvo ≥ 2 intentos por debajo de 60 %', () => {
    const beto = p.alumnos.find(a => a.jugador === 'Beto')!
    expect(beto.necesitaAyuda).toBe(true)
    expect(p.alumnos.find(a => a.jugador === 'Ana')!.necesitaAyuda).toBe(false)
    expect(p.alumnos.find(a => a.jugador === 'Caro')!.necesitaAyuda).toBe(false)
  })

  it('quien necesita ayuda sale primero, y cada alumno trae sus 3 palabras más falladas', () => {
    expect(p.alumnos[0]!.jugador).toBe('Beto')
    expect(p.alumnos[0]!.palabras).toEqual(['rápido', 'casa', 'bien'])
  })

  it('un solo mal intento no alcanza para marcar a nadie', () => {
    const q = resumirSala([r('Dani', 'verbos', 2, 10, { casa: 3 })])
    expect(q.alumnos[0]!.necesitaAyuda).toBe(false)
  })

  it('sin registros devuelve un panel vacío, no revienta', () => {
    expect(resumirSala([])).toEqual({ intentos: 0, porCategoria: [], palabras: [], alumnos: [] })
  })

  it('tolera datos con tipos cambiados (lo escribió un cliente)', () => {
    const sucio = [
      { jugador: 'X', cat: 'verbos', nivel: 1, cazadas: 'mucho', erradas: null, fallos: 'no' },
      { jugador: 'Y', cat: 'verbos', nivel: 1, cazadas: 3, erradas: 1, fallos: { a: 'x', b: -2, c: 2 } },
    ] as unknown as RegistroErrores[]
    const q = resumirSala(sucio)
    expect(q.palabras).toEqual([{ palabra: 'c', cat: 'verbos', veces: 2, alumnos: 1 }])
  })
})
