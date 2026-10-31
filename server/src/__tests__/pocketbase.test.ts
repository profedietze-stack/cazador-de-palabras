import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { crearManejadorHttp } from '../observabilidad'
import { createRoom, addPlayer } from '../DuelRoom'

// Caso real (31-oct-2026): el contenedor de duelos y el de PocketBase estaban en redes de Docker
// distintas. `fetch('http://pocketbase:8090')` fallaba con ENOTFOUND, el servidor lo tomaba como
// «el aula no existe» y los resultados de los duelos no llegaban nunca al ranking del docente, sin
// ningún aviso. Estos tests fijan que «no pude preguntar» no se confunda con «no existe».

type Ranking = typeof import('../ranking')

/** Módulo nuevo en cada prueba: el estado de «PocketBase alcanzable» es del módulo. */
async function ranking(): Promise<Ranking> {
  vi.resetModules()
  return await import('../ranking')
}

/** Los contadores de la MISMA copia del módulo que usa `ranking()` (resetModules crea una nueva). */
async function contadoresActuales(): Promise<Record<string, number>> {
  return (await import('../observabilidad')).contadores
}

const sinRed = (codigo: string): Error => Object.assign(new TypeError('fetch failed'), { cause: { code: codigo } })

let errores: string[]
let avisos: string[]

beforeEach(() => {
  errores = []
  avisos = []
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errores.push(a.join(' ')) })
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { avisos.push(a.join(' ')) })
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('consultarSala distingue «no existe» de «no pude preguntar»', () => {
  it('sin resolver el nombre (ENOTFOUND) es «error», no «no»: y el aviso dice el motivo', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => { throw sinRed('ENOTFOUND') }))
    expect(await r.consultarSala('AULA2026')).toBe('error')
    expect(r.estadoPocketBase()).toBe('inalcanzable')
    expect(errores).toHaveLength(1)
    expect(errores[0]).toContain('POCKETBASE INALCANZABLE')
    expect(errores[0]).toContain('ENOTFOUND')
    expect(errores[0]).toContain('docs/operaciones/servidor-docker.md')
  })

  it('el aviso sale una sola vez por caída, no una por cada duelo', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => { throw sinRed('ECONNREFUSED') }))
    await r.consultarSala('AULA2026'); await r.consultarSala('AULA2026'); await r.consultarSala('AULA2026')
    expect(errores).toHaveLength(1)
  })

  it('un aula que no existe es «no» y PocketBase queda «ok», sin ningún aviso de error', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })))
    expect(await r.consultarSala('NOEXISTE1')).toBe('no')
    expect(r.estadoPocketBase()).toBe('ok')
    expect(errores).toHaveLength(0)
  })

  it('un aula activa es «activa»', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [{}] }) })))
    expect(await r.consultarSala('AULA2026')).toBe('activa')
    expect(await r.salaActiva('AULA2026')).toBe(true)
  })

  it('una respuesta de error de PocketBase (500, 403) es «error» con su código', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    expect(await r.consultarSala('AULA2026')).toBe('error')
    expect(errores[0]).toContain('http_500')
  })

  it('un código con formato raro no se pregunta y es «no» (no es un problema de red)', async () => {
    const r = await ranking()
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    expect(await r.consultarSala('X" || id != "')).toBe('no')
    expect(f).not.toHaveBeenCalled()
    expect(r.estadoPocketBase()).toBe('sin_verificar')
  })
})

