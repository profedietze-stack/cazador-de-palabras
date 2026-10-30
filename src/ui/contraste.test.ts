import { describe, it, expect } from 'vitest'
import { razonContraste, componer } from './contraste'

describe('razonContraste (WCAG 2.x)', () => {
  it('negro sobre blanco es 21:1 y un color contra sí mismo es 1:1', () => {
    expect(razonContraste('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(razonContraste('#777777', '#777777')).toBeCloseTo(1, 5)
  })
  it('no depende del orden y acepta mayúsculas', () => {
    expect(razonContraste('#FFFFFF', '#000000')).toBeCloseTo(razonContraste('#000000', '#ffffff'), 5)
  })
  it('un valor conocido: #767676 sobre blanco ≈ 4,54:1', () => {
    expect(razonContraste('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
  })
  it('rechaza lo que no es #rrggbb en vez de devolver un número falso', () => {
    expect(() => razonContraste('rojo', '#ffffff')).toThrow()
    expect(() => razonContraste('#fff', '#000000')).toThrow()
  })
})

describe('componer (color con transparencia sobre un fondo)', () => {
  it('alfa 0 deja el fondo y alfa 1 deja el color', () => {
    expect(componer('#ff0000', 0, '#0000ff')).toBe('#0000ff')
    expect(componer('#ff0000', 1, '#0000ff')).toBe('#ff0000')
  })
  it('a la mitad mezcla los canales', () => {
    expect(componer('#000000', 0.5, '#ffffff')).toBe('#808080')
  })
})
