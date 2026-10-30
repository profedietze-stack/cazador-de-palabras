import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { MULTIPLICADOR_TAMANO } from './storage/ajustes'

// Auditoría 28-oct-2026 (UX-9 a UX-14, DID-19): contraste 3,66:1, blancos táctiles
// de 28 px, user-scalable=no, sin aria-live, sin prefers-reduced-motion, diálogo
// sin trampa de foco, palabras de 12 px girando.

const luz = (hex: string): number => {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!
}
const contraste = (a: string, b: string): number => {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

const css = readdirSync('src/styles').filter(f => f.endsWith('.css')).map(f => readFileSync(join('src/styles', f), 'utf8')).join('\n')
const html = readFileSync('index.html', 'utf8')

describe('contraste', () => {
  it('blanco sobre el azul de la marca llega a AA (4,5:1)', () => {
    expect(contraste('#ffffff', '#4f5fd1')).toBeGreaterThanOrEqual(4.5)
  })
  it('el azul viejo NO llegaba (la prueba mide algo)', () => {
    expect(contraste('#ffffff', '#667eea')).toBeLessThan(4.5)
  })
  it('el azul viejo ya no está en ningún estilo ni en el HTML', () => {
    expect(css).not.toContain('#667eea')
    expect(html).not.toContain('#667eea')
  })
})

describe('uso táctil y zoom', () => {
  it('se puede hacer zoom', () => {
    expect(html).not.toContain('user-scalable=no')
  })
  it('los botones principales tienen al menos 44 px de alto', () => {
    const a11y = readFileSync('src/styles/a11y.css', 'utf8')
    for (const sel of ['.nv-btn', '.info-tab', '.rk-tab', '.duel-opt-btn', '.back-btn']) expect(a11y).toContain(sel)
    expect(a11y).toMatch(/min-height:\s*44px/)
  })
  it('en 360 px las categorías van en una columna', () => {
    expect(readFileSync('src/styles/a11y.css', 'utf8')).toMatch(/max-width:\s*420px[^}]*\.cats-grid\s*\{\s*grid-template-columns:\s*1fr/)
  })
})

describe('movimiento y legibilidad', () => {
  it('respeta prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
  it('las palabras que caen miden al menos 18 px y no giran', () => {
    const w = readFileSync('src/game/WordSpawner.ts', 'utf8')
    // Piso de 18 px; el tamaño de Ajustes solo multiplica, y ninguno achica.
    expect(w).toMatch(/let size = \(18 \+ Math\.random\(\) \* 14\) \* mult/)
    // El tope por ancho de pantalla nunca baja del piso.
    expect(w).toMatch(/Math\.max\(18, Math\.min\(size,/)
    expect(Math.min(...Object.values(MULTIPLICADOR_TAMANO))).toBeGreaterThanOrEqual(1)
    const f = readFileSync('src/game/WordPhysics.ts', 'utf8')
    expect(f).not.toContain('rotate(')
  })
  it('acepta lápiz además de mouse', () => {
    expect(readFileSync('src/game/WordSpawner.ts', 'utf8')).toContain("e.pointerType !== 'touch'")
  })
})

describe('lectores de pantalla y teclado', () => {
  it('los avisos se anuncian (role=status, aria-live)', () => {
    const b = readFileSync('src/ui/Banner.ts', 'utf8')
    expect(b).toContain("'role', 'status'")
    expect(b).toContain("'aria-live', 'polite'")
    expect(html).toContain('id="porQue" class="por-que" role="status" aria-live="polite"')
  })
  it('el diálogo atrapa el foco y lo devuelve al cerrar', () => {
    const d = readFileSync('src/ui/Dialog.ts', 'utf8')
    expect(d).toContain("e.key === 'Tab'")
    expect(d).toContain('_foco?.focus')
  })
  it('los dos modales declaran role=dialog', () => {
    expect(html).toMatch(/id="modalNombre" role="dialog"/)
    expect(html).toMatch(/id="dialogOverlay" role="dialog"/)
  })
  it('lo tomado por mí o por el rival no se distingue solo por color', () => {
    expect(css).toContain('.duel-chip.taken-me::before')
    expect(css).toContain('.duel-chip.taken-rival::before')
  })
})

// Auditoría 28-oct (UX-13): las palabras que caen eran div sin rol que solo reaccionaban
// al puntero; con teclado el juego no se podía jugar. Y no había landmark <main>.
describe('teclado y landmark', () => {
  const w = readFileSync('src/game/WordSpawner.ts', 'utf8')
  const g = readFileSync('src/screens/GameScreen.ts', 'utf8')

  it('cada palabra es un botón para los lectores de pantalla y para Tab', () => {
    expect(w).toContain('el.tabIndex = 0')
    expect(w).toContain("el.setAttribute('role', 'button')")
    expect(w).toContain("el.setAttribute('aria-label', textoVisible(texto))")
  })

  it('Enter y espacio cazan la palabra enfocada y el foco pasa a otra', () => {
    expect(w).toMatch(/e\.key !== 'Enter' && e\.key !== ' '/)
    expect(w).toContain('siguiente?.focus')
  })

  it('las flechas recorren las palabras de la más baja a la más alta; P pausa', () => {
    expect(g).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'")
    expect(g).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'")
    expect(g).toContain("'btnPausa'")
    expect(w).toMatch(/sort\(\(a, b\) => parseFloat\(b\.style\.top/)
  })

  it('el teclado no actúa con un diálogo abierto', () => {
    expect(g).toContain("getElementById('dialogOverlay')?.classList.contains('show')")
  })

  it('hay exactamente un <main> que contiene las pantallas y no el diálogo', () => {
    const mains = html.match(/<main[\s>]/g) ?? []
    expect(mains).toHaveLength(1)
    const i = html.indexOf('<main'), j = html.indexOf('</main>')
    const dentro = html.slice(i, j)
    expect(dentro).toContain('id="gameScreen"')
    expect(dentro).toContain('id="duelResultScreen"')
    expect(dentro).not.toContain('id="dialogOverlay"')
  })
})
