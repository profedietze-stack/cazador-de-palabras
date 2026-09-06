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

/** Cuántos señuelos se le mandan al servidor como mazo. */
export const MAX_SEÑUELOS = 40

/**
 * Palabras candidatas para los señuelos del poder DECOY.
 *
 * Son de las mismas categorías del duelo pero NO están en el tablero, así que
 * parecen de la partida y hay que leerlas para descartarlas —que es lo que el
 * poder busca. Antes el servidor usaba una lista fija de 12 palabras, iguales
 * en todas las partidas y sin relación con la categoría: en un duelo de
 * sustantivos aparecían "correr" y "siempre", y se reconocían a la segunda vez.
 *
 * Se mezclan correctas e incorrectas, igual que el tablero real.
 */
export function buildDecoyPool(cats: CategoryKey[], enTablero: string[]): string[] {
  const usadas = new Set(enTablero)
  const candidatas: string[] = []
  for (const cat of cats) {
    candidatas.push(...CATS[cat].ok, ...CATS[cat].mal)
  }
  const sinRepetir = [...new Set(candidatas)].filter(w => !usadas.has(w))
  return shuffle(sinRepetir).slice(0, MAX_SEÑUELOS)
}
