import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClientResponseError } from 'pocketbase'

// El alumno que se une a una sala veía el CÓDIGO repetido donde tenía que ir el nombre de la sala
// («ZZREV1 ZZREV1»), porque `verificarSala` solo decía si existía y la pantalla guardaba el código
// como nombre. `buscarSala` devuelve también el nombre.

const getFirstListItem = vi.fn()

vi.mock('../lib/pocketbase', () => ({
  pb: { collection: () => ({ getFirstListItem }), filter: (f: string, p: Record<string, string>) => f.replace(/\{:(\w+)\}/g, (_m, k: string) => `"${p[k]}"`) },
  getHostKeyId: vi.fn(async () => null),
  setSalaContexto: vi.fn(),
}))
vi.mock('../ui/Banner', () => ({ showBanner: vi.fn() }))

const errorHttp = (status: number): ClientResponseError => new ClientResponseError({ status, response: {}, url: 'x' })

beforeEach(() => { getFirstListItem.mockReset() })

describe('buscarSala', () => {
  it('devuelve el nombre de la sala cuando existe y está activa', async () => {
    getFirstListItem.mockResolvedValue({ code: 'ZZREV1', nombre: 'ZZTEST 7° B' })
    const { buscarSala } = await import('./LeaderboardService')
    expect(await buscarSala('zzrev1')).toEqual({ estado: 'si', nombre: 'ZZTEST 7° B' })
  })

  it('una sala sin nombre (vacío o ausente) da nombre null, no un texto inventado', async () => {
    const { buscarSala } = await import('./LeaderboardService')
    getFirstListItem.mockResolvedValue({ code: 'ZZREV1', nombre: '' })
    expect((await buscarSala('ZZREV1')).nombre).toBeNull()
    getFirstListItem.mockResolvedValue({ code: 'ZZREV1' })
    expect((await buscarSala('ZZREV1')).nombre).toBeNull()
  })

  it('una sala que no existe (404) es «no» y un fallo de red es «red»', async () => {
    const { buscarSala } = await import('./LeaderboardService')
    getFirstListItem.mockRejectedValue(errorHttp(404))
    expect(await buscarSala('NOEXISTE1')).toEqual({ estado: 'no', nombre: null })
    getFirstListItem.mockRejectedValue(new TypeError('fetch failed'))
    expect(await buscarSala('ZZREV1')).toEqual({ estado: 'red', nombre: null })
  })

  it('verificarSala sigue diciendo lo mismo que antes', async () => {
    const { verificarSala } = await import('./LeaderboardService')
    getFirstListItem.mockResolvedValue({ nombre: 'X' })
    expect(await verificarSala('ZZREV1')).toBe('si')
    getFirstListItem.mockRejectedValue(errorHttp(404))
    expect(await verificarSala('ZZREV1')).toBe('no')
    getFirstListItem.mockRejectedValue(new Error('boom'))
    expect(await verificarSala('ZZREV1')).toBe('red')
  })
})
