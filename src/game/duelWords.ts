import { CATS } from '../data/categories'
import type { CategoryKey } from '../types'

export interface DuelWordInput {
  id: string
  text: string
  isCorrect: boolean
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function buildDuelWords(cat: CategoryKey, nivel: number): DuelWordInput[] {
  const data = CATS[cat]
  const nOk  = nivel === 1 ? 12 : nivel === 2 ? 15 : 18
  const nMal = nivel === 1 ? 8  : nivel === 2 ? 9  : 10
  const ok  = shuffle(data.ok).slice(0, nOk)
  const mal = shuffle(data.mal).slice(0, nMal)
  return shuffle([
    ...ok.map((text, i)  => ({ id: `ok${i}`,  text, isCorrect: true  })),
    ...mal.map((text, i) => ({ id: `mal${i}`, text, isCorrect: false })),
  ])
}
