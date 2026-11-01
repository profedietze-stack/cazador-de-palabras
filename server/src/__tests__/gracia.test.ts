import { describe, it, expect, vi, afterEach } from 'vitest'

// La gracia para volver a un duelo tras perder la conexión es de 20 s (antes 15). Se puede cambiar
// con DUELO_GRACIA_MS (los tests de integración la acortan).

describe('gracia de reconexión del duelo', () => {
  const original = process.env['DUELO_GRACIA_MS']
  afterEach(() => {
    if (original === undefined) delete process.env['DUELO_GRACIA_MS']
    else process.env['DUELO_GRACIA_MS'] = original
    vi.resetModules()
  })

  it('por defecto es de 20 segundos', async () => {
    delete process.env['DUELO_GRACIA_MS']
    vi.resetModules()
    const { GRACIA_RECONEXION_MS } = await import('../DuelRoom')
    expect(GRACIA_RECONEXION_MS).toBe(20000)
  })

  it('se puede ajustar con DUELO_GRACIA_MS', async () => {
    process.env['DUELO_GRACIA_MS'] = '1500'
    vi.resetModules()
    const { GRACIA_RECONEXION_MS } = await import('../DuelRoom')
    expect(GRACIA_RECONEXION_MS).toBe(1500)
  })
})
