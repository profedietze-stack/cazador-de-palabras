export type PowerId = 'FREEZE' | 'STEAL' | 'DECOY' | 'SHIELD' | 'DOUBLE'
export type PlayerSlot = 'A' | 'B'

export interface DuelWord {
  id: string
  text: string
  isCorrect: boolean
  takenBy: PlayerSlot | null
}

export interface DuelScores {
  A: number
  B: number
}

export interface DuelConfig {
  cat: string
  catNombre: string
  nivel: number
  duracion: number
  nombre: string
  words: Array<{ id: string; text: string; isCorrect: boolean }>
}

export type DuelPhase = 'idle' | 'creating' | 'joining' | 'lobby' | 'countdown' | 'playing' | 'ended'

export const POWER_META: Record<PowerId, { label: string; icon: string; cooldownMs: number }> = {
  FREEZE: { label: 'Congelar',  icon: '❄️',  cooldownMs: 25000 },
  STEAL:  { label: 'Robar',     icon: '🎯',  cooldownMs: 20000 },
  DECOY:  { label: 'Señuelo',   icon: '👻',  cooldownMs: 30000 },
  SHIELD: { label: 'Escudo',    icon: '🛡️',  cooldownMs: 22000 },
  DOUBLE: { label: 'Combo x2',  icon: '⚡',  cooldownMs: 18000 },
}
