import type { RoomState, PlayerState, PlayerSlot, DuelWord, PowerId } from './types'

const POWER_UNLOCK_EVERY = 3   // every N catches, earn a power
const MAX_INVENTORY = 2

const ALL_POWERS: PowerId[] = ['FREEZE', 'STEAL', 'DECOY', 'SHIELD', 'DOUBLE']

function randomPower(): PowerId {
  return ALL_POWERS[Math.floor(Math.random() * ALL_POWERS.length)]
}

export function createRoom(code: string): RoomState {
  return {
    code,
    players: new Map(),
    words: [],
    duracion: 180,
    cat: '',
    nivel: 1,
    startedAt: null,
    timerHandle: null,
    phase: 'waiting',
  }
}

export function addPlayer(room: RoomState, socketId: string, nombre: string): PlayerSlot | null {
  if (room.players.size >= 2) return null
  const slot: PlayerSlot = room.players.has('A') ? 'B' : 'A'
  room.players.set(slot, {
    socketId,
    nombre,
    slot,
    score: 0,
    powerInventory: [],
    activeEffects: [],
    catchCount: 0,
    ready: false,
  })
  return slot
}

export function removePlayer(room: RoomState, socketId: string): PlayerSlot | null {
  for (const [slot, p] of room.players) {
    if (p.socketId === socketId) {
      room.players.delete(slot)
      return slot
    }
  }
  return null
}

export function getPlayerBySocket(room: RoomState, socketId: string): PlayerState | null {
  for (const p of room.players.values()) {
    if (p.socketId === socketId) return p
  }
  return null
}

export function getRival(room: RoomState, slot: PlayerSlot): PlayerState | null {
  const rivalSlot: PlayerSlot = slot === 'A' ? 'B' : 'A'
  return room.players.get(rivalSlot) ?? null
}

export function setBoard(room: RoomState, words: DuelWord[], duracion: number, cat: string, nivel: number): void {
  room.words = words
  room.duracion = duracion
  room.cat = cat
  room.nivel = nivel
}

export function markReady(room: RoomState, socketId: string): boolean {
  const p = getPlayerBySocket(room, socketId)
  if (!p) return false
  p.ready = true
  return true
}

export function allReady(room: RoomState): boolean {
  if (room.players.size < 2) return false
  return [...room.players.values()].every(p => p.ready)
}

export interface CatchResult {
  success: boolean
  alreadyTaken: boolean
  pointsEarned: number
  stolenByRival: boolean
  powerEarned: PowerId | null
}

export function catchWord(room: RoomState, socketId: string, wordId: string): CatchResult {
  const catcher = getPlayerBySocket(room, socketId)
  if (!catcher) return { success: false, alreadyTaken: false, pointsEarned: 0, stolenByRival: false, powerEarned: null }

  const word = room.words.find(w => w.id === wordId)
  if (!word) return { success: false, alreadyTaken: false, pointsEarned: 0, stolenByRival: false, powerEarned: null }
  if (word.takenBy !== null) return { success: false, alreadyTaken: true, pointsEarned: 0, stolenByRival: false, powerEarned: null }

  // Check FREEZE effect on catcher
  const now = Date.now()
  const frozen = catcher.activeEffects.some(
    e => e.type === 'FREEZE' && (e.expiresAt === null || e.expiresAt > now)
  )
  if (frozen) return { success: false, alreadyTaken: false, pointsEarned: 0, stolenByRival: false, powerEarned: null }

  word.takenBy = catcher.slot

  const basePoints = word.isCorrect ? (10 * room.nivel) : 0
  const hasDouble = consumeEventEffect(catcher, 'DOUBLE')
  const points = basePoints * (hasDouble ? 2 : 1)

  // Check rival STEAL effect
  const rival = getRival(room, catcher.slot)
  let stolenByRival = false
  if (rival) {
    const rivalHasSteal = consumeEventEffect(rival, 'STEAL')
    if (rivalHasSteal) {
      rival.score += points
      stolenByRival = true
    } else {
      catcher.score += points
    }
  } else {
    catcher.score += points
  }

  catcher.catchCount++
  let powerEarned: PowerId | null = null
  if (catcher.catchCount % POWER_UNLOCK_EVERY === 0 && catcher.powerInventory.length < MAX_INVENTORY) {
    powerEarned = randomPower()
    catcher.powerInventory.push(powerEarned)
  }

  return { success: true, alreadyTaken: false, pointsEarned: points, stolenByRival, powerEarned }
}

function consumeEventEffect(player: PlayerState, type: PowerId): boolean {
  const idx = player.activeEffects.findIndex(
    e => e.type === type && e.capturesRemaining !== null && e.capturesRemaining > 0
  )
  if (idx === -1) return false
  player.activeEffects[idx].capturesRemaining!--
  if (player.activeEffects[idx].capturesRemaining === 0) {
    player.activeEffects.splice(idx, 1)
  }
  return true
}

export function pruneExpiredEffects(room: RoomState): void {
  const now = Date.now()
  for (const p of room.players.values()) {
    p.activeEffects = p.activeEffects.filter(e =>
      e.expiresAt === null || e.expiresAt > now
    )
  }
}

export function getScores(room: RoomState): { A: number; B: number } {
  return {
    A: room.players.get('A')?.score ?? 0,
    B: room.players.get('B')?.score ?? 0,
  }
}

export function determineWinner(room: RoomState): 'A' | 'B' | 'draw' {
  const { A, B } = getScores(room)
  if (A > B) return 'A'
  if (B > A) return 'B'
  return 'draw'
}
