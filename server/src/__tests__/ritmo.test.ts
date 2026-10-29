import { describe, it, expect, vi, afterEach } from 'vitest'
import { crearLimitadorCaptura, ipDelCliente, MIN_INTERVALO_CAPTURA_MS } from '../ritmo'
import { salaActiva, publicarResultado } from '../ranking'
import { createRoom, addPlayer } from '../DuelRoom'

describe('limitador de capturas', () => {
  it('rechaza la segunda captura si llega antes del minimo', () => {
    const l = crearLimitadorCaptura()
    expect(l.permitir('s1', 1000)).toBe(true)
    expect(l.permitir('s1', 1000 + MIN_INTERVALO_CAPTURA_MS - 1)).toBe(false)
    expect(l.permitir('s1', 1000 + MIN_INTERVALO_CAPTURA_MS)).toBe(true)
  })

  it('cada socket tiene su propio reloj', () => {
    const l = crearLimitadorCaptura()
    expect(l.permitir('a', 0)).toBe(true)
    expect(l.permitir('b', 1)).toBe(true)
  })

  it('catorce capturas en 1,5 s (el script de la auditoria) pasan como mucho 8', () => {
    const l = crearLimitadorCaptura()
    let pasan = 0
    for (let i = 0; i < 14; i++) if (l.permitir('x', i * 107)) pasan++
    expect(pasan).toBeLessThanOrEqual(8)
  })
})

describe('ipDelCliente', () => {
  it('usa X-Real-IP y no X-Forwarded-For', () => {
    expect(ipDelCliente({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9, 1.2.3.4' }, '10.0.0.1')).toBe('1.2.3.4')
  })
  it('sin X-Real-IP cae en la direccion del socket, nunca en X-Forwarded-For', () => {
    expect(ipDelCliente({ 'x-forwarded-for': '9.9.9.9' }, '10.0.0.1')).toBe('10.0.0.1')
  })
})

describe('publicacion en el ranking del aula', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('un codigo con comillas no llega al filtro', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    expect(await salaActiva('X" || id != "')).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  it('no publica en un aula inexistente', async () => {
    const llamadas: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string }) => {
      llamadas.push(`${init?.method ?? 'GET'} ${url.split('?')[0]}`)
      return { ok: true, json: async () => ({ items: [] }), text: async () => '' }
    }))
    const room = createRoom('ABCDE')
    addPlayer(room, 's1', 'ZZTEST_A')
    room.salaCode = 'NOEXISTE1'
    room.startedAt = Date.now() - 60_000
    await publicarResultado(room)
    expect(llamadas.some(l => l.startsWith('POST'))).toBe(false)
  })

  it('no publica un duelo que duro unos segundos', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ items: [{}] }), text: async () => '' }))
    vi.stubGlobal('fetch', f)
    const room = createRoom('ABCDE')
    addPlayer(room, 's1', 'ZZTEST_A')
    room.salaCode = 'AULA2026'
    room.startedAt = Date.now() - 1500
    await publicarResultado(room)
    expect(f).not.toHaveBeenCalled()
  })

  it('publica cuando el aula existe y el duelo duro lo suficiente', async () => {
    const metodos: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: { method?: string }) => {
      metodos.push(init?.method ?? 'GET')
      return { ok: true, json: async () => ({ items: [{}] }), text: async () => '' }
    }))
    const room = createRoom('ABCDE')
    addPlayer(room, 's1', 'ZZTEST_A')
    room.salaCode = 'AULA2026'
    room.startedAt = Date.now() - 60_000
    await publicarResultado(room)
    expect(metodos).toEqual(['GET', 'POST'])
  })
})

describe('el resultado del duelo no lleva identificadores de dispositivo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('el POST al ranking no trae device_hash ni el id de socket', async () => {
    const cuerpos: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'POST' && init.body) cuerpos.push(init.body)
      return { ok: true, json: async () => ({ items: [{}] }), text: async () => '' }
    }))
    const room = createRoom('ABCDE')
    addPlayer(room, 'socket-secreto-123', 'ZZTEST_A')
    room.salaCode = 'AULA2026'
    room.startedAt = Date.now() - 60_000
    await publicarResultado(room)
    expect(cuerpos).toHaveLength(1)
    expect(cuerpos[0]).not.toMatch(/device_hash|socket-secreto-123/)
  })
})
