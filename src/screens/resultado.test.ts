// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { repasoHtml } from '../game/repasoHtml'

const html = readFileSync('index.html', 'utf8')
const final = html.slice(html.indexOf('id="resultadoScreen"'), html.indexOf('id="medallasScreen"'))
const css = ['base', 'screens', 'responsive', 'a11y', 'componentes'].map(f => readFileSync(`src/styles/${f}.css`, 'utf8')).join('\n')
const motor = readFileSync('src/screens/ResultScreen.ts', 'utf8')

describe('repasoHtml: «Palabras para repasar» plegado', () => {
  const cont = (palabras: string[]): HTMLElement => {
    const d = document.createElement('div')
    d.innerHTML = repasoHtml(palabras, 'sustantivos')
    return d
  }

  it('es un <details> cerrado por defecto, con la cantidad real en el resumen', () => {
    const d = cont(['saltar', 'lindo'])
    const det = d.querySelector('details.repaso')!
    expect(det).not.toBeNull()
    expect(det.hasAttribute('open')).toBe(true)   // es el único lugar donde se explica el error
    expect(det.querySelector('summary')!.textContent).toContain('Palabras para repasar (2)')
    expect(det.querySelectorAll('li').length).toBe(2)
  })

  it('explica cada palabra con el «¿Por qué?» y conserva el aviso de que van a volver', () => {
    const d = cont(['saltar'])
    expect(d.querySelector('li')!.textContent).toContain('saltar')
    expect(d.textContent).toContain('Van a volver en tus próximas partidas')
  })

  it('una palabra con HTML se escapa: no se convierte en elementos', () => {
    const d = cont(['<img src=x onerror=alert(1)>'])
    expect(d.querySelectorAll('img').length).toBe(0)
    expect(d.querySelector('li')!.textContent).toContain('<img src=x onerror=alert(1)>')
  })
})

describe('pantalla final «Aventura»', () => {
  it('lleva paisaje, confeti, rayos detrás de la medalla y título cartel', () => {
    expect(final).toMatch(/id="resultadoScreen" class="screen con-mundo"/)
    expect(final).toContain('class="fondo-mundo"')
    expect(final).toMatch(/id="confeti"/)
    expect(final).toMatch(/class="rayos"/)
    expect(final).toMatch(/<h2 id="resTitle" class="titulo-cartel/)
  })

  it('los botones son 3D: «Reintentar» principal y «Siguiente» de confirmar', () => {
    expect(final).toMatch(/class="btn3d" id="btnResMenu"/)
    expect(final).toMatch(/class="btn3d btn3d--principal" id="btnResReintentar"/)
    expect(final).toMatch(/class="btn3d btn3d--confirmar" id="btnResSiguiente"/)
  })

  it('ya no lleva estilos en línea de colores ni la tarjeta violeta', () => {
    expect(final).not.toMatch(/style="[^"]*(background:#fef9c3|background:#d4edda|color:#4f5fd1)/)
    expect(css).toMatch(/#resultadoScreen>\.card\s*\{[^}]*background:\s*transparent/)
  })

  it('las estadísticas son placas en dos columnas', () => {
    expect(css).toMatch(/\.stats-grid\s*\{[^}]*grid-template-columns:\s*1fr 1fr/)
    expect(css).toMatch(/\.sg-row\s*\{[^}]*background:\s*rgba\(8,40,44,\.72\)/)
  })

  it('la medalla es la imagen 3D grande y solo hay rayos cuando hay medalla', () => {
    expect(css).toMatch(/\.medalla-grande \.emo\s*\{[^}]*width:\s*1em/)
    expect(css).toMatch(/\.medalla-wrap\.sin-medalla \.rayos\s*\{[^}]*display:\s*none/)
    expect(motor).toContain("classList.toggle('sin-medalla'")
  })

  it('los rayos y el confeti se apagan con menos movimiento (sistema y Ajustes)', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.rayos/)
    expect(css).toMatch(/html\[data-movimiento="reducido"\] \.rayos[^{]*\{[^}]*animation:\s*none/)
  })

  it('el motor lanza el confeti según la medalla y no lo toca en la práctica', () => {
    expect(motor).toContain('lanzarConfeti(')
    expect(motor).toContain('cantidadConfeti(p.medalla)')
    expect(motor).toContain('repasoHtml(')
  })
})
