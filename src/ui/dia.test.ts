import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/componentes.css', 'utf8')

describe('tema claro = día: estilos', () => {
  it('el texto suelto sobre el cielo cambia a marrón oscuro de día y es blanco de noche', () => {
    expect(css).toMatch(/:root\{[^}]*--sobre-cielo:\s*#ffffff/)
    expect(css).toMatch(/html\[data-cielo="dia"\]\{[^}]*--sobre-cielo:\s*#3a2200/)
  })

  it('subtítulos, introducciones y créditos usan el color de texto sobre el cielo', () => {
    for (const sel of ['.screen .screen-sub', '.aj-intro', '#menuPrincipal .logo-sub', '#menuPrincipal .footer-credit']) {
      const escapado = sel.replace(/[.#]/g, m => '\\' + m)
      expect(css, sel).toMatch(new RegExp(escapado + '\\{[^}]*color:\\s*var\\(--sobre-cielo\\)'))
    }
  })

  it('en la partida de día una capa atenúa el cielo para que las palabras crema resalten', () => {
    expect(css).toMatch(/html\[data-cielo="dia"\] #gameScreen \.fondo-mundo::after\{[^}]*rgba\(10,25,40,\.42\)/)
  })

  it('las pestañas inactivas de Info toman el color del texto sobre el cielo (blanco sobre celeste no se lee)', () => {
    expect(css).toMatch(/\.info-tab:not\(\.active\)\{[^}]*color:\s*var\(--sobre-cielo\)/)
  })

  it('con alto contraste el fondo liso es siempre oscuro: el texto suelto vuelve a ser blanco, también de día', () => {
    const m = /html\[data-contraste="alto"\]\{([^}]*)\}/.exec(css)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/--sobre-cielo:\s*#ffffff/)
    // tiene que declararse DESPUÉS de la regla de día para ganar a igual especificidad
    expect(css.indexOf('html[data-contraste="alto"]{')).toBeGreaterThan(css.indexOf('html[data-cielo="dia"]{'))
  })

  it('el sol y los destellos de día están definidos', () => {
    const paisaje = readFileSync('src/styles/paisaje.css', 'utf8')
    expect(paisaje).toContain('.pa-sol')
    expect(paisaje).toContain('.pa-destello')
  })
})
