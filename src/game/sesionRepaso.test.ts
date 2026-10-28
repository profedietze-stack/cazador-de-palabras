import { describe, it, expect, beforeEach, vi } from 'vitest'

// En producción, una partida de prueba tocó mal «correr» 13 veces de 21 errores:
// una palabra fallada volvía a los pocos segundos porque el repaso priorizaba lo
// recién fallado. El repaso es para las PRÓXIMAS partidas.

const almacen = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => { almacen.set(k, v) },
  removeItem: (k: string) => { almacen.delete(k) },
})

const { G } = await import('./state')
const s = await import('./sesionRepaso')

describe('repaso: lo fallado vuelve en la partida siguiente, no en la misma', () => {
  beforeEach(() => { almacen.clear(); G.jugador = 'ZZTEST_Repaso'; s.cargarRepasoJugador() })

  it('una palabra fallada ahora no se prioriza en esta partida', () => {
    s.falloEnRepaso('sustantivos', 'correr')
    expect(s.pendientesDe('sustantivos')).toEqual(['correr'])
    expect(s.pendientesParaEstaPartida('sustantivos')).toEqual([])
    const pool = ['a', 'b', 'correr', 'c']
    expect(s.priorizarDistractores('sustantivos', pool, 3)).toEqual(pool)
  })

  it('en la partida siguiente (se guarda y se vuelve a cargar) sí se prioriza', () => {
    s.falloEnRepaso('sustantivos', 'correr')
    s.guardarRepaso()
    s.cargarRepasoJugador()     // empieza otra partida
    expect(s.pendientesParaEstaPartida('sustantivos')).toEqual(['correr'])
    const out = s.priorizarDistractores('sustantivos', ['a', 'b', 'correr', 'c'], 3)
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'correr'])
  })
})
