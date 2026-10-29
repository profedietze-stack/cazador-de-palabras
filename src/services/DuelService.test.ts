import { describe, it, expect, vi, beforeEach } from 'vitest'

// socket.io-client falso: captura los manejadores y lo que se emite.
type Fn = (...a: unknown[]) => void
const sock = {
  handlers: new Map<string, Fn[]>(),
  onAnyFn: null as null | ((ev: string, ...a: unknown[]) => void),
  emitted: [] as Array<[string, unknown]>,
  connected: false,
  on(ev: string, fn: Fn) { this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]); return this },
  onAny(fn: (ev: string, ...a: unknown[]) => void) { this.onAnyFn = fn },
  emit(ev: string, data?: unknown) { this.emitted.push([ev, data]) },
  disconnect() { this.connected = false },
  // utilidades del test
  recibir(ev: string, ...args: unknown[]) { this.onAnyFn?.(ev, ...args) },
  conectar() { this.connected = true; this.handlers.get('connect')?.forEach(f => f()) },
}
vi.mock('socket.io-client', () => ({ io: () => sock }))

const { duelService } = await import('./DuelService')

beforeEach(() => {
  duelService.disconnect()
  sock.emitted.length = 0
  sock.handlers.clear()
  sock.connected = false
})

const rejoins = () => sock.emitted.filter(([ev]) => ev === 'rejoin_duel')

describe('reconexión del duelo (cliente)', () => {
  it('después de perder la conexión en plena partida se presenta con el código y el token', () => {
    duelService.connect()
    sock.conectar()
    sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
    sock.recibir('duel_start', { words: [] })
    sock.emitted.length = 0
    sock.conectar()                    // socket.io reconectó
    expect(rejoins()).toEqual([['rejoin_duel', { code: 'ABCDE', token: 'tok-aaaaaaaa' }]])
  })

  it('el que se unió usa el código que tipeó (en mayúsculas) y su propio token', () => {
    duelService.connect()
    sock.conectar()
    duelService.joinDuel('abcde', 'ZZTEST_B')
    sock.recibir('duel_joined', { slot: 'B', rivalNombre: 'A', token: 'tok-bbbbbbbb' })
    sock.recibir('duel_start', { words: [] })
    sock.emitted.length = 0
    sock.conectar()
    expect(rejoins()).toEqual([['rejoin_duel', { code: 'ABCDE', token: 'tok-bbbbbbbb' }]])
  })

  it('en el lobby (antes de empezar) una reconexión NO intenta volver a ningún duelo', () => {
    duelService.connect()
    sock.conectar()
    sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
    sock.emitted.length = 0
    sock.conectar()
    expect(rejoins()).toEqual([])
  })

  it('terminado el duelo, o rechazado el reingreso, no se vuelve a intentar', () => {
    for (const fin of ['duel_end', 'rival_disconnected', 'rejoin_failed']) {
      duelService.disconnect()
      duelService.connect()
      sock.conectar()
      sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
      sock.recibir('duel_start', { words: [] })
      sock.recibir(fin, {})
      sock.emitted.length = 0
      sock.conectar()
      expect(rejoins(), fin).toEqual([])
    }
  })

  it('salir a propósito borra el token: no queda nada para reutilizar', () => {
    duelService.connect()
    sock.conectar()
    sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
    sock.recibir('duel_start', { words: [] })
    duelService.disconnect()
    duelService.connect()
    sock.emitted.length = 0
    sock.conectar()
    expect(rejoins()).toEqual([])
  })
})
