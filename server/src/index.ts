import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import type { RoomState, DuelWord, PowerId } from './types'
import {
  createRoom, addPlayer, removePlayer, getPlayerBySocket,
  getRival, setBoard, markReady, allReady, catchWord,
  getScores, determineWinner, pruneExpiredEffects,
} from './DuelRoom'
import { registerSocket, unregisterSocket, usePower } from './PowerManager'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ROOM_IDLE_TIMEOUT = 5 * 60 * 1000  // 5 min

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

const rooms = new Map<string, RoomState>()
const socketRoom = new Map<string, string>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function getUniqueCode(): string {
  let code = generateCode()
  while (rooms.has(code)) code = generateCode()
  return code
}

function endDuel(room: RoomState, reason: 'time' | 'all_words' | 'disconnect'): void {
  if (room.phase === 'ended') return
  room.phase = 'ended'
  if (room.timerHandle) clearTimeout(room.timerHandle)

  const winner = determineWinner(room)
  const scores = getScores(room)
  io.to(room.code).emit('duel_end', { winner, scores, reason })

  // Cleanup room after 30s
  setTimeout(() => rooms.delete(room.code), 30000)
}

io.on('connection', (socket: Socket) => {
  registerSocket(socket.id)

  // ── Create duel ──────────────────────────────────────────────────────────
  socket.on('create_duel', (data: {
    nombre: string
    cat: string
    nivel: number
    duracion: number
    words: Array<{ id: string; text: string; isCorrect: boolean }>
  }) => {
    const code = getUniqueCode()
    const room = createRoom(code)

    const duelWords: DuelWord[] = data.words.map(w => ({ ...w, takenBy: null }))
    setBoard(room, duelWords, data.duracion, data.cat, data.nivel)

    const slot = addPlayer(room, socket.id, data.nombre)
    if (!slot) { socket.emit('error', 'No se pudo crear la sala'); return }

    rooms.set(code, room)
    socketRoom.set(socket.id, code)
    socket.join(code)
    socket.emit('duel_created', { code, slot })

    // Auto-destroy idle room if no second player joins
    room.timerHandle = setTimeout(() => {
      if (room.phase === 'waiting') rooms.delete(code)
    }, ROOM_IDLE_TIMEOUT)
  })

  // ── Join duel ─────────────────────────────────────────────────────────────
  socket.on('join_duel', (data: { code: string; nombre: string }) => {
    const code = data.code.toUpperCase()
    const room = rooms.get(code)
    if (!room) { socket.emit('error', 'Sala no encontrada'); return }
    if (room.phase !== 'waiting') { socket.emit('error', 'La partida ya comenzó'); return }
    if (room.players.size >= 2) { socket.emit('error', 'Sala llena'); return }

    const slot = addPlayer(room, socket.id, data.nombre)
    if (!slot) { socket.emit('error', 'No se pudo unir'); return }

    socketRoom.set(socket.id, code)
    socket.join(code)

    const rival = getRival(room, slot)!
    socket.emit('duel_joined', { slot, rivalNombre: rival.nombre })
    socket.to(code).emit('rival_joined', { nombre: data.nombre })
  })

  // ── Player ready ──────────────────────────────────────────────────────────
  socket.on('player_ready', () => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'waiting') return

    markReady(room, socket.id)

    if (allReady(room)) {
      if (room.timerHandle) clearTimeout(room.timerHandle)
      room.phase = 'countdown'
      io.to(code).emit('countdown_start')

      setTimeout(() => {
        room.phase = 'playing'
        room.startedAt = Date.now()
        io.to(code).emit('duel_start', {
          words: room.words,
          duracion: room.duracion,
          cat: room.cat,
          nivel: room.nivel,
        })
        room.timerHandle = setTimeout(() => endDuel(room, 'time'), room.duracion * 1000)
      }, 3000)
    }
  })

  // ── Word caught ───────────────────────────────────────────────────────────
  socket.on('word_caught', (wordId: string) => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'playing') return

    pruneExpiredEffects(room)
    const result = catchWord(room, socket.id, wordId)

    if (result.alreadyTaken) {
      socket.emit('word_already_taken', wordId)
      return
    }
    if (!result.success) return   // frozen or invalid

    const catcher = getPlayerBySocket(room, socket.id)!
    io.to(code).emit('word_taken', {
      wordId,
      bySlot: catcher.slot,
      stolenByRival: result.stolenByRival,
      scores: getScores(room),
    })

    if (result.powerEarned) {
      socket.emit('power_earned', result.powerEarned)
    }

    if (room.words.every(w => w.takenBy !== null)) {
      endDuel(room, 'all_words')
    }
  })

  // ── Use power ─────────────────────────────────────────────────────────────
  socket.on('use_power', (powerId: string) => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'playing') return

    const validPowers: PowerId[] = ['FREEZE', 'STEAL', 'DECOY', 'SHIELD', 'DOUBLE']
    if (!validPowers.includes(powerId as PowerId)) return

    const result = usePower(room, socket.id, powerId as PowerId)

    if (!result.ok) {
      socket.emit('power_failed', { powerId, reason: result.reason })
      return
    }

    const caster = getPlayerBySocket(room, socket.id)!
    const rival = getRival(room, caster.slot)

    if (result.blocked) {
      socket.emit('power_blocked', powerId)
      if (rival) io.to(rival.socketId).emit('shield_consumed', powerId)
    } else {
      socket.emit('power_used', powerId)
      if (rival && powerId !== 'DOUBLE' && powerId !== 'SHIELD') {
        io.to(rival.socketId).emit('power_effect', {
          powerId,
          fromSlot: caster.slot,
          decoyWords: (result as { ok: true; blocked: boolean; decoyWords?: string[] }).decoyWords ?? [],
        })
      }
    }
  })

  // ── Rematch ───────────────────────────────────────────────────────────────
  socket.on('request_rematch', () => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    socket.to(code).emit('rematch_requested')
  })

  socket.on('accept_rematch', () => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'ended') return

    room.phase = 'waiting'
    room.startedAt = null
    room.words.forEach(w => { w.takenBy = null })
    for (const p of room.players.values()) {
      p.score = 0
      p.powerInventory = []
      p.activeEffects = []
      p.catchCount = 0
      p.ready = false
    }
    io.to(code).emit('rematch_start')
  })

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    unregisterSocket(socket.id)
    const code = socketRoom.get(socket.id)
    if (!code) return
    socketRoom.delete(socket.id)

    const room = rooms.get(code)
    if (!room) return

    removePlayer(room, socket.id)

    if (room.phase === 'playing') {
      endDuel(room, 'disconnect')
      socket.to(code).emit('rival_disconnected')
    } else if (room.players.size === 0) {
      rooms.delete(code)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Duelo server listening on port ${PORT}`)
})
