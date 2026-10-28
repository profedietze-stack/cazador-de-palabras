import { describe, it, expect } from 'vitest'
import { CATS } from './categories'

// Un error de clasificación enseña al revés: el chico que sabe pierde puntos y
// el que no sabe aprende que `sea` es una conjunción. El criterio de cada caso
// sale de la auditoría del 28-oct-2026 (RAE/NGLE + gramática escolar).

const cats = Object.entries(CATS)

describe('banco de palabras', () => {
  for (const [k, c] of cats) {
    it(`${k}: sin repetidos en ok ni en mal`, () => {
      expect(new Set(c.ok).size, 'ok').toBe(c.ok.length)
      expect(new Set(c.mal).size, 'mal').toBe(c.mal.length)
    })
    it(`${k}: ninguna palabra es a la vez correcta e incorrecta`, () => {
      expect(c.mal.filter(w => c.ok.includes(w))).toEqual([])
    })
    it(`${k}: los ejemplos de la teoría son palabras correctas`, () => {
      expect(c.ejem.filter(w => !c.ok.includes(w))).toEqual([])
    })
  }
})

describe('clasificaciones corregidas (no deben volver)', () => {
  const noOk: Record<string, string[]> = {
    // determinantes/adjetivos, no pronombres (contradicen «reemplazan al sustantivo»)
    pronombres: ['mi', 'tu', 'su', 'nuestro', 'vuestro', 'cada', 'propio'],
    // adverbios, verbo ser o arcaísmos
    conjunciones: ['donde', 'además', 'tampoco', 'tanto', 'sea', 'ora', 'con que'],
  }
  for (const [k, palabras] of Object.entries(noOk)) {
    it(`${k}.ok no incluye ${palabras.join(', ')}`, () => {
      expect(palabras.filter(w => CATS[k as keyof typeof CATS].ok.includes(w))).toEqual([])
    })
  }

  const noMal: Record<string, string[]> = {
    pronombres: ['la'],                              // `la vi`: pronombre átono, igual que `les`/`me`/`te`
    sustantivos: ['rojo', 'azul', 'brillante', 'oscuro'], // `el rojo`, `un brillante`
    verbos: ['casa'],                                // forma de *casar*
  }
  for (const [k, palabras] of Object.entries(noMal)) {
    it(`${k}.mal no incluye ${palabras.join(', ')}`, () => {
      expect(palabras.filter(w => CATS[k as keyof typeof CATS].mal.includes(w))).toEqual([])
    })
  }

  it('el voseo está en Pronombres y `conque` se escribe junto', () => {
    for (const w of ['vos', 'usted', 'ustedes']) expect(CATS.pronombres.ok).toContain(w)
    expect(CATS.conjunciones.ok).toContain('conque')
  })
})
