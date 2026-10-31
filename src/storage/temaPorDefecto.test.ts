import { describe, it, expect } from 'vitest'
import { AJUSTES_DE_FABRICA, leerAjustes, normalizarAjustes } from './ajustes'

// El juego arranca de noche (tema oscuro): es el aspecto con que se diseñó. Quien ya eligió
// otro tema lo conserva.
describe('tema por defecto: oscuro (de noche)', () => {
  it('de fábrica es oscuro', () => {
    expect(AJUSTES_DE_FABRICA.tema).toBe('oscuro')
  })

  it('un dispositivo sin nada guardado arranca oscuro, aunque el sistema sea claro', () => {
    expect(leerAjustes(null, null, null).tema).toBe('oscuro')
  })

  it('un campo de tema ilegible cae en oscuro', () => {
    expect(normalizarAjustes({ tema: 'violeta' }).tema).toBe('oscuro')
    expect(normalizarAjustes({}).tema).toBe('oscuro')
  })

  it('quien ya tenía guardado «auto» o «claro» lo conserva', () => {
    expect(leerAjustes(JSON.stringify({ tema: 'auto' }), null, null).tema).toBe('auto')
    expect(leerAjustes(JSON.stringify({ tema: 'claro' }), null, null).tema).toBe('claro')
  })

  it('quien había elegido tema claro con el botón viejo lo conserva', () => {
    expect(leerAjustes(null, null, 'light').tema).toBe('claro')
    expect(leerAjustes(null, null, 'dark').tema).toBe('oscuro')
  })
})
