import type { Server } from 'socket.io'
import type { RoomState } from './types'
import {
  addPlayer, markReady, catchWord, getScores,
  getPlayerBySocket, pruneExpiredEffects,
} from './DuelRoom'

const BOT_PREFIX = 'BOT_'
const BOT_NAME = '🤖 Bot'

export function isBotSocket(socketId: string): boolean {
  return socketId.startsWith(BOT_PREFIX)
}

/**
 * Spawn a bot player into a waiting room and immediately mark it ready.
 * Returns the bot socketId, or null if the room is not eligible.
 */
export function spawnBot(
  io: Server,
  rooms: Map<string, RoomState>,
  socketRoom: Map<string, string>,
  code: string,
): string | null {
  const room = rooms.get(code)
  if (!room || room.phase !== 'waiting' || room.players.size >= 2) return null

  const botId = `${BOT_PREFIX}${Date.now()}`
  const slot = addPlayer(room, botId, BOT_NAME)
  if (!slot) return null

  socketRoom.set(botId, code)

  // Notify the real player that a rival joined
  io.to(code).emit('rival_joined', { nombre: BOT_NAME })

  // Bot is always ready
  markReady(room, botId)

  return botId
}

/**
 * Start the bot's autonomous word-catching loop.
 * Call this after duel_start (when room.phase becomes 'playing').
 */
export function startBotPlay(
  io: Server,
  rooms: Map<string, RoomState>,
  code: string,
  endDuel: (room: RoomState, reason: 'time' | 'all_words' | 'disconnect') => void,
): void {
  const room = rooms.get(code)
  if (!room) return

  let botId: string | null = null
  for (const sid of room.players.keys()) {
    // players is keyed by slot ('A'|'B'), socketId is in PlayerState
    const p = room.players.get(sid as any)!
    if (p.socketId.startsWith(BOT_PREFIX)) { botId = p.socketId; break }
  }
  if (!botId) return

  const bid = botId

  function scheduleNext(): void {
    // Random delay: 900ms–2100ms between catches
    const delay = 900 + Math.random() * 1200
    setTimeout(() => {
      const r = rooms.get(code)
      if (!r || r.phase !== 'playing') return

      pruneExpiredEffects(r)

      const freeWords = r.words.filter(w => w.takenBy === null)
      if (freeWords.length === 0) return

      // Bot picks a random free word (no smarts, just random)
      const word = freeWords[Math.floor(Math.random() * freeWords.length)]
      const result = catchWord(r, bid, word.id)

      if (result.success) {
        const catcher = getPlayerBySocket(r, bid)!
        io.to(code).emit('word_taken', {
          wordId: word.id,
          bySlot: catcher.slot,
          stolenByRival: result.stolenByRival,
          scores: getScores(r),
        })
        // Bot ignores power_earned — no inventory management needed

        if (r.words.every(w => w.takenBy !== null)) {
          endDuel(r, 'all_words')
          return
        }
      }

      scheduleNext()
    }, delay)
  }

  scheduleNext()
}
