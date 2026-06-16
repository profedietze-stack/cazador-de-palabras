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

export function buildDuelWords(cats: CategoryKey[], nivel: number): DuelWordInput[] {
  const nOk  = nivel === 1 ? 12 : nivel === 2 ? 15 : 18
  const nMal = nivel === 1 ? 8  : nivel === 2 ? 9  : 10
  const perCatOk  = Math.ceil(nOk  / cats.length)
  const perCatMal = Math.ceil(nMal / cats.length)
  const allOk:  string[] = []
  const allMal: string[] = []
  for (const cat of cats) {
    allOk.push(...shuffle(CATS[cat].ok).slice(0, perCatOk))
    allMal.push(...shuffle(CATS[cat].mal).slice(0, perCatMal))
  }
  const ok  = shuffle(allOk).slice(0, nOk)
  const mal = shuffle(allMal).slice(0, nMal)
  return shuffle([
    ...ok.map((text, i)  => ({ id: `ok${i}`,  text, isCorrect: true  })),
    ...mal.map((text, i) => ({ id: `mal${i}`, text, isCorrect: false })),
  ])
}
