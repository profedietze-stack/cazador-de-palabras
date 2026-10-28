import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { createRequire } from 'module'
import { construirTablero, construirMazoSeñuelos, categoriasConocidas, nivelValido } from '../tablero'
import { PALABRAS, CATEGORIAS_VALIDAS } from '../palabras'

describe('construirTablero', () => {
  it('nivel 1 da 10 correctas y 10 incorrectas', () => {
    const t = construirTablero(['sustantivos'], 1)!
    expect(t.filter(w => w.isCorrect)).toHaveLength(10)
    expect(t.filter(w => !w.isCorrect)).toHaveLength(10)
  })

  it('el nivel 3 trae mas palabras que el 1', () => {
    const n1 = construirTablero(['sustantivos'], 1)!
    const n3 = construirTablero(['sustantivos'], 3)!
    expect(n3.length).toBeGreaterThan(n1.length)
  })

  it('las correctas salen de la lista `ok` de la categoria', () => {
    // Esto es lo que el cliente ya no decide: cual palabra vale puntos.
    const t = construirTablero(['sustantivos'], 1)!
    for (const w of t.filter(x => x.isCorrect)) {
      expect(PALABRAS['sustantivos']!.ok).toContain(w.text)
    }
  })

  it('las incorrectas NO estan en la lista `ok`', () => {
    const t = construirTablero(['sustantivos'], 1)!
    for (const w of t.filter(x => !x.isCorrect)) {
      expect(PALABRAS['sustantivos']!.ok).not.toContain(w.text)
    }
  })

  it('no repite palabras en el tablero', () => {
    for (let i = 0; i < 20; i++) {
      const t = construirTablero(['sustantivos', 'verbos'], 2)!
      expect(new Set(t.map(w => w.text)).size).toBe(t.length)
    }
  })

  it('los ids son correlativos desde 0', () => {
    const t = construirTablero(['sustantivos'], 1)!
    expect(t.map(w => w.id)).toEqual(t.map((_, i) => String(i)))
  })

  it('devuelve null si ninguna categoria existe', () => {
    // Antes una categoria inventada no importaba, porque las palabras las
    // mandaba el cliente. Ahora sin categoria valida no hay tablero posible.
    expect(construirTablero(['inventada'], 1)).toBeNull()
    expect(construirTablero([], 1)).toBeNull()
  })

  it('ignora las categorias inventadas y usa las validas', () => {
    const t = construirTablero(['inventada', 'sustantivos'], 1)
    expect(t).not.toBeNull()
    expect(t!.length).toBeGreaterThan(0)
  })

  it('un nivel fuera de tabla no rompe: cae en el 1', () => {
    const t = construirTablero(['sustantivos'], 99)!
    expect(t.filter(w => w.isCorrect)).toHaveLength(10)
  })
})

describe('construirMazoSeñuelos', () => {
  it('no incluye palabras que ya estan en el tablero', () => {
    const t = construirTablero(['sustantivos'], 1)!
    const enTablero = t.map(w => w.text)
    const mazo = construirMazoSeñuelos(['sustantivos'], enTablero)
    for (const s of mazo) expect(enTablero).not.toContain(s)
  })

  it('sale de las categorias del duelo', () => {
    const mazo = construirMazoSeñuelos(['sustantivos'], [])
    const propias = [...PALABRAS['sustantivos']!.ok, ...PALABRAS['sustantivos']!.mal]
    for (const s of mazo) expect(propias).toContain(s)
  })
})

describe('categoriasConocidas', () => {
  it('filtra las inventadas y no repite', () => {
    expect(categoriasConocidas(['sustantivos', 'inventada', 'sustantivos']))
      .toEqual(['sustantivos'])
  })
})

