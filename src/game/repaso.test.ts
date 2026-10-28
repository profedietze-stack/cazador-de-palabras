import { describe, it, expect } from 'vitest'
import {
  leerRepaso, registrarFallo, registrarAcierto, palabrasPendientes, cantidadDominadas,
  priorizarRepaso, repasoVacio, claveRepaso, SEGUIDOS_PARA_DOMINAR,
} from './repaso'
import { explicarError } from './porQue'
import { CATS } from '../data/categories'

const T = '2026-10-28T12:00:00Z'

describe('repaso espaciado (3 cajas)', () => {
  it('un fallo mete la palabra en la caja 1', () => {
    const r = registrarFallo(repasoVacio(), 'adjetivos', 'rápidamente', T)
    expect(r.items[claveRepaso('adjetivos', 'rápidamente')]).toMatchObject({ fallos: 1, caja: 1, seguidos: 0 })
    expect(palabrasPendientes(r, 'adjetivos')).toEqual(['rápidamente'])
  })

  it('dejarla pasar la sube de caja y a la tercera queda dominada', () => {
    let r = registrarFallo(repasoVacio(), 'verbos', 'casa', T)
    r = registrarAcierto(r, 'verbos', 'casa', T)
    expect(r.items['verbos|casa']!.caja).toBe(2)
    for (let i = 1; i < SEGUIDOS_PARA_DOMINAR; i++) r = registrarAcierto(r, 'verbos', 'casa', T)
    expect(r.items['verbos|casa']!.caja).toBe(3)
    expect(palabrasPendientes(r, 'verbos')).toEqual([])
    expect(cantidadDominadas(r)).toBe(1)
  })

  it('tocarla de nuevo la devuelve a la caja 1 y suma el fallo', () => {
    let r = registrarFallo(repasoVacio(), 'verbos', 'casa', T)
    r = registrarAcierto(r, 'verbos', 'casa', T)
    r = registrarFallo(r, 'verbos', 'casa', T)
    expect(r.items['verbos|casa']).toMatchObject({ fallos: 2, caja: 1, seguidos: 0 })
  })

  it('dejar pasar una palabra que no estaba en el mazo no la agrega', () => {
    const r = registrarAcierto(repasoVacio(), 'verbos', 'nube', T)
    expect(r.items).toEqual({})
  })

  it('no muta el estado que recibe', () => {
    const a = registrarFallo(repasoVacio(), 'verbos', 'casa', T)
    const copia = JSON.stringify(a)
    registrarAcierto(a, 'verbos', 'casa', T)
    registrarFallo(a, 'verbos', 'casa', T)
    expect(JSON.stringify(a)).toBe(copia)
  })

  it('el mazo es por categoría: una palabra fallada en verbos no sale en adjetivos', () => {
    const r = registrarFallo(repasoVacio(), 'verbos', 'casa', T)
    expect(palabrasPendientes(r, 'adjetivos')).toEqual([])
  })

  it('los pendientes salen con la caja 1 primero y los más fallados antes', () => {
    let r = registrarFallo(repasoVacio(), 'adverbios', 'a', T)
    r = registrarFallo(r, 'adverbios', 'b', T); r = registrarFallo(r, 'adverbios', 'b', T)
    r = registrarFallo(r, 'adverbios', 'c', T); r = registrarAcierto(r, 'adverbios', 'c', T)
    expect(palabrasPendientes(r, 'adverbios')).toEqual(['b', 'a', 'c'])
  })

  it('priorizarRepaso pone los pendientes al frente sin inventar palabras ni perder ninguna', () => {
    const pool = ['uno', 'dos', 'tres', 'cuatro', 'cinco']
    const r = registrarFallo(registrarFallo(repasoVacio(), 'x', 'cuatro', T), 'x', 'fuera', T)
    const out = priorizarRepaso(pool, palabrasPendientes(r, 'x'), r, 'x', 2, () => 0)
    expect(out[0]).toBe('cuatro')
    expect([...out].sort()).toEqual([...pool].sort())   // la misma lista, reordenada
    expect(out).not.toContain('fuera')
  })

  it('sin pendientes devuelve el pool tal cual', () => {
    expect(priorizarRepaso(['a', 'b'], [], repasoVacio(), 'x', 3)).toEqual(['a', 'b'])
  })
})

describe('guardado: se lee campo por campo (CLAUDE.md §14)', () => {
  const casos: Array<[string, string | null]> = [
    ['null', null], ['texto', 'hola'], ['json con otro tipo', '5'], ['array', '[]'],
    ['items como numero', '{"v":1,"items":5}'], ['items array', '{"v":1,"items":[]}'],
    ['version vieja', '{"v":0,"items":{"a|b":{"caja":1}}}'], ['null literal', 'null'],
  ]
  for (const [nombre, raw] of casos) {
    it(`${nombre} cae en vacío sin lanzar`, () => {
      expect(leerRepaso(raw).items).toEqual({})
    })
  }

  it('un campo con el tipo cambiado se corrige o se descarta, no se hereda', () => {
    const r = leerRepaso(JSON.stringify({
      v: 1,
      items: {
        'verbos|casa': { fallos: 'muchos', seguidos: -4, caja: 9, ultima: 5 },
        'sinbarra': { fallos: 1, caja: 1 },
        'verbos|nube': 'x',
      },
    }))
    expect(Object.keys(r.items)).toEqual(['verbos|casa'])
    expect(r.items['verbos|casa']).toEqual({ fallos: 1, seguidos: 0, caja: 1, ultima: '' })
  })

  it('un guardado bueno vuelve igual', () => {
    const r = registrarFallo(repasoVacio(), 'verbos', 'casa', T)
    expect(leerRepaso(JSON.stringify(r))).toEqual(r)
  })
})

describe('¿Por qué?', () => {
  it('dice qué es la palabra y cómo reconocerlo', () => {
    const t = explicarError('rápidamente', 'sustantivos')
    expect(t).toContain('no es un sustantivo')
    expect(t).toContain('es un adverbio')
    expect(t).toMatch(/cómo, dónde, cuándo/)
  })

  it('los determinantes se explican como tales', () => {
    expect(explicarError('mi', 'pronombres')).toContain('determinante')
    expect(explicarError('tu', 'pronombres')).toContain('«tú», con tilde')
  })

  it('las interjecciones se muestran sin signos', () => {
    expect(explicarError('¡ay!', 'verbos')).toContain('«ay»')
  })

  it('todo distractor de todo el banco tiene explicación que nombra su categoría real o es especial', () => {
    for (const [k, c] of Object.entries(CATS)) {
      for (const w of c.mal) {
        const t = explicarError(w, k as keyof typeof CATS)
        expect(t.length, `${k}/${w}`).toBeGreaterThan(20)
        expect(t, `${k}/${w}`).not.toContain('undefined')
      }
    }
  })
})
