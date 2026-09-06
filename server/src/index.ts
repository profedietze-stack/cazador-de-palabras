import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import type { RoomState, DuelWord, PowerId } from './types'
import {
  createRoom, addPlayer, removePlayer, getPlayerBySocket,
  getRival, setBoard, markReady, allReady, catchWord,
  getScores, determineWinner, pruneExpiredEffects,
} from './DuelRoom'
import { registerSocket, unregisterSocket, usePower } from './PowerManager'
import { spawnBot, startBotPlay, isBotSocket } from './DebugBot'
import { randomInt } from 'crypto'
import {
  codigoSala, nombreJugador, tableroDePalabras, categorias,
  numeroEnRango, MIN_DURACION, MAX_DURACION,
} from './validate'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ROOM_IDLE_TIMEOUT = 5 * 60 * 1000  // 5 min

// Sin salas no hay memoria que llenar: tope global para que nadie tumbe el
// servidor creando duelos en masa.
const MAX_ROOMS = 500

// El modo bot es para desarrollo. En producción no se expone.
const DEBUG_BOT = process.env.DEBUG_BOT === '1'

const httpServer = createServer()
const io = new Server(httpServer, {
  // Sólo los orígenes donde corre el juego. Con `*` cualquier página de
  // internet podía abrir duelos contra este servidor.
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'https://cazador-de-palabras.vercel.app,http://localhost:5173,http://localhost:5174')
      .split(',').map(s => s.trim()).filter(Boolean),
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map<string, RoomState>()
const socketRoom = new Map<string, string>()

/**
 * Corre un handler sin que una excepción tumbe el proceso.
 *
 * Antes no había ninguno: `join_duel` con un `code` que no fuera texto hacía
 * `data.code.toUpperCase()`, tiraba TypeError y **mataba el servidor**. Un
 * paquete desde cualquier navegador cortaba los duelos de todos, y se podía
 * repetir. Reproducido antes de escribir esto.
 *
 * La validación de cada handler es la defensa; esto es la red por si algo se
 * escapa.
 */
function seguro<T extends unknown[]>(
  socket: Socket, nombre: string, fn: (...args: T) => void,
): (...args: T) => void {
  return (...args: T) => {
    try {
      fn(...args)
    } catch (e) {
      console.error(`[duelo] error en "${nombre}" (socket ${socket.id}):`, e)
      socket.emit('error', 'Petición inválida')
    }
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  // randomInt y no Math.random: el código es lo único que protege una sala,
  // así que no conviene que sea predecible. 5 caracteres = ~33 millones.
  for (let i = 0; i < 5; i++) code += chars[randomInt(chars.length)]
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

  // Se guarda la referencia para poder cancelarla: sin esto la sala se
  // borraba 30 s despues de terminar el duelo AUNQUE los jugadores hubieran
  // aceptado una revancha, y la partida nueva se congelaba a mitad de camino
  // sin ningun mensaje —las capturas dejaban de registrarse porque la sala ya
  // no existia en el mapa.
  limpiezaPendiente.set(room.code, setTimeout(() => {
    limpiezaPendiente.delete(room.code)
    rooms.delete(room.code)
  }, 30000))
}

// Borrados de sala programados tras terminar un duelo, por codigo de sala.
const limpiezaPendiente = new Map<string, ReturnType<typeof setTimeout>>()

function cancelarLimpieza(code: string): void {
  const t = limpiezaPendiente.get(code)
  if (t) {
    clearTimeout(t)
    limpiezaPendiente.delete(code)
  }
}

io.on('connection', (socket: Socket) => {
  registerSocket(socket.id)

  // ── Create duel ──────────────────────────────────────────────────────────
  // Nada de lo que llega acá se usa sin comprobar: las palabras las manda el
  // cliente y después se reenvían al rival.
  socket.on('create_duel', seguro(socket, 'create_duel', (data: unknown) => {
    const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>

    if (rooms.size >= MAX_ROOMS) {
      socket.emit('error', 'El servidor está lleno, probá en un rato')
      return
    }

    const duelWords: DuelWord[] | null = tableroDePalabras(d['words'])
    if (!duelWords) { socket.emit('error', 'El tablero llegó vacío'); return }

    const code = getUniqueCode()
    const room = createRoom(code)

    setBoard(
      room,
      duelWords,
      numeroEnRango(d['duracion'], MIN_DURACION, MAX_DURACION, 60),
      categorias(d['cats'], d['cat']),
      numeroEnRango(d['nivel'], 1, 10, 1),
    )

    const slot = addPlayer(room, socket.id, nombreJugador(d['nombre']))
    if (!slot) { socket.emit('error', 'No se pudo crear la sala'); return }

    rooms.set(code, room)
    socketRoom.set(socket.id, code)
    socket.join(code)
    socket.emit('duel_created', { code, slot })

    // Auto-destroy idle room if no second player joins
    room.timerHandle = setTimeout(() => {
      if (room.phase === 'waiting') rooms.delete(code)
    }, ROOM_IDLE_TIMEOUT)
  }))

  // ── Join duel ─────────────────────────────────────────────────────────────
  socket.on('join_duel', seguro(socket, 'join_duel', (data: unknown) => {
    const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>

    // Antes esto era `data.code.toUpperCase()`: con un número, tiraba y mataba
    // el proceso.
    const code = codigoSala(d['code'])
    if (!code) { socket.emit('error', 'Sala no encontrada'); return }

    const room = rooms.get(code)
    if (!room) { socket.emit('error', 'Sala no encontrada'); return }
    if (room.phase !== 'waiting') { socket.emit('error', 'La partida ya comenzó'); return }
    if (room.players.size >= 2) { socket.emit('error', 'Sala llena'); return }

    const nombre = nombreJugador(d['nombre'])
    const slot = addPlayer(room, socket.id, nombre)
    if (!slot) { socket.emit('error', 'No se pudo unir'); return }

    socketRoom.set(socket.id, code)
    socket.join(code)

    const rival = getRival(room, slot)
    socket.emit('duel_joined', { slot, rivalNombre: rival ? rival.nombre : '' })
    socket.to(code).emit('rival_joined', { nombre })
  }))

  // ── Player ready ──────────────────────────────────────────────────────────
  socket.on('player_ready', seguro(socket, 'player_ready', () => {
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
        // Si el rival se fue durante el 3-2-1, no se arranca: antes el duelo
        // empezaba igual y el que quedaba jugaba solo contra nadie hasta que
        // se acababa el tiempo, sin entender que habia pasado.
        if (!rooms.has(code) || room.players.size < 2) {
          room.phase = 'waiting'
          for (const p of room.players.values()) p.ready = false
          io.to(code).emit('rival_disconnected')
          return
        }

        room.phase = 'playing'
        room.startedAt = Date.now()
        io.to(code).emit('duel_start', {
          words: room.words,
          duracion: room.duracion,
          cats: room.cats,
          nivel: room.nivel,
        })
        room.timerHandle = setTimeout(() => endDuel(room, 'time'), room.duracion * 1000)
        // Start bot play if a bot is in the room
        startBotPlay(io, rooms, code, endDuel)
      }, 3000)
    }
  }))

  // ── Word caught ───────────────────────────────────────────────────────────
  socket.on('word_caught', seguro(socket, 'word_caught', (wordIdCrudo: unknown) => {
    if (typeof wordIdCrudo !== 'string') return
    const wordId = wordIdCrudo

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
  }))

  // ── Use power ─────────────────────────────────────────────────────────────
  socket.on('use_power', seguro(socket, 'use_power', (powerIdCrudo: unknown) => {
    const validPowers: PowerId[] = ['FREEZE', 'STEAL', 'DECOY', 'SHIELD', 'DOUBLE']
    if (typeof powerIdCrudo !== 'string') return
    if (!validPowers.includes(powerIdCrudo as PowerId)) return
    const powerId = powerIdCrudo as PowerId

    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'playing') return

    const result = usePower(room, socket.id, powerId)

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
  }))

  // ── Debug: spawn bot ─────────────────────────────────────────────────────
  // Sólo con DEBUG_BOT=1. Es una herramienta de desarrollo: en producción
  // sería un evento que cualquiera puede disparar para meter un jugador
  // fantasma en una sala ajena.
  if (DEBUG_BOT) {
    socket.on('debug_bot_join', seguro(socket, 'debug_bot_join', (data: unknown) => {
      const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
      const code = codigoSala(d['code'])
      if (!code) return
      spawnBot(io, rooms, socketRoom, code)
    }))
  }

  // ── Rematch ───────────────────────────────────────────────────────────────
  socket.on('request_rematch', seguro(socket, 'request_rematch', () => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    socket.to(code).emit('rematch_requested')
  }))

  socket.on('accept_rematch', seguro(socket, 'accept_rematch', () => {
    const code = socketRoom.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'ended') return

    // La sala tenia programado su propio borrado desde que termino el duelo
    // anterior. Si no se cancela, la revancha muere a los 30 s.
    cancelarLimpieza(code)

    room.phase = 'waiting'
    room.startedAt = null
    room.words.forEach(w => { w.takenBy = null })
    for (const p of room.players.values()) {
      p.score = 0
      p.powerInventory = []
      p.activeEffects = []
      p.catchCount = 0
      p.ready = false
      // Los cooldowns viven aparte, por socket, y no se limpiaban: un poder
      // usado al final del duelo anterior seguia en espera en el nuevo, que
      // empieza con el inventario vacio igual para los dos.
      registerSocket(p.socketId)
    }
    io.to(code).emit('rematch_start')
  }))

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', seguro(socket, 'disconnect', () => {
    if (isBotSocket(socket.id)) return   // bots have no real socket
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
  }))
})

// Último recurso. La defensa son la validación y el envoltorio `seguro`; esto
// existe para que un descuido futuro degrade en un log y no en el servidor
// caído para todos. Se registra fuerte porque un error acá es un bug a mirar,
// no algo normal.
process.on('uncaughtException', (e) => {
  console.error('[duelo] EXCEPCION NO CAPTURADA (revisar, no deberia pasar):', e)
})
process.on('unhandledRejection', (e) => {
  console.error('[duelo] PROMESA RECHAZADA SIN MANEJAR (revisar):', e)
})

httpServer.listen(PORT, () => {
  console.log(`Duelo server listening on port ${PORT}`)
})
