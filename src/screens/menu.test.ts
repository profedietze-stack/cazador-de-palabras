import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { razonContraste, componer } from '../ui/contraste'
import { MUNDOS } from '../data/mundos'

const html = readFileSync('index.html', 'utf8')
const menu = html.slice(html.indexOf('id="menuPrincipal"'), html.indexOf('id="seleccionCategoria"'))
const comp = readFileSync('src/styles/componentes.css', 'utf8')
const tokens = readFileSync('src/styles/tokens.css', 'utf8')
const token = (n: string): string => new RegExp(`${n}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1] ?? ''

describe('menú de inicio «Aventura»', () => {
  it('lleva el contenedor del paisaje y el título cartel', () => {
    expect(menu).toContain('class="fondo-mundo"')
    expect(menu).toMatch(/<h1 class="titulo-juego">Cazador de Palabras<\/h1>/)
    expect(menu).toContain('class="titulo-adorno" aria-hidden="true"')   // el arco es decoración: los lectores de pantalla lo saltean
  })

  it('todos los botones son 3D y «Iniciar» es el principal', () => {
    const botones = [...menu.matchAll(/<button class="([^"]+)" id="(btn\w+)"/g)]
    expect(botones.length).toBe(7)
    for (const [, clase, id] of botones) expect(clase, id).toContain('btn3d')
    expect(menu).toMatch(/class="btn3d btn3d--principal" id="btnIniciar"/)
    expect(menu).not.toContain('btn-outline')
  })

  it('el CSS del botón 3D tiene borde grueso, alto táctil y todos sus estados', () => {
    expect(comp).toMatch(/\.btn3d\s*\{[^}]*border-bottom:\s*var\(--borde-3d\)/)
    expect(comp).toMatch(/\.btn3d\s*\{[^}]*min-height:\s*48px/)
    for (const e of [':active', ':disabled', ':focus-visible', ':hover']) expect(comp, e).toContain('.btn3d' + e)
  })

  it('el texto de cada variante de botón tiene contraste ≥ 4,5:1 con su fondo (medido, no supuesto)', () => {
    const pares: [string, string][] = [
      ['--btn-sec-fg', '--btn-sec-bg'], ['--btn-pri-fg', '--btn-pri-bg'],
      ['--btn-ok-fg', '--btn-ok-bg'], ['--btn-peligro-fg', '--btn-peligro-bg'],
    ]
    for (const [fg, bg] of pares) {
      expect(token(fg), fg).not.toBe('')
      expect(razonContraste(token(fg), token(bg)), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('el menú ya no usa la tarjeta de vidrio ni el degradado violeta del título', () => {
    const css = readFileSync('src/styles/screens.css', 'utf8') + comp
    expect(css).toMatch(/#menuPrincipal>\.card\s*\{[^}]*background:\s*transparent/)
    expect(css).not.toMatch(/#menuPrincipal \.logo\{[^}]*linear-gradient\(135deg,#4f5fd1/)
  })

  it('el menú sigue siendo una pantalla fija que scrollea (position:relative la sacaba del scroll)', () => {
    const css = readFileSync('src/styles/screens.css', 'utf8') + readFileSync('src/styles/base.css', 'utf8') + comp
    expect(css).not.toMatch(/#menuPrincipal\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.screen\{[^}]*position:fixed/)
    expect(css).toMatch(/\.screen\{[^}]*overflow-y:auto/)
  })

  it('con alto contraste se apagan las palabras flotantes del menú', () => {
    expect(comp).toMatch(/html\[data-contraste="alto"\] #menuBg\{display:none\}/)
  })

  it('el título del juego va en una línea, en Almendra SC, y con color propio de día y de noche', () => {
    expect(comp).toMatch(/\.titulo-juego\{[^}]*font-family:var\(--font-cartel\)/)
    expect(comp).toMatch(/\.titulo-juego\{[^}]*white-space:nowrap/)
    expect(comp).not.toMatch(/\.titulo-juego\{[^}]*-webkit-text-stroke/)   // sin el efecto wordart anterior
    expect(tokens).toContain("--font-cartel: 'Almendra SC'")
    expect(comp).toMatch(/html\[data-cielo="dia"\]\{[^}]*--titulo-oro:#5a3410/)
    // El título queda en el tramo de arriba del cielo del mundo «inicio» (hasta ~35 % hacia el tono de abajo):
    // dorado de noche y marrón de día tienen que pasar AA (4,5:1) en todo ese tramo.
    for (const [paleta, color] of [[MUNDOS.inicio.noche, '#f3d27a'], [MUNDOS.inicio.dia, '#5a3410']] as const) {
      for (const t of [0, 0.35]) {
        const cielo = componer(paleta.cieloBajo, t, paleta.cieloAlto)
        expect(razonContraste(color, cielo), `${color} sobre ${cielo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('el título cartel usa la tipografía de títulos con contorno y extrusión', () => {
    // El selector admite alias (.screen-title usa el mismo estilo).
    expect(comp).toMatch(/\.titulo-cartel[^{]*\{[^}]*font-family:\s*var\(--font-titulo\)/)
    expect(comp).toMatch(/\.titulo-cartel[^{]*\{[^}]*-webkit-text-stroke/)
    expect(comp).toMatch(/\.titulo-cartel[^{]*\{[^}]*text-shadow/)
  })
})
