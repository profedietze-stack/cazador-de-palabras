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
    const decoyWords = generateDecoys()
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

function generateDecoys(): string[] {
  const pool = ['correr','grande','rápido','hermoso','cielo','luna','agua','fuego','siempre','nunca','brillar','oscuro']
  return pool.sort(() => Math.random() - 0.5).slice(0, 4)
}

export function getCooldownRemaining(socketId: string, powerId: PowerId): number {
  const map = cooldowns.get(socketId)
  if (!map) return 0
  const lastUsed = map.get(powerId) ?? 0
  return Math.max(0, COOLDOWNS[powerId] - (Date.now() - lastUsed))
}
