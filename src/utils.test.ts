import { describe, it, expect } from 'vitest'
import { escapeHtml, sanitizeNickname } from './utils'

// El ranking de la sala muestra nombres que escribieron otros alumnos: viajan
// al servidor y se renderizan en el navegador de todos sus compañeros y del
// docente. Antes se interpolaban crudos en innerHTML.

describe('escapeHtml', () => {
  const cargas = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '"><svg/onload=alert(1)>',
    "'><iframe src=javascript:alert(1)>",
    '<a href="javascript:alert(1)">click</a>',
  ]

  for (const carga of cargas) {
    it(`neutraliza: ${carga.slice(0, 28)}`, () => {
      const salida = escapeHtml(carga)
      // Lo que importa: no queda ningún delimitador capaz de abrir una etiqueta
      // ni de cerrar un atributo.
      expect(salida).not.toContain('<')
      expect(salida).not.toContain('>')
      expect(salida).not.toContain('"')
      expect(salida).not.toContain("'")
    })
  }

  it('produce la salida exacta esperada', () => {
    // Sin DOM en los tests: se afirma la salida literal. Alcanza, porque si
    // `<` sale como `&lt;` el parser de HTML no puede abrir ninguna etiqueta.
    // La comprobación en un navegador real se hizo aparte, con Playwright.
    expect(escapeHtml('<img src=x onerror=alert(1)>'))
      .toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(escapeHtml('"><svg/onload=alert(1)>'))
      .toBe('&quot;&gt;&lt;svg/onload=alert(1)&gt;')
  })

  it('deja el texto normal legible', () => {
    expect(escapeHtml('María José')).toBe('María José')
    expect(escapeHtml(1234)).toBe('1234')
  })

  it('no rompe con null ni undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapa el & antes que el resto, sin doble escapado', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('<')).toBe('&lt;')
  })
})

describe('sanitizeNickname', () => {
  it('saca los delimitadores de etiqueta', () => {
    expect(sanitizeNickname('<script>x</script>')).toBe('scriptx/script')
  })

  it('recorta espacios y limita el largo', () => {
    expect(sanitizeNickname('  Ana  ')).toBe('Ana')
    expect(sanitizeNickname('a'.repeat(50)).length).toBe(24)
  })

  it('no toca un apodo normal', () => {
    expect(sanitizeNickname('Martina')).toBe('Martina')
  })
})
