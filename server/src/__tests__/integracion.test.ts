import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRequire } from 'module'
import { resolve } from 'path'
import type { Socket as ClientSocket } from 'socket.io-client'

// Integracion contra el servidor real (sin red externa). El cliente de
// socket.io vive en el package de la raiz, no en el del servidor.
const requireRaiz = createRequire(resolve(process.cwd(), '../package.json'))
const { io: conectar } = requireRaiz('socket.io-client') as typeof import('socket.io-client')

const PUERTO = 3900 + Math.floor(Math.random() * 90)
const abiertos: ClientSocket[] = []

function cliente(): Promise<ClientSocket> {
  return new Promise((ok, mal) => {
    const s = conectar(`http://127.0.0.1:${PUERTO}`, { transports: ['websocket'], forceNew: true })
    abiertos.push(s)
    s.on('connect', () => ok(s))
    s.on('connect_error', mal)
  })
}
const una = <T = unknown>(s: ClientSocket, ev: string, ms = 4000) =>
  new Promise<T>((ok, mal) => {
    const t = setTimeout(() => mal(new Error(`timeout esperando ${ev}`)), ms)
    s.once(ev, (d: T) => { clearTimeout(t); ok(d) })
  })

async function duelo(nivel = 1) {
  const a = await cliente(), b = await cliente()
  const creado = una<{ code: string }>(a, 'duel_created')
  a.emit('create_duel', { nombre: 'ZZTEST_A', cats: ['sustantivos'], nivel, duracion: 30 })
  const { code } = await creado
  const unido = una(b, 'duel_joined')
  b.emit('join_duel', { code, nombre: 'ZZTEST_B' })
  await unido
  const inicio = una<{ words: Array<Record<string, unknown>> }>(a, 'duel_start', 8000)
  a.emit('player_ready'); b.emit('player_ready')
  return { a, b, code, inicio: await inicio }
}

beforeAll(async () => {
  process.env.PORT = String(PUERTO)
  process.env.DUELO_GRACIA_MS = '1500'   // la gracia real es de 15 s
  process.env.CORS_ORIGINS = 'http://localhost:5173'
  await import('../index')
  await new Promise(r => setTimeout(r, 200))
})
afterAll(() => { abiertos.forEach(s => s.close()) })

describe('servidor de duelos (integracion)', () => {
  it('duel_start no revela cual palabra es correcta', async () => {
    const { inicio } = await duelo()
    expect(inicio.words.length).toBeGreaterThan(0)
    for (const w of inicio.words) {
      expect(Object.keys(w)).not.toContain('isCorrect')
      expect(JSON.stringify(w)).not.toMatch(/correct/i)
    }
  }, 15000)

  it('las capturas a ritmo de script se descartan', async () => {
    const { a, inicio } = await duelo(3)
    let tomadas = 0
    a.on('word_taken', () => { tomadas++ })
    for (const w of inicio.words) a.emit('word_caught', w['id'])
    await new Promise(r => setTimeout(r, 600))
    // Todas salieron en el mismo instante: solo la primera puede pasar.
    expect(tomadas).toBeLessThanOrEqual(1)
  }, 15000)

  it('word_taken informa si la captura fue acierto', async () => {
    const { a, inicio } = await duelo()
    const tomada = una<{ correct: unknown }>(a, 'word_taken')
    a.emit('word_caught', inicio.words[0]!['id'])
    expect(typeof (await tomada).correct).toBe('boolean')
  }, 15000)

  it('un mismo socket no acumula salas', async () => {
    const a = await cliente()
    const codigos: string[] = []
    a.on('duel_created', (d: { code: string }) => codigos.push(d.code))
    for (let i = 0; i < 20; i++) a.emit('create_duel', { nombre: 'ZZTEST_Spam', cats: ['verbos'], nivel: 1 })
    await new Promise(r => setTimeout(r, 800))
    expect(codigos.length).toBe(20)
    // Las 19 anteriores se liberaron: solo la ultima sigue viva y se puede unir a ella.
    const b = await cliente()
    const errores: string[] = []
    b.on('error', (e: string) => errores.push(e))
    const viva = una(b, 'duel_joined', 1500)
    b.emit('join_duel', { code: codigos[19], nombre: 'ZZTEST_B' })
    await viva
    const b2 = await cliente()
    b2.on('error', (e: string) => errores.push(e))
    b2.emit('join_duel', { code: codigos[0], nombre: 'ZZTEST_C' })
    await new Promise(r => setTimeout(r, 400))
    expect(errores).toContain('Sala no encontrada')
  }, 15000)

  it('no se puede entrar como rival a la sala propia', async () => {
    const a = await cliente()
    const creado = una<{ code: string }>(a, 'duel_created')
    a.emit('create_duel', { nombre: 'ZZTEST_Solo', cats: ['verbos'], nivel: 1 })
    const { code } = await creado
    const err = una<string>(a, 'error', 1500)
    a.emit('join_duel', { code, nombre: 'ZZTEST_Solo' })
    expect(await err).toBe('Sala no encontrada')
  }, 15000)
})