describe('ningun distractor es correcto en una categoria elegida', () => {
  // Con varias categorias, la `mal` de una puede ser la `ok` de otra: `casa`
  // es distractor de adjetivos y correcta en sustantivos. Si entraba como
  // distractor, el chico la tocaba bien y el servidor le restaba puntos.
  const pares: string[][] = []
  for (const a of CATEGORIAS_VALIDAS) for (const b of CATEGORIAS_VALIDAS) if (a < b) pares.push([a, b])
  const grupos = [...pares, ['sustantivos', 'adjetivos', 'verbos'], [...CATEGORIAS_VALIDAS]]

  for (const cats of grupos) {
    it(`${cats.length > 3 ? 'las 9 categorias' : cats.join(' + ')}`, () => {
      const okTodas = new Set(cats.flatMap(c => PALABRAS[c]!.ok))
      for (let i = 0; i < 200; i++) {
        for (const nivel of [1, 2, 3]) {
          const t = construirTablero(cats, nivel)!
          const malas = t.filter(w => !w.isCorrect).map(w => w.text)
          expect(malas.filter(w => okTodas.has(w)), `${cats.join(',')} n${nivel}`).toEqual([])
          expect(new Set(t.map(w => w.text)).size).toBe(t.length)
        }
      }
    })
  }

  it('sigue habiendo tantos distractores como pide el nivel', () => {
    for (const cats of grupos) {
      for (const nivel of [1, 2, 3]) {
        const t = construirTablero(cats, nivel)!
        // Con muchas categorias casi todo es correcto en alguna: solo quedan
        // como distractores las palabras que no son de ninguna elegida.
        const okTodas = new Set(cats.flatMap(c => PALABRAS[c]!.ok))
        const disponibles = new Set(cats.flatMap(c => PALABRAS[c]!.mal).filter(w => !okTodas.has(w))).size
        const esperado = Math.min({ 1: 10, 2: 12, 3: 14 }[nivel as 1 | 2 | 3], disponibles)
        expect(t.filter(w => !w.isCorrect), `${cats.join(',')} n${nivel}`).toHaveLength(esperado)
      }
    }
  })
})

describe('el diccionario del servidor no se desincroniza del cliente', () => {
  it('tiene las mismas categorias y las mismas palabras', () => {
    // `palabras.ts` es una copia generada de `src/data/categories.ts`. El
    // cliente conserva la suya porque el modo de un jugador corre entero en el
    // dispositivo. Este test existe para que tocar una sola de las dos rompa
    // el build en vez de que las partidas se vayan separando en silencio.
    const origen = resolve(process.cwd(), '../src/data/categories.ts')
    let src = readFileSync(origen, 'utf8')
    src = src.replace(/^import[^\n]*\n/m, '')
    src = src.replace('export const CATS: Record<CategoryKey, Category> =', 'module.exports.CATS =')
    // Nombre unico: con un nombre fijo, dos corridas simultaneas escriben y
    // leen el mismo archivo y una puede ver el contenido a medias.
    const tmp = join(tmpdir(), `cats-sync-${process.pid}-${Date.now()}.cjs`)
    writeFileSync(tmp, src)
    const require2 = createRequire(__filename)
    delete require2.cache[require2.resolve(tmp)]
    const { CATS } = require2(tmp) as { CATS: Record<string, { ok: string[]; mal: string[]; malCerca?: string[] }> }

    expect(Object.keys(CATS).sort()).toEqual([...CATEGORIAS_VALIDAS].sort())
    for (const k of Object.keys(CATS)) {
      expect(PALABRAS[k]!.ok).toEqual(CATS[k]!.ok)
      expect(PALABRAS[k]!.mal).toEqual(CATS[k]!.mal)
      expect(PALABRAS[k]!.malCerca ?? []).toEqual(CATS[k]!.malCerca ?? [])
    }
  })
})

describe('nivelValido', () => {
  it('acepta 1, 2 y 3', () => {
    expect(nivelValido(1)).toBe(1)
    expect(nivelValido(2)).toBe(2)
    expect(nivelValido(3)).toBe(3)
  })

  it('un nivel fuera de rango cae en 1, no en el maximo', () => {
    // Recortar al maximo premiaria pedir algo invalido: `nivel: 99` daria el
    // multiplicador mas alto.
    expect(nivelValido(99)).toBe(1)
    expect(nivelValido(10)).toBe(1)
    expect(nivelValido(0)).toBe(1)
    expect(nivelValido(-5)).toBe(1)
  })

  it('cualquier basura cae en 1', () => {
    for (const v of ['3', null, undefined, {}, [], NaN, Infinity, 2.5]) {
      expect(nivelValido(v)).toBe(1)
    }
  })
})
