import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { crearManejadorHttp, contadores, limpiarTexto } from '../observabilidad'

let srv: Server
let base = ''

beforeAll(async () => {
  srv = createServer(crearManejadorHttp({ salas: () => 3, sockets: () => 7 }, () => 'ip-de-prueba'))
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
})
afterAll(() => { srv.close() })

describe('/health', () => {
  it('responde (antes colgaba) con salas, sockets y contadores', async () => {
    const r = await fetch(base + '/health')
    expect(r.status).toBe(200)
    const j = await r.json() as { ok: boolean; salas: number; sockets: number; uptimeSeg: number; contadores: object }
    expect(j.ok).toBe(true)
    expect(j.salas).toBe(3)
    expect(j.sockets).toBe(7)
    expect(typeof j.uptimeSeg).toBe('number')
    expect(j.contadores).toBeTypeOf('object')
  })

  it('no filtra nombres, IPs ni tokens', async () => {
    const t = await (await fetch(base + '/health')).text()
    expect(t).not.toMatch(/ip-de-prueba|token|nombre/i)
  })

  it('cualquier otra ruta da 404 y no queda colgada', async () => {
    expect((await fetch(base + '/otra')).status).toBe(404)
  })
})

describe('/report (errores anónimos del cliente)', () => {
  const post = (cuerpo: string) => fetch(base + '/report', { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'text/plain' } })

  it('acepta un reporte corto y lo cuenta', async () => {
    const antes = contadores['error_cliente'] ?? 0
    const r = await post(JSON.stringify({ m: 'x is not a function', f: 'index.js', l: 12, d: 'm' }))
    expect(r.status).toBe(204)
    expect(contadores['error_cliente']).toBe(antes + 1)
  })

  it('un cuerpo ilegible se cuenta aparte y no rompe nada', async () => {
    const antes = contadores['error_cliente_ilegible'] ?? 0
    expect((await post('esto no es json')).status).toBe(204)
    expect(contadores['error_cliente_ilegible']).toBe(antes + 1)
  })

  it('rechaza cuerpos grandes (413)', async () => {
    const r = await post(JSON.stringify({ m: 'a'.repeat(5000) })).catch(() => null)
    // el servidor corta la conexión al pasarse; según el momento se ve 413 o un corte
    expect(r === null || r.status === 413).toBe(true)
  })

  it('pone tope por IP: el reporte 21 en un minuto da 429', async () => {
    const estados: number[] = []
    for (let i = 0; i < 25; i++) estados.push((await post(JSON.stringify({ m: 'x' }))).status)
    expect(estados).toContain(429)
  })
})

describe('limpiarTexto', () => {
  it('acota, saca saltos de línea y caracteres de marcado', () => {
    expect(limpiarTexto('a\nb\r\n<img src="x">`c`', 100)).toBe('a b img src=xc')
    expect(limpiarTexto('x'.repeat(500), 200)).toHaveLength(200)
    expect(limpiarTexto({ a: 1 }, 10)).toBe('')
  })
})
