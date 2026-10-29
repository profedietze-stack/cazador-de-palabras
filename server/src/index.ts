import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import type { RoomState, PowerId } from './types'
import {
  createRoom, addPlayer, removePlayer, getPlayerBySocket, marcarDesconectado, reconectar, GRACIA_RECONEXION_MS,
  getRival, setBoard, markReady, allReady, catchWord,
  getScores, determineWinner, pruneExpiredEffects,
} from './DuelRoom'
import { registerSocket, unregisterSocket, usePower } from './PowerManager'
import { spawnBot, startBotPlay, isBotSocket } from './DebugBot'
import {
  codigoSala, nombreJugador, categorias, codigoDeAula,
  numeroEnRango, MIN_DURACION, MAX_DURACION, generateCode,
} from './validate'
import { publicarResultado } from './ranking'
import { contar, crearManejadorHttp } from './observabilidad'
import {
  crearLimitadorCaptura, ipDelCliente, MAX_SALAS_POR_IP,
} from './ritmo'
import {
  construirTablero, construirMazoSeñuelos, categoriasConocidas, nivelValido,
} from './tablero'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ROOM_IDLE_TIMEOUT = 5 * 60 * 1000  // 5 min

// Sin salas no hay memoria que llenar: tope global para que nadie tumbe el
// servidor creando duelos en masa.
const MAX_ROOMS = 500

// El modo bot es para desarrollo. En producción no se expone.
const DEBUG_BOT = process.env.DEBUG_BOT === '1'

// `/health` y `/report` (errores anónimos del cliente). Todo lo que no es de
// socket.io pasa por acá; sin manejador, esos pedidos quedaban colgados.
let conectados = 0
const httpServer = createServer(crearManejadorHttp(
  { salas: () => rooms.size, sockets: () => conectados },
  (req) => ipDelCliente(req.headers, req.socket.remoteAddress ?? ''),
))
const io = new Server(httpServer, {
  // Sólo los orígenes donde corre el juego. Con `*` cualquier página de
  // internet podía abrir duelos contra este servidor.
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'https://cazador-de-palabras.vercel.app,http://localhost:5173,http://localhost:5174')
      .split(',').map(s => s.trim()).filter(Boolean),
    methods: ['GET', 'POST'],
  },
  // Los mensajes legitimos pesan unos cientos de bytes. El tope por defecto
  // (1 MB) dejaba procesar paquetes de cientos de KB.
  maxHttpBufferSize: 16 * 1024,
  // Detectar la caída de un cliente en ~14 s en vez de ~45 s: la gracia de reconexión
  // (GRACIA_RECONEXION_MS) corre desde que se detecta.
  pingInterval: 8000,
  pingTimeout: 6000,
})

const rooms = new Map<string, RoomState>()
const socketRoom = new Map<string, string>()
const limiteCaptura = crearLimitadorCaptura()
// Temporizadores de gracia por token de jugador caído.
const graciaTimers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Saca al socket de la sala en la que ya estaba, para que un mismo cliente no
 * acumule salas (`create_duel` en bucle dejaba una sala fantasma por llamada
 * durante 5 minutos, y con el tope global de 500 se podia dejar sin duelos a
 * todas las aulas). Devuelve false si esta jugando: de una partida en curso no
 * se sale creando otra.
 */
