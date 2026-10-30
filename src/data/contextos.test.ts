import { describe, it, expect } from 'vitest'
import { CONTEXTOS } from './contextos'
import { CATS } from './categories'
import { explicarError } from '../game/porQue'
import type { CategoryKey } from '../types'

const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const palabras = (frase: string): string[] => sinTildes(frase).split(/[^a-zñ]+/).filter(Boolean)

describe('contextos de palabras ambiguas', () => {
  const entradas = Object.entries(CONTEXTOS)

  it('cada palabra está en el banco del juego', () => {
    for (const [w] of entradas) {
      expect(Object.values(CATS).some(c => c.ok.includes(w)), w).toBe(true)
    }
  })

  it('cada palabra tiene al menos dos usos, de categorías distintas y válidas', () => {
    for (const [w, usos] of entradas) {
      expect(usos.length, w).toBeGreaterThanOrEqual(2)
      const cats = usos.map(u => u.cat)
      expect(new Set(cats).size, w).toBe(cats.length)
      for (const c of cats) expect(CATS[c as CategoryKey], `${w}: ${c}`).toBeDefined()
    }
  })

  it('la categoría que el juego da por buena es uno de los usos', () => {
    for (const [w, usos] of entradas) {
      const delJuego = (Object.keys(CATS) as CategoryKey[]).filter(k => CATS[k].ok.includes(w))
      expect(usos.some(u => delJuego.includes(u.cat)), w).toBe(true)
    }
  })

  it('cada oración contiene la palabra completa (sin contar tildes)', () => {
    for (const [w, usos] of entradas) {
      for (const u of usos) expect(palabras(u.frase), `${w}: ${u.frase}`).toContain(sinTildes(w))
    }
  })

  it('las oraciones son cortas y terminan en punto', () => {
    for (const [w, usos] of entradas) {
      for (const u of usos) {
        expect(u.frase.length, `${w}: ${u.frase}`).toBeLessThanOrEqual(60)
        expect(u.frase.endsWith('.'), `${w}: ${u.frase}`).toBe(true)
      }
    }
  })

  it('el «¿Por qué?» de una palabra ambigua muestra todos sus usos y cómo la cuenta el juego', () => {
    const t = explicarError('casa', 'verbos')
    expect(t).toContain('Vivo en una casa grande»')
    expect(t).toContain('Mi hermana se casa en mayo»')
    expect(t).toContain('En este juego cuenta como un sustantivo')
    expect(t).not.toContain('no es un verbo')
  })

  it('una palabra con dos categorías en el juego dice las dos', () => {
    const t = explicarError('bien', 'sustantivos')
    expect(t).toContain('cuenta como un adverbio y como una conjunción')
    expect(t).toContain('una conjunción en «Bien por mail')
  })
})
