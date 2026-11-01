// @vitest-environment jsdom
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
  sessionStorage.clear()
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

// Recargar la página en plena partida borraba el token (estaba solo en memoria) y el jugador no podía
// volver aunque el servidor lo esperaba. Ahora se guarda en sessionStorage (de esa pestaña, se borra
// al cerrarla) mientras dura el duelo.
const CLAVE = 'cdp_duelo_en_curso'
const guardado = (): unknown => JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null')

describe('el duelo en curso sobrevive a una recarga de la página', () => {
  const empezar = (): void => {
    duelService.connect()
    sock.conectar()
    sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
    sock.recibir('duel_start', { words: [] })
  }

  it('al empezar la partida guarda el código y el token; en el lobby todavía no', () => {
    duelService.connect()
    sock.conectar()
    sock.recibir('duel_created', { code: 'ABCDE', slot: 'A', token: 'tok-aaaaaaaa' })
    expect(guardado()).toBeNull()
    sock.recibir('duel_start', { words: [] })
    expect(guardado()).toEqual({ code: 'ABCDE', token: 'tok-aaaaaaaa' })
  })

  it('el que se unió guarda el código en mayúsculas y su propio token', () => {
    duelService.connect()
    sock.conectar()
    duelService.joinDuel('abcde', 'ZZTEST_B')
    sock.recibir('duel_joined', { slot: 'B', rivalNombre: 'A', token: 'tok-bbbbbbbb' })
    sock.recibir('duel_start', { words: [] })
    expect(guardado()).toEqual({ code: 'ABCDE', token: 'tok-bbbbbbbb' })
  })

  it('no guarda nada más que el código y el token (ni nombres ni puntajes)', () => {
    empezar()
    expect(Object.keys(guardado() as object).sort()).toEqual(['code', 'token'])
  })

  it('se borra al terminar el duelo, al desconectarse el rival, al ser rechazado el reingreso y al salir', () => {
    for (const fin of ['duel_end', 'rival_disconnected', 'rejoin_failed']) {
      duelService.disconnect(); empezar()
      expect(guardado(), fin).not.toBeNull()
      sock.recibir(fin, {})
      expect(guardado(), fin).toBeNull()
    }
    duelService.disconnect(); empezar()
    duelService.disconnect()
    expect(guardado()).toBeNull()
  })

  it('restaurar() sin nada guardado devuelve false y no abre ninguna conexión', () => {
    expect(duelService.restaurar()).toBe(false)
    expect(duelService.connected).toBe(false)
    expect(sock.handlers.size).toBe(0)
  })

  it('restaurar() con un duelo guardado reconecta y se presenta con el token apenas conecta', () => {
    sessionStorage.setItem(CLAVE, JSON.stringify({ code: 'ABCDE', token: 'tok-aaaaaaaa' }))
    expect(duelService.restaurar()).toBe(true)
    expect(rejoins()).toEqual([])               // todavía no conectó
    sock.conectar()
    expect(rejoins()).toEqual([['rejoin_duel', { code: 'ABCDE', token: 'tok-aaaaaaaa' }]])
  })

  it('después de restaurar, un corte posterior también vuelve a presentarse', () => {
    sessionStorage.setItem(CLAVE, JSON.stringify({ code: 'ABCDE', token: 'tok-aaaaaaaa' }))
    duelService.restaurar()
    sock.conectar()
    sock.emitted.length = 0
    sock.conectar()
    expect(rejoins()).toHaveLength(1)
  })

  it('un guardado ilegible, con otro formato o demasiado largo se ignora y se limpia', () => {
    for (const malo of ['no es json', '{"code":5,"token":"x"}', '{"code":"ABCDE"}', '[]', 'null',
      JSON.stringify({ code: 'ABCDE', token: 'x'.repeat(200) }), JSON.stringify({ code: 'ab cd<', token: 'tok-aaaaaaaa' }),
      JSON.stringify({ code: 'ABCDE', token: 'tok aaaa<script>' })]) {
      sessionStorage.setItem(CLAVE, malo)
      expect(duelService.restaurar(), malo).toBe(false)
      expect(sessionStorage.getItem(CLAVE), malo).toBeNull()
    }
  })

  it('si el almacenamiento no está disponible no rompe nada', () => {
    const roto = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('lleno') })
    expect(() => empezar()).not.toThrow()
    roto.mockRestore()
  })
})
