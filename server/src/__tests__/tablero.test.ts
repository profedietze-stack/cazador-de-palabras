import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { createRequire } from 'module'
import { construirTablero, construirMazoSeñuelos, categoriasConocidas, nivelValido } from '../tablero'
import { PALABRAS, CATEGORIAS_VALIDAS } from '../palabras'

describe('construirTablero', () => {
  it('nivel 1 da 12 correctas y 8 incorrectas', () => {
    const t = construirTablero(['sustantivos'], 1)!
    expect(t.filter(w => w.isCorrect)).toHaveLength(12)
    expect(t.filter(w => !w.isCorrect)).toHaveLength(8)
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
    expect(t.filter(w => w.isCorrect)).toHaveLength(12)
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
    const { CATS } = require2(tmp) as { CATS: Record<string, { ok: string[]; mal: string[] }> }

    expect(Object.keys(CATS).sort()).toEqual([...CATEGORIAS_VALIDAS].sort())
    for (const k of Object.keys(CATS)) {
      expect(PALABRAS[k]!.ok).toEqual(CATS[k]!.ok)
      expect(PALABRAS[k]!.mal).toEqual(CATS[k]!.mal)
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
