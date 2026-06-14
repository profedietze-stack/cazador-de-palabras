import type { CategoryKey } from '../types'
import type { DuelWord, DuelScores, PowerId, PlayerSlot, DuelPhase } from '../types/duel'

export interface DuelState {
  mySlot: PlayerSlot | null
  myNombre: string
  rivalNombre: string
  roomCode: string
  cat: CategoryKey
  catNombre: string
  nivel: number
  duracion: number
  words: DuelWord[]
  scores: DuelScores
  myPowers: PowerId[]
  phase: DuelPhase
}

export const D: DuelState = {
  mySlot: null,
  myNombre: '',
  rivalNombre: '',
  roomCode: '',
  cat: 'sustantivos',
  catNombre: 'Sustantivos',
  nivel: 1,
  duracion: 60,
  words: [],
  scores: { A: 0, B: 0 },
  myPowers: [],
  phase: 'idle',
}

export function resetDuelState(): void {
  D.mySlot = null
  D.myNombre = ''
  D.rivalNombre = ''
  D.roomCode = ''
  D.words = []
  D.scores = { A: 0, B: 0 }
  D.myPowers = []
  D.phase = 'idle'
}