// Un corte de wifi de unos segundos mataba el duelo (auditoría UX-7): el rival veía
// «¡Empate! 0-0» y quien se cayó quedaba jugando en una sala que ya no existía.
describe('reconexión en plena partida', () => {
  async function duelo2() {
    const a = await cliente(), b = await cliente()
    const creado = una<{ code: string; token: string }>(a, 'duel_created')
    a.emit('create_duel', { nombre: 'ZZTEST_A', cats: ['sustantivos'], nivel: 1, duracion: 40 })
    const { code, token: tokenA } = await creado
    const unido = una<{ token: string }>(b, 'duel_joined')
    b.emit('join_duel', { code, nombre: 'ZZTEST_B' })
    const { token: tokenB } = await unido
    const inicio = una<{ words: Array<Record<string, unknown>> }>(a, 'duel_start', 9000)
    a.emit('player_ready'); b.emit('player_ready')
    return { a, b, code, tokenA, tokenB, inicio: await inicio }
  }

  it('los tokens viajan una vez y son distintos para cada jugador', async () => {
    const { tokenA, tokenB } = await duelo2()
    expect(tokenA).toMatch(/^[0-9a-f]{24}$/)
    expect(tokenB).toMatch(/^[0-9a-f]{24}$/)
    expect(tokenA).not.toBe(tokenB)
  }, 15000)

  it('si A se cae y vuelve dentro de la gracia, el duelo sigue y recupera su estado', async () => {
    const { a, b, code, tokenA } = await duelo2()
    const aviso = una(b, 'rival_reconnecting')
    a.close()
    await aviso
    const a2 = await cliente()
    const resync = una<{ slot: string; words: Array<Record<string, unknown>>; segundosRestantes: number; scores: Record<string, number> }>(a2, 'duel_resync')
    const volvio = una(b, 'rival_back')
    a2.emit('rejoin_duel', { code, token: tokenA })
    const r = await resync
    await volvio
    expect(r.slot).toBe('A')
    expect(r.words.length).toBe(20)
    expect(r.words.every(w => !('isCorrect' in w))).toBe(true)
    expect(r.segundosRestantes).toBeGreaterThan(0)
    // y puede seguir jugando
    const tomada = una<{ wordId: string }>(a2, 'word_taken')
    a2.emit('word_caught', r.words[0]!['id'])
    expect((await tomada).wordId).toBe(r.words[0]!['id'])
  }, 20000)

  it('si no vuelve dentro de la gracia, el duelo termina por desconexión', async () => {
    const { a, b } = await duelo2()
    const fin = una<{ reason: string }>(b, 'duel_end', 8000)
    const caido = una(b, 'rival_disconnected', 8000)
    a.close()
    expect((await fin).reason).toBe('disconnect')
    await caido
  }, 20000)

  it('un token ajeno o inventado no deja entrar', async () => {
    const { a, code } = await duelo2()
    const intruso = await cliente()
    const fallo = una(intruso, 'rejoin_failed')
    intruso.emit('rejoin_duel', { code, token: 'a'.repeat(24) })
    await fallo
    const otro = await cliente()
    const fallo2 = una(otro, 'rejoin_failed')
    otro.emit('rejoin_duel', { code: 'ZZZZZ', token: 'b'.repeat(24) })
    await fallo2
    expect(a.connected).toBe(true)
  }, 15000)

  it('volver sin que el servidor se haya enterado de la caída también funciona (el socket viejo se cierra)', async () => {
    const { a, code, tokenA } = await duelo2()
    const a2 = await cliente()
    const resync = una(a2, 'duel_resync')
    a2.emit('rejoin_duel', { code, token: tokenA })
    await resync
    await new Promise(r => setTimeout(r, 400))
    expect(a.connected).toBe(false)     // el servidor cerró el socket anterior
    expect(a2.connected).toBe(true)
  }, 15000)
})
