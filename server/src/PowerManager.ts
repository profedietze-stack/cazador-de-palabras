import type { PowerId, PlayerState, RoomState, ActiveEffect } from './types'
import { getPlayerBySocket, getRival } from './DuelRoom'

const COOLDOWNS: Record<PowerId, number> = {
  FREEZE: 25000,
  STEAL:  20000,
  DECOY:  30000,
  SHIELD: 22000,
  DOUBLE: 18000,
}

const EFFECT_DURATION: Record<PowerId, number | null> = {
  FREEZE: 3000,
  STEAL:  null,  // consumed on rival's next capture
  DECOY:  8000,
  SHIELD: null,  // consumed when blocking a power
  DOUBLE: null,  // consumed on catcher's next capture
}

// socketId -> Map<PowerId, lastUsed timestamp>
const cooldowns = new Map<string, Map<PowerId, number>>()

export function registerSocket(socketId: string): void {
  cooldowns.set(socketId, new Map())
}

export function unregisterSocket(socketId: string): void {
  cooldowns.delete(socketId)
}

export type PowerResult =
  | { ok: true;  blocked: boolean; decoyWords?: string[] }
  | { ok: false; reason: 'cooldown' | 'no_power' | 'no_rival' }

export function usePower(room: RoomState, socketId: string, powerId: PowerId): PowerResult {
  const caster = getPlayerBySocket(room, socketId)
  if (!caster) return { ok: false, reason: 'no_rival' }

  // Must have power in inventory
  const invIdx = caster.powerInventory.indexOf(powerId)
  if (invIdx === -1) return { ok: false, reason: 'no_power' }

  // Check cooldown
  const socketCooldowns = cooldowns.get(socketId) ?? new Map<PowerId, number>()
  const lastUsed = socketCooldowns.get(powerId) ?? 0
  const now = Date.now()
  if (now - lastUsed < COOLDOWNS[powerId]) return { ok: false, reason: 'cooldown' }

  const rival = getRival(room, caster.slot)

  // DOUBLE and SHIELD affect caster — no rival needed
  if (powerId === 'DOUBLE' || powerId === 'SHIELD') {
    consumeFromInventory(caster, powerId)
    recordCooldown(socketId, powerId)
    applyEffect(caster, {
      type: powerId,
      expiresAt: null,
      capturesRemaining: 1,
    })
    return { ok: true, blocked: false }
  }

  if (!rival) return { ok: false, reason: 'no_rival' }

  // Check rival SHIELD
  const shieldIdx = rival.activeEffects.findIndex(
    e => e.type === 'SHIELD' && e.capturesRemaining !== null && e.capturesRemaining > 0
  )
  if (shieldIdx !== -1) {
    rival.activeEffects.splice(shieldIdx, 1)
    consumeFromInventory(caster, powerId)
    recordCooldown(socketId, powerId)
    return { ok: true, blocked: true }
  }

  // Apply effect to rival
  consumeFromInventory(caster, powerId)
  recordCooldown(socketId, powerId)

  const duration = EFFECT_DURATION[powerId]
  applyEffect(rival, {
    type: powerId,
    expiresAt: duration !== null ? now + duration : null,
    capturesRemaining: powerId === 'STEAL' ? 1 : null,
  })

  if (powerId === 'DECOY') {
    const decoyWords = generateDecoys(room)
    return { ok: true, blocked: false, decoyWords }
  }

  return { ok: true, blocked: false }
}

function consumeFromInventory(player: PlayerState, powerId: PowerId): void {
  const idx = player.powerInventory.indexOf(powerId)
  if (idx !== -1) player.powerInventory.splice(idx, 1)
}

function recordCooldown(socketId: string, powerId: PowerId): void {
  const map = cooldowns.get(socketId) ?? new Map<PowerId, number>()
  map.set(powerId, Date.now())
  cooldowns.set(socketId, map)
}

function applyEffect(player: PlayerState, effect: ActiveEffect): void {
  player.activeEffects = player.activeEffects.filter(e => e.type !== effect.type)
  player.activeEffects.push(effect)
}

const CANTIDAD_SEÑUELOS = 4

// Ultimo recurso, sólo si el cliente no mandó mazo de señuelos (versión vieja).
// Antes esta lista era la única fuente: 12 palabras fijas, iguales en todas las
// partidas y sin relación con la categoría del duelo. En una partida de
// sustantivos aparecían "correr" y "siempre", y cualquiera las reconocía a la
// segunda vez.
const SEÑUELOS_DE_RESERVA = [
  'correr', 'grande', 'rápido', 'hermoso', 'cielo', 'luna',
  'agua', 'fuego', 'siempre', 'nunca', 'brillar', 'oscuro',
]

/** Fisher-Yates. `sort(() => Math.random() - 0.5)` no reparte parejo. */
function mezclar<T>(arr: readonly T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copia[i]!
    copia[i] = copia[j]!
    copia[j] = tmp
  }
  return copia
}

/**
 * Señuelos para el tablero del rival.
 *
 * Salen del mazo que mandó el cliente: palabras de las mismas categorías y
 * nivel del duelo que NO están en el tablero. Así parecen de la partida y hay
 * que leerlas para descartarlas, que es el punto del poder.
 *
 * Se filtra contra el tablero por si el mazo trae algo repetido: un señuelo
 * que duplica una palabra visible se nota enseguida.
 */
export function generateDecoys(room: RoomState): string[] {
  const enTablero = new Set(room.words.map(w => w.text))
  const propios = room.decoyPool.filter(t => !enTablero.has(t))

  // El filtro contra el tablero va DESPUES de elegir la fuente, no sólo sobre
  // el mazo del cliente: la lista de reserva tambien puede pisar una palabra
  // visible. Con un tablero de sustantivos, "luna" y "agua" estan en las dos.
  const fuente = propios.length >= CANTIDAD_SEÑUELOS
    ? propios
    : SEÑUELOS_DE_RESERVA.filter(t => !enTablero.has(t))

  return mezclar(fuente).slice(0, CANTIDAD_SEÑUELOS)
}

export function getCooldownRemaining(socketId: string, powerId: PowerId): number {
  const map = cooldowns.get(socketId)
  if (!map) return 0
  const lastUsed = map.get(powerId) ?? 0
  return Math.max(0, COOLDOWNS[powerId] - (Date.now() - lastUsed))
}