function liberarSalaPrevia(socket: Socket): boolean {
  const code = socketRoom.get(socket.id)
  if (!code) return true
  const room = rooms.get(code)
  if (!room) { socketRoom.delete(socket.id); return true }
  if (room.phase === 'playing' || room.phase === 'countdown') return false
  removePlayer(room, socket.id)
  socket.leave(code)
  socketRoom.delete(socket.id)
  if (room.players.size === 0) {
    if (room.timerHandle) clearTimeout(room.timerHandle)
    rooms.delete(code)
  }
  return true
}

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
  contar('duelo_fin', { razon: reason, jugadores: room.players.size })

  // El ranking se avisa aparte y sin esperar: que falle no puede demorar ni
  // romper el final de la partida, que ya se le mostro a los jugadores.
  void publicarResultado(room)

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
  conectados++
  socket.on('disconnect', () => { conectados-- })

  // ── Create duel ──────────────────────────────────────────────────────────
  // El cliente elige categorías, nivel y duración. El TABLERO lo arma el
  // servidor.
  //
  // Antes venía del cliente, con la marca de qué palabra era correcta incluida.
  // Sin tocar el código del juego, mandando otros datos por la API, se podía
  // crear un duelo con todo marcado como correcto y nivel 10, y cobrar 100
  // puntos por tocar un verbo en una partida de sustantivos. Si el cliente
  // decide qué vale puntos, no hay defensa posible.
  //
  // `words` y `decoyPool` que manden los clientes viejos se ignoran. No hace
  // falta que se actualicen: el tablero que dibujan es el que llega en
  // `duel_start`, que siempre fue el del servidor.
  socket.on('create_duel', seguro(socket, 'create_duel', (data: unknown) => {
    const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>

    if (rooms.size >= MAX_ROOMS) {
      socket.emit('error', 'El servidor está lleno, probá en un rato')
      return
    }
    if (!liberarSalaPrevia(socket)) { socket.emit('error', 'Ya estás en un duelo en curso'); return }
    const ip = ipDelCliente(socket.handshake.headers, socket.handshake.address)
    let delMismoOrigen = 0
    for (const r of rooms.values()) if (r.creatorIp === ip) delMismoOrigen++
    if (delMismoOrigen >= MAX_SALAS_POR_IP) {
      socket.emit('error', 'Hay demasiados duelos abiertos desde esta red, probá en un rato')
      return
    }

    const cats = categorias(d['cats'], d['cat'])
    const nivel = nivelValido(d['nivel'])

    const duelWords = construirTablero(cats, nivel)
    if (!duelWords) { socket.emit('error', 'Elegí al menos una categoría válida'); return }

    const code = getUniqueCode()
    const room = createRoom(code)
    room.creatorIp = ip

    setBoard(
      room,
      duelWords,
      numeroEnRango(d['duracion'], MIN_DURACION, MAX_DURACION, 60),
      categoriasConocidas(cats),
      nivel,
    )

    // Señuelos del DECOY: palabras de las mismas categorías fuera del tablero.
    room.decoyPool = construirMazoSeñuelos(cats, duelWords.map(w => w.text))

    // Aula a la que se publica el resultado. La elige el cliente igual que en
    // el modo de un jugador: es el codigo que el docente le dio al curso.
    room.salaCode = codigoDeAula(d['salaCode'])

    const slot = addPlayer(room, socket.id, nombreJugador(d['nombre']))
    if (!slot) { socket.emit('error', 'No se pudo crear la sala'); return }

    rooms.set(code, room)
    socketRoom.set(socket.id, code)
    socket.join(code)
    contar('duelo_creado')
    socket.emit('duel_created', { code, slot, token: room.players.get(slot)!.token })

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

    // Antes de buscar la sala: si el socket ya estaba en esta misma, se lo saca
    // (no puede unirse a su propia sala como rival) y la busqueda no la encuentra.
    if (!liberarSalaPrevia(socket)) { socket.emit('error', 'Ya estás en un duelo en curso'); return }

    const room = rooms.get(code)
    if (!room) { contar('union_rechazada', { motivo: 'no_existe' }); socket.emit('error', 'Sala no encontrada'); return }
    if (room.phase !== 'waiting') { socket.emit('error', 'La partida ya comenzó'); return }
    if (room.players.size >= 2) { socket.emit('error', 'Sala llena'); return }

    const nombre = nombreJugador(d['nombre'])
    const slot = addPlayer(room, socket.id, nombre)
    if (!slot) { socket.emit('error', 'No se pudo unir'); return }

    socketRoom.set(socket.id, code)
    socket.join(code)

    const rival = getRival(room, slot)
    contar('duelo_unido')
    socket.emit('duel_joined', { slot, rivalNombre: rival ? rival.nombre : '', token: room.players.get(slot)!.token })
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
          // Sin `isCorrect`: antes viajaba la respuesta de cada ficha a los dos
          // jugadores y un alumno con DevTools las tocaba todas bien. El
          // servidor dice si acerto en `word_taken`, despues de capturar.
          words: room.words.map(({ id, text, takenBy }) => ({ id, text, takenBy })),
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

    // Ritmo humano: mas rapido que esto es un script, no se procesa.
    if (!limiteCaptura.permitir(socket.id)) { contar('captura_descartada_por_ritmo'); return }

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
      correct: result.pointsEarned > 0,
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
    limiteCaptura.olvidar(socket.id)
    const code = socketRoom.get(socket.id)
    if (!code) return
    socketRoom.delete(socket.id)

    const room = rooms.get(code)
    if (!room) return

    // En plena partida no se termina al instante: un corte de wifi de unos
    // segundos mataba el duelo (el rival veía «¡Empate! 0-0» y quien se cayó
    // quedaba colgado jugando en una sala que ya no existía). Se le da tiempo a
    // volver con su token (`rejoin_duel`).
    if (room.phase === 'playing') {
      const caido = marcarDesconectado(room, socket.id)
      if (caido) {
        socket.to(code).emit('rival_reconnecting', { segundos: Math.round(GRACIA_RECONEXION_MS / 1000) })
        graciaTimers.set(caido.token, setTimeout(() => {
          graciaTimers.delete(caido.token)
          if (rooms.get(code) !== room || room.phase !== 'playing' || caido.desconectadoEn === null) return
          removePlayer(room, caido.socketId)
          endDuel(room, 'disconnect')
          io.to(code).emit('rival_disconnected')
        }, GRACIA_RECONEXION_MS))
        return
      }
    }

    removePlayer(room, socket.id)
    if (room.players.size === 0) rooms.delete(code)
  }))

  // ── Rejoin: volver a un duelo en curso después de perder la conexión ──────
  socket.on('rejoin_duel', seguro(socket, 'rejoin_duel', (data: unknown) => {
    const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
    const code = codigoSala(d['code'])
    const token = typeof d['token'] === 'string' ? d['token'].slice(0, 64) : ''
    const room = code ? rooms.get(code) : undefined
    if (!room || room.phase !== 'playing') { contar('reconexion_fallida', { motivo: 'sin_duelo' }); socket.emit('rejoin_failed'); return }

    const r = reconectar(room, token, socket.id)
    if (!r) { contar('reconexion_fallida', { motivo: 'token' }); socket.emit('rejoin_failed'); return }

    const t = graciaTimers.get(r.jugador.token)
    if (t) { clearTimeout(t); graciaTimers.delete(r.jugador.token) }
    // Si el servidor todavía no se había dado cuenta de la caída, el socket
    // viejo sigue «vivo»: se lo cierra. Su `disconnect` no hace nada porque ya no
    // pertenece a ningún jugador.
    if (r.socketAnterior !== socket.id) {
      socketRoom.delete(r.socketAnterior)
      io.sockets.sockets.get(r.socketAnterior)?.disconnect(true)
    }
    socketRoom.set(socket.id, room.code)
    socket.join(room.code)
    registerSocket(socket.id)

    const rival = getRival(room, r.jugador.slot)
    const restante = room.startedAt === null ? room.duracion
      : Math.max(0, Math.round(room.duracion - (Date.now() - room.startedAt) / 1000))
    contar('reconexion_ok')
    socket.emit('duel_resync', {
      slot: r.jugador.slot,
      rivalNombre: rival ? rival.nombre : '',
      // Sin `isCorrect`, igual que en duel_start.
      words: room.words.map(({ id, text, takenBy }) => ({ id, text, takenBy })),
      scores: getScores(room),
      powers: r.jugador.powerInventory,
      segundosRestantes: restante,
      cats: room.cats,
      nivel: room.nivel,
    })
    socket.to(room.code).emit('rival_back')
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
