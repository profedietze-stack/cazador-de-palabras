// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Detalles de la sala encontrados en la revisión del 31-oct-2026 con datos reales.

const buscarSala = vi.fn()

vi.mock('../services/LeaderboardService', () => ({
  buscarSala: (...a: unknown[]) => buscarSala(...a),
  verificarSala: vi.fn(), crearSala: vi.fn(), fetchMisSalas: vi.fn(), limpiarScoresSala: vi.fn(),
  desactivarSala: vi.fn(), eliminarSala: vi.fn(), contarSalasActivas: vi.fn(),
}))
vi.mock('../ui/Dialog', () => ({ showAlert: vi.fn(async () => {}), showConfirm: vi.fn(async () => true) }))
vi.mock('../lib/pocketbase', () => ({ tieneClaveDocente: () => true, crearClaveDocente: vi.fn(), guardarClaveDocente: vi.fn() }))
vi.mock('./ScreenManager', () => ({ mostrar: vi.fn() }))
vi.mock('./RankingScreen', () => ({ mostrarRanking: vi.fn() }))
vi.mock('./ResultadosSalaScreen', () => ({ mostrarResultadosSala: vi.fn() }))

beforeEach(() => { localStorage.clear(); buscarSala.mockReset() })

describe('unirse a una sala', () => {
  it('guarda el NOMBRE de la sala, no el código repetido', async () => {
    buscarSala.mockResolvedValue({ estado: 'si', nombre: 'ZZTEST 7° B' })
    const { unirseASala, getSalaActual } = await import('./SalaScreen')
    expect(await unirseASala('zzrev1')).toBe('si')
    expect(getSalaActual()).toEqual({ code: 'ZZREV1', nombre: 'ZZTEST 7° B' })
  })

  it('si la sala no trae nombre, cae en el código', async () => {
    buscarSala.mockResolvedValue({ estado: 'si', nombre: null })
    const { unirseASala, getSalaActual } = await import('./SalaScreen')
    await unirseASala('ZZREV1')
    expect(getSalaActual()).toEqual({ code: 'ZZREV1', nombre: 'ZZREV1' })
  })

  it('si no existe o no hay red, no guarda nada', async () => {
    const { unirseASala, getSalaActual } = await import('./SalaScreen')
    for (const estado of ['no', 'red'] as const) {
      buscarSala.mockResolvedValue({ estado, nombre: null })
      expect(await unirseASala('ZZREV1')).toBe(estado)
      expect(getSalaActual()).toBeNull()
    }
  })
})

describe('al eliminar una sala', () => {
  it('si era la sala en la que estoy, la olvido (y el panel deja de decir «Sala activa»)', async () => {
    localStorage.setItem('cdp_sala', 'ZZREV1')
    localStorage.setItem('cdp_sala_nombre', 'ZZTEST')
    const { olvidarSalaSiEs, getSalaActual } = await import('./SalaScreen')
    expect(olvidarSalaSiEs('ZZREV1')).toBe(true)
    expect(getSalaActual()).toBeNull()
  })

  it('si era otra sala, no toca la actual', async () => {
    localStorage.setItem('cdp_sala', 'AULA2026')
    localStorage.setItem('cdp_sala_nombre', '7° B')
    const { olvidarSalaSiEs, getSalaActual } = await import('./SalaScreen')
    expect(olvidarSalaSiEs('ZZREV1')).toBe(false)
    expect(getSalaActual()).toEqual({ code: 'AULA2026', nombre: '7° B' })
  })

  it('el manejador de «Eliminar» usa esa función', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync('src/screens/SalaScreen.ts', 'utf8')
    const i = src.indexOf('async function handleEliminar')
    expect(src.slice(i, src.indexOf('// ── Exports', i))).toContain('olvidarSalaSiEs(code)')
  })
})

describe('«Mis salas»', () => {
  const sala = { code: 'ZZREV1', nombre: 'ZZTEST', descripcion: null, activa: true }

  it('sin fecha de creación no pone «Creada: —»', async () => {
    const { renderSalaDocente } = await import('./SalaScreen')
    const html = renderSalaDocente({ ...sala, created_at: null })
    expect(html).not.toContain('Creada')
    expect(html).toContain('ZZREV1')
  })

  it('con fecha, la muestra', async () => {
    const { renderSalaDocente } = await import('./SalaScreen')
    const html = renderSalaDocente({ ...sala, created_at: '2026-10-31T12:00:00Z' })
    expect(html).toMatch(/Creada: \d{1,2}\/\d{1,2}\/2026/)
  })
})
