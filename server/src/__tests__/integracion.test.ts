import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRequire } from 'module'
import { resolve } from 'path'
import type { Socket as ClientSocket } from 'socket.io-client'

// Integracion contra el servidor real (sin red externa). El cliente de
// socket.io vive en el package de la raiz, no en el del servidor.
const requireRaiz = createRequire(resolve(process.cwd(), '../package.json'))
const { io: conectar } = requireRaiz('socket.io-client') as typeof import('socket.io-client')

const PUERTO = 3900 + Math.floor(Math.random() * 90)
let abiertos: ClientSocket[] = []

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
