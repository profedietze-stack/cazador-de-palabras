export type PowerId = 'FREEZE' | 'STEAL' | 'DECOY' | 'SHIELD' | 'DOUBLE'
export type PlayerSlot = 'A' | 'B'

export interface DuelWord {
  id: string        // unique per board (index as string)
  text: string      // the word
  isCorrect: boolean
  takenBy: PlayerSlot | null
}

export interface PlayerState {
  socketId: string
  nombre: string
  slot: PlayerSlot
  score: number
  powerInventory: PowerId[]     // max 2
  activeEffects: ActiveEffect[]
  catchCount: number            // words caught, used for power unlock cadence
  ready: boolean
}

export interface ActiveEffect {
  type: PowerId
  expiresAt: number | null      // ms timestamp, null = event-based
  capturesRemaining: number | null  // for STEAL/DOUBLE
}

export interface RoomState {
  code: string
  players: Map<PlayerSlot, PlayerState>
  words: DuelWord[]
  duracion: number              // seconds
  cats: string[]
  nivel: number
  // Palabras de las mismas categorias que NO estan en el tablero, para que los
  // señuelos del DECOY parezcan de la partida y no salgan de una lista fija.
  decoyPool: string[]
  // Aula a la que se publica el resultado. Vacio = duelo suelto, sin ranking.
  salaCode: string
  startedAt: number | null
  timerHandle: ReturnType<typeof setTimeout> | null
  phase: 'waiting' | 'countdown' | 'playing' | 'ended'
}
