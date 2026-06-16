import { io, Socket } from 'socket.io-client'
import type { DuelWord, DuelScores, PowerId, PlayerSlot } from '../types/duel'

const SERVER_URL = 'https://aulaplay.duckdns.org'
const SOCKET_PATH = '/duel/socket.io'

export type DuelEventMap = {
  duel_created:       (data: { code: string; slot: PlayerSlot }) => void
  duel_joined:        (data: { slot: PlayerSlot; rivalNombre: string }) => void
  rival_joined:       (data: { nombre: string }) => void
  countdown_start:    () => void
  duel_start:         (data: { words: DuelWord[]; duracion: number; cats: string[]; nivel: number }) => void
  word_taken:         (data: { wordId: string; bySlot: PlayerSlot; stolenByRival: boolean; scores: DuelScores }) => void
  word_already_taken: (wordId: string) => void
  power_earned:       (powerId: PowerId) => void
  power_used:         (powerId: PowerId) => void
  power_effect:       (data: { powerId: PowerId; fromSlot: PlayerSlot; decoyWords: string[] }) => void
  power_blocked:      (powerId: PowerId) => void
  power_failed:       (data: { powerId: PowerId; reason: string }) => void
  shield_consumed:    (powerId: PowerId) => void
  duel_end:           (data: { winner: 'A' | 'B' | 'draw'; scores: DuelScores; reason: string }) => void
  rival_disconnected: () => void
  rematch_requested:  () => void
  rematch_start:      () => void
  error:              (msg: string) => void
  connect:            () => void
  disconnect:         () => void
}

class DuelService {
  private socket: Socket | null = null
  private handlers = new Map<string, Set<Function>>()

  connect(): void {
    if (this.socket?.connected) return
    this.socket = io(SERVER_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
    })
    this.socket.onAny((event: string, ...args: unknown[]) => {
      this.handlers.get(event)?.forEach(h => h(...args))
    })
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    // handlers kept intentionally — init-time registrations must survive reconnects
  }

  on<K extends keyof DuelEventMap>(event: K, handler: DuelEventMap[K]): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler as Function)
  }

  off<K extends keyof DuelEventMap>(event: K, handler: DuelEventMap[K]): void {
    this.handlers.get(event)?.delete(handler as Function)
  }

  createDuel(data: {
    nombre: string
    cats: string[]
    nivel: number
    duracion: number
    words: Array<{ id: string; text: string; isCorrect: boolean }>
  }): void {
    this.socket?.emit('create_duel', data)
  }

  joinDuel(code: string, nombre: string): void {
    this.socket?.emit('join_duel', { code, nombre })
  }

  ready(): void {
    this.socket?.emit('player_ready')
  }

  catchWord(wordId: string): void {
    this.socket?.emit('word_caught', wordId)
  }

  usePower(powerId: PowerId): void {
    this.socket?.emit('use_power', powerId)
  }

  debugBotJoin(code: string): void {
    this.socket?.emit('debug_bot_join', { code })
  }

  requestRematch(): void {
    this.socket?.emit('request_rematch')
  }

  acceptRematch(): void {
    this.socket?.emit('accept_rematch')
  }

  get connected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const duelService = new DuelService()
