import { describe, it, expect } from 'vitest'
import { buildDuelWords, shuffle } from '../game/duelWords'

describe('shuffle', () => {
  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result).toHaveLength(arr.length)
    expect(result.sort()).toEqual([...arr].sort())
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffle(arr)
    expect(arr).toEqual(copy)
  })
})

describe('buildDuelWords', () => {
  it('nivel 1: returns 12 ok + 8 mal = 20 words', () => {
    const words = buildDuelWords(['sustantivos'], 1)
    expect(words).toHaveLength(20)
    expect(words.filter(w => w.isCorrect)).toHaveLength(12)
    expect(words.filter(w => !w.isCorrect)).toHaveLength(8)
  })

  it('nivel 2: returns 15 ok + 9 mal = 24 words', () => {
    const words = buildDuelWords(['verbos'], 2)
    expect(words).toHaveLength(24)
    expect(words.filter(w => w.isCorrect)).toHaveLength(15)
    expect(words.filter(w => !w.isCorrect)).toHaveLength(9)
  })

  it('nivel 3: returns 18 ok + 10 mal = 28 words', () => {
    const words = buildDuelWords(['adjetivos'], 3)
    expect(words).toHaveLength(28)
    expect(words.filter(w => w.isCorrect)).toHaveLength(18)
    expect(words.filter(w => !w.isCorrect)).toHaveLength(10)
  })

  it('all words have unique ids', () => {
    const words = buildDuelWords(['adverbios'], 1)
    const ids = words.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all words have non-empty text', () => {
    const words = buildDuelWords(['preposiciones'], 1)
    expect(words.every(w => typeof w.text === 'string' && w.text.length > 0)).toBe(true)
  })

  it('works for all categories', () => {
    const cats = ['sustantivos', 'adjetivos', 'verbos', 'adverbios', 'articulos',
                  'pronombres', 'preposiciones', 'conjunciones', 'interjecciones'] as const
    for (const cat of cats) {
      expect(() => buildDuelWords([cat], 1)).not.toThrow()
    }
  })

  it('multi-cat: returns correct totals', () => {
    const words = buildDuelWords(['sustantivos', 'verbos'], 1)
    expect(words).toHaveLength(20)
    expect(words.filter(w => w.isCorrect)).toHaveLength(12)
    expect(words.filter(w => !w.isCorrect)).toHaveLength(8)
  })
})
