// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'

// Recargar la página en plena partida: se vuelve al duelo (con un cartel mientras se reconecta) y el
// rival ve, todo el tiempo que dura la espera, cuánto falta, no solo un segundo.

const h = vi.hoisted(() => ({
  handlers: new Map<string, Array<(...a: unknown[]) => void>>(),
  restaurar: vi.fn(() => true),
  disconnect: vi.fn(),
  mostrar: vi.fn(),
  banner: vi.fn(),
}))

vi.mock('../services/DuelService', () => ({
  duelService: {
    on: (ev: string, fn: (...a: unknown[]) => void) => { h.handlers.set(ev, [...(h.handlers.get(ev) ?? []), fn]) },
    off: () => {}, catchWord: vi.fn(), usePower: vi.fn(),
    restaurar: () => h.restaurar(), disconnect: () => h.disconnect(),
  },
}))
vi.mock('./ScreenManager', () => ({ mostrar: (...a: unknown[]) => h.mostrar(...a) }))
vi.mock('../ui/Banner', () => ({ showBanner: (...a: unknown[]) => h.banner(...a) }))
vi.mock('../ui/Dialog', () => ({ showAlert: vi.fn(async () => {}) }))
vi.mock('../utils/vibracion', () => ({ vibrar: vi.fn() }))

const emitir = (ev: string, ...a: unknown[]): void => { h.handlers.get(ev)?.forEach(f => f(...a)) }
const el = (id: string): HTMLElement => document.getElementById(id)!

const RESYNC = {
  slot: 'A', rivalNombre: 'ZZTEST_B', scores: { A: 10, B: 0 }, powers: [], segundosRestantes: 40, cats: ['sustantivos'], nivel: 1,
  words: [{ id: 'w1', text: 'casa', takenBy: null }, { id: 'w2', text: 'mesa', takenBy: 'B' }, { id: 'w3', text: 'luz', takenBy: 'A' }],
}

let mod: typeof import('./DuelGameScreen')
let D: typeof import('../game/duelState').D
let G: typeof import('../game/state').G

beforeEach(async () => {
  vi.useFakeTimers()
  h.handlers.clear(); h.restaurar.mockReset().mockReturnValue(true); h.disconnect.mockReset(); h.mostrar.mockReset(); h.banner.mockReset()
  const html = readFileSync('index.html', 'utf8')
  document.body.innerHTML = (/<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/g, '')
  vi.resetModules()
  mod = await import('./DuelGameScreen')
  D = (await import('../game/duelState')).D
  G = (await import('../game/state')).G
  G.jugador = 'ZZTEST_A'
  mod.initDuelGameScreen()
})
afterEach(() => { vi.useRealTimers() })

