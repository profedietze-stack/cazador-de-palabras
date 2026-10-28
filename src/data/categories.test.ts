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

// ── Calidad de los distractores (auditoría 28-oct-2026: DID-3, DID-6) ────────
// Había 47 palabras distintas usadas como distractor en todo el juego: tocar
// «lo que no está en ese vocabulario» daba Oro con 100 % de precisión sin saber
// gramática. Y el largo / la forma delataban la categoría.

const todasLasCorrectas = new Map<string, string[]>()
for (const [k, c] of cats) for (const w of c.ok) todasLasCorrectas.set(w, [...(todasLasCorrectas.get(w) ?? []), k])

// Determinantes y un adverbio relativo que se enseñan a propósito como «no es de
// esta categoría» (mi/tu/su acompañan al sustantivo, no lo reemplazan). Son
// pocos: la lista es cerrada para que un distractor nuevo no sea «el que nunca
// es correcto» sin que alguien lo decida.
const A_PROPOSITO = new Set(['mi', 'tu', 'su', 'cada', 'donde'])

describe('distractores', () => {
  for (const [k, c] of cats) {
    it(`${k}: tiene suficientes (≥ 30) y malCerca ⊂ mal`, () => {
      expect(c.mal.length).toBeGreaterThanOrEqual(30)
      expect((c.malCerca ?? []).filter(w => !c.mal.includes(w))).toEqual([])
    })

    it(`${k}: todo distractor es correcto en alguna OTRA categoría (no hay vocabulario «que nunca es correcto»)`, () => {
      expect(c.mal.filter(w => !todasLasCorrectas.has(w) && !A_PROPOSITO.has(w))).toEqual([])
    })

    it(`${k}: ningún distractor es correcto en esta categoría ni en dos a la vez`, () => {
      for (const w of c.mal) {
        const donde = todasLasCorrectas.get(w) ?? []
        expect(donde.includes(k), `${w} es correcta en ${k}`).toBe(false)
        if (!A_PROPOSITO.has(w)) expect(donde.length, `${w} es correcta en ${donde.join(',')}`).toBe(1)
      }
    })
  }

  it('hay muchas palabras distintas como distractor (no una lista chica para memorizar)', () => {
    const distintas = new Set(cats.flatMap(([, c]) => c.mal))
    expect(distintas.size).toBeGreaterThan(150)
  })

  it('el largo no delata la categoría: AUC entre 0,3 y 0,7 salvo artículos (8 palabras)', () => {
    // Probabilidad de que una correcta al azar sea más larga que un distractor al azar.
    for (const [k, c] of cats) {
      if (k === 'articulos') continue
      let mayor = 0, empate = 0, total = 0
      for (const a of c.ok) for (const b of c.mal) { total++; if (a.length > b.length) mayor++; else if (a.length === b.length) empate++ }
      const auc = (mayor + empate / 2) / total
      expect(auc, `${k} AUC ${auc.toFixed(2)}`).toBeGreaterThan(0.3)
      expect(auc, `${k} AUC ${auc.toFixed(2)}`).toBeLessThan(0.7)
    }
  })

  it('los verbos no son solo infinitivos: hay formas conjugadas', () => {
    const noInf = CATS.verbos.ok.filter(w => !/(ar|er|ir|ír|ér)$/.test(w))
    expect(noInf.length).toBeGreaterThanOrEqual(8)
  })

  it('«-mente» no es una pista infalible de adverbio', () => {
    const conMente = CATS.adverbios.mal.filter(w => /mente$/.test(w))
    // Los adverbios en -mente son correctos; ningún distractor lo es, pero tampoco
    // deben faltar adjetivos/sustantivos largos que confundan el largo.
    expect(CATS.adverbios.mal.some(w => w.length >= 8)).toBe(true)
    expect(conMente).toEqual([])
  })
})