describe('verificarPocketBase', () => {
  it('sano: true y «ok»; caído: false y «inalcanzable»; al volver avisa que se retoma', async () => {
    const r = await ranking()
    expect(r.estadoPocketBase()).toBe('sin_verificar')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    f.mockResolvedValueOnce({ ok: true })
    expect(await r.verificarPocketBase()).toBe(true)
    expect(r.estadoPocketBase()).toBe('ok')
    f.mockRejectedValueOnce(sinRed('ENOTFOUND'))
    expect(await r.verificarPocketBase()).toBe(false)
    expect(r.estadoPocketBase()).toBe('inalcanzable')
    f.mockResolvedValueOnce({ ok: true })
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')) })
    expect(await r.verificarPocketBase()).toBe(true)
    expect(logs.join(' ')).toContain('volvio a ser alcanzable')
  })

  it('pregunta por /api/health con un tope de espera', async () => {
    const r = await ranking()
    const f = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', f)
    await r.verificarPocketBase()
    const [url, init] = f.mock.calls[0] as unknown as [string, { signal?: AbortSignal }]
    expect(url).toMatch(/\/api\/health$/)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('vigilarPocketBase comprueba al arrancar y después cada tanto', async () => {
    vi.useFakeTimers()
    try {
      const r = await ranking()
      const f = vi.fn(async () => ({ ok: true }))
      vi.stubGlobal('fetch', f)
      const t = r.vigilarPocketBase(1000)
      expect(f).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(3100)
      expect(f.mock.calls.length).toBeGreaterThanOrEqual(4)
      clearInterval(t)
    } finally { vi.useRealTimers() }
  })
})

describe('el resultado del duelo cuando PocketBase no se alcanza', () => {
  it('no publica, no dice «el aula no existe» y suma un contador visible en /health', async () => {
    const r = await ranking()
    const metodos: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: { method?: string }) => {
      metodos.push(init?.method ?? 'GET')
      throw sinRed('ENOTFOUND')
    }))
    const contadores = await contadoresActuales()
    const antes = contadores['ranking_no_publicado'] ?? 0
    const room = createRoom('ABCDE')
    addPlayer(room, 's1', 'ZZTEST_A')
    room.salaCode = 'AULA2026'
    room.startedAt = Date.now() - 60_000
    await r.publicarResultado(room)
    expect(metodos).not.toContain('POST')
    expect(avisos.join(' ')).not.toContain('no existe')
    expect(contadores['ranking_no_publicado']).toBe(antes + 1)
    expect(errores.join(' ')).toContain('POCKETBASE INALCANZABLE')
  })

  it('con el aula inexistente SÍ dice que no existe (y no toca el contador de infraestructura)', async () => {
    const r = await ranking()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })))
    const contadores = await contadoresActuales()
    const antes = contadores['ranking_no_publicado'] ?? 0
    const room = createRoom('ABCDE')
    addPlayer(room, 's1', 'ZZTEST_A')
    room.salaCode = 'NOEXISTE1'
    room.startedAt = Date.now() - 60_000
    await r.publicarResultado(room)
    expect(avisos.join(' ')).toContain('no existe')
    expect(contadores['ranking_no_publicado'] ?? 0).toBe(antes)
  })
})

describe('/health muestra si se alcanza a PocketBase', () => {
  let servidor: Server
  afterEach(() => new Promise<void>(res => { servidor?.close(() => res()) }))

  const levantar = async (estado: string | null): Promise<string> => {
    servidor = createServer(crearManejadorHttp(
      { salas: () => 0, sockets: () => 0, ...(estado ? { pocketbase: () => estado } : {}) },
      () => '127.0.0.1',
    ))
    await new Promise<void>(res => servidor.listen(0, '127.0.0.1', () => res()))
    return `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
  }

  it('«inalcanzable» llega tal cual para que lo vea un chequeo externo', async () => {
    const base = await levantar('inalcanzable')
    const j = await (await fetch(base + '/health')).json() as { pocketbase: string }
    expect(j.pocketbase).toBe('inalcanzable')
  })

  it('sin estado configurado dice «sin_verificar» (no inventa un «ok»)', async () => {
    const base = await levantar(null)
    const j = await (await fetch(base + '/health')).json() as { pocketbase: string }
    expect(j.pocketbase).toBe('sin_verificar')
  })
})