describe('volver al duelo después de recargar', () => {
  it('sin duelo guardado no hace nada', () => {
    h.restaurar.mockReturnValue(false)
    expect(mod.intentarRestaurarDuelo()).toBe(false)
    expect(h.mostrar).not.toHaveBeenCalled()
    expect(D.phase).toBe('idle')
  })

  it('con duelo guardado muestra la pantalla del duelo con un cartel «Volviendo al duelo»', () => {
    expect(mod.intentarRestaurarDuelo()).toBe(true)
    expect(h.mostrar).toHaveBeenCalledWith('duelGameScreen')
    expect(el('duelDisconnectOverlay').style.display).toBe('flex')
    expect(el('duelDisconnectOverlay').textContent).toContain('Volviendo al duelo')
    expect(el('btnDuelDisconnectBack').style.display).toBe('none')   // mientras espera no se ofrece salir
    expect(D.phase).toBe('playing')
    expect(D.myNombre).toBe('ZZTEST_A')
  })

  it('cuando el servidor devuelve el estado, arma el tablero, el marcador, el reloj y los nombres', () => {
    mod.intentarRestaurarDuelo()
    emitir('duel_resync', RESYNC)
    expect(el('duelDisconnectOverlay').style.display).toBe('none')
    expect(el('duelHudNombreMe').textContent).toBe('ZZTEST_A')
    expect(el('duelHudNombreRival').textContent).toBe('ZZTEST_B')
    expect(el('duelHudCat').textContent).toBe('Sustantivos · Nv 1')
    expect(el('duelHudScoreMe').textContent).toBe('10')
    expect(el('duelHudTimer').textContent).toBe('0:40')
    const chips = [...document.querySelectorAll('.duel-board .duel-chip')]
    expect(chips).toHaveLength(3)
    expect(document.querySelector('[data-word-id="w1"]')!.classList.contains('free')).toBe(true)
    expect(document.querySelector('[data-word-id="w2"]')!.classList.contains('taken-rival')).toBe(true)
    expect(document.querySelector('[data-word-id="w3"]')!.classList.contains('taken-me')).toBe(true)
    expect(D.phase).toBe('playing')
    expect(D.cats).toEqual(['sustantivos'])
  })

  it('si el duelo ya terminó (rechazan el reingreso) lo dice y ofrece volver al menú', () => {
    mod.intentarRestaurarDuelo()
    emitir('rejoin_failed')
    expect(el('duelDisconnectOverlay').textContent).toContain('El duelo ya terminó')
    expect(el('btnDuelDisconnectBack').style.display).toBe('')
    expect(D.phase).toBe('ended')
  })

  it('si el servidor no contesta en un rato, no deja al alumno colgado', () => {
    mod.intentarRestaurarDuelo()
    vi.advanceTimersByTime(30_000)
    expect(el('duelDisconnectOverlay').textContent).toContain('No se pudo volver al duelo')
    expect(el('btnDuelDisconnectBack').style.display).toBe('')
  })

  it('con duelo guardado pero sin nombre de jugador no intenta volver (no hay quién)', () => {
    G.jugador = ''
    expect(mod.intentarRestaurarDuelo()).toBe(false)
    expect(h.disconnect).toHaveBeenCalled()      // y limpia lo guardado
  })
})

describe('la espera por el rival se ve todo el tiempo, con cuenta regresiva', () => {
  const enPartida = (): void => { D.phase = 'playing' }

  it('muestra cuántos segundos se lo espera y baja cada segundo', () => {
    enPartida()
    emitir('rival_reconnecting', { segundos: 20 })
    const e = el('duelRivalEstado')
    expect(e.style.display).not.toBe('none')
    expect(e.textContent).toContain('20 s')
    vi.advanceTimersByTime(5000)
    expect(e.textContent).toContain('15 s')
    vi.advanceTimersByTime(14_000)
    expect(e.textContent).toContain('1 s')
    expect(e.getAttribute('role')).toBe('status')
  })

  it('se oculta si el rival vuelve', () => {
    enPartida()
    emitir('rival_reconnecting', { segundos: 20 })
    emitir('rival_back')
    expect(el('duelRivalEstado').style.display).toBe('none')
    vi.advanceTimersByTime(5000)
    expect(el('duelRivalEstado').style.display).toBe('none')   // y no se vuelve a pintar solo
  })

  it('se oculta si el duelo termina o el rival se da por desconectado', () => {
    for (const fin of ['duel_end', 'rival_disconnected']) {
      enPartida()
      emitir('rival_reconnecting', { segundos: 20 })
      emitir(fin, { winner: 'A', scores: { A: 0, B: 0 }, reason: 'disconnect' })
      expect(el('duelRivalEstado').style.display, fin).toBe('none')
    }
  })

  it('un aviso con segundos raros no rompe nada', () => {
    enPartida()
    for (const s of [0, -3, NaN, 1e9, 'x']) {
      expect(() => emitir('rival_reconnecting', { segundos: s })).not.toThrow()
    }
  })
})

describe('el cliente espera más que el servidor', () => {
  it('su propio plazo para volver (30 s) supera la gracia del servidor (20 s)', () => {
    const src = readFileSync('src/screens/DuelGameScreen.ts', 'utf8')
    expect(src).toMatch(/const ESPERA_RECONEXION_MS = 30000/)
  })
})
