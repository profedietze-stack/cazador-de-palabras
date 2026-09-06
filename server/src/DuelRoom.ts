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
    cats: [],
    nivel: 1,
    decoyPool: [],
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

export function setBoard(room: RoomState, words: DuelWord[], duracion: number, cats: string[], nivel: number): void {
  room.words = words
  room.duracion = duracion
  room.cats = cats
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

  const basePoints = 10 * room.nivel

  // Errar resta. Es la misma regla que el modo de un jugador
  // (`GameEngine.ts`): la mitad de los puntos base, minimo 1, y el puntaje no
  // baja de cero. Sin esto tocar palabras al azar era gratis: se llegaba a las
  // correctas por descarte, sin riesgo.
  const penalizacion = Math.max(1, Math.floor(basePoints / 2))

  let points = word.isCorrect ? basePoints : -penalizacion
  let stolenByRival = false
  const rival = getRival(room, catcher.slot)

  if (word.isCorrect) {
    // Los poderes de "proxima captura" solo se gastan si esa captura suma.
    // Antes se consumian igual con una palabra equivocada: el DOBLE se perdia
    // duplicando cero y al rival se le quemaba el ROBAR sin robar nada.
    if (consumeEventEffect(catcher, 'DOUBLE')) points = basePoints * 2

    if (rival && consumeEventEffect(rival, 'STEAL')) {
      rival.score += points
      stolenByRival = true
    } else {
      catcher.score += points
    }
  } else {
    // El error es tuyo y no se transfiere: ni el rival lo cobra con ROBAR, ni
    // tu DOBLE lo agranda.
    catcher.score = Math.max(0, catcher.score + points)
  }

  // El poder se gana acertando. Si contaran las equivocadas, alcanzaba con
  // tocar palabras incorrectas —gratis y sin penalizacion— para cosechar
  // poderes sin jugar bien.
  let powerEarned: PowerId | null = null
  if (word.isCorrect) {
    catcher.catchCount++
    // No es `% N`: con el inventario lleno el poder se descartaba en silencio
    // y habia que esperar otras 3 capturas, asi que acumular poderes te hacia
    // recibir menos. Ahora el credito queda pendiente y se cobra en la primera
    // captura que encuentre lugar.
    if (catcher.catchCount >= POWER_UNLOCK_EVERY && catcher.powerInventory.length < MAX_INVENTORY) {
      powerEarned = randomPower()
      catcher.powerInventory.push(powerEarned)
      catcher.catchCount -= POWER_UNLOCK_EVERY
    }
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
