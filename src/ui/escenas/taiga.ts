import { ALTO, X0, X1, estrellas, f, fila, grad, marcaLinea, motas, pino, rad, ridge, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'

// Taiga: bosque de abetos nevado bajo el cielo del norte. De noche, con aurora boreal. Escena de
// los artículos. Las palabras que caen se entierran en la nieve (aterrizaje «nieve»).

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number } | null
  lejos: string
  pinosLejos: [string, string]
  pinosCerca: [string, string]
  nieve: [string, string, string, string]
  aurora: boolean
  copos: number
  brillos: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  noche: {
    cielo: ['#050c1e', '#0d2a3e', '#17465a'], estrellas: 90, astro: null,
    lejos: '#12364a', pinosLejos: ['#0b2a36', '#7fc8d0'], pinosCerca: ['#0a232d', '#8fd0d8'],
    nieve: ['#cfe3f0', '#e6f1f8', '#c6dcec', '#eef6fb'], aurora: true, copos: 0, brillos: { n: 30, color: '#ffffff' },
  },
  amanecer: {
    cielo: ['#4a5a98', '#e8a0a0', '#ffe0c0'], estrellas: 0,
    astro: { x: 200, y: 330, r: 22, color: '#fff2c8', luz: '#ffd27a', luzOp: 0.9 },
    lejos: '#7a7aa8', pinosLejos: ['#3a4a72', '#f0b0b8'], pinosCerca: ['#2a3a62', '#f4c0c4'],
    nieve: ['#f4dcdc', '#fbeaea', '#e8c8d4', '#fff2f0'], aurora: false, copos: 40, brillos: { n: 0, color: '#fff' },
  },
  dia: {
    cielo: ['#6aa8e0', '#c8e4f5', '#f0f8fc'], estrellas: 0,
    astro: { x: 210, y: 100, r: 18, color: '#fffdf0', luz: '#ffffff', luzOp: 0.8 },
    lejos: '#9ab8d0', pinosLejos: ['#2c5a66', '#cfe8f0'], pinosCerca: ['#1e4a58', '#dff0f6'],
    nieve: ['#eaf4fb', '#f4faff', '#d8e8f4', '#ffffff'], aurora: false, copos: 50, brillos: { n: 0, color: '#fff' },
  },
}

/** Y de la nieve: ahí se entierran las palabras. */
const NIEVE = 450

/** Cinta de aurora: una franja ondulada degradada y muy desenfocada. */
function cinta(y0: number, amp: number, relleno: string, op: number, fase: number): string {
  let d = `M${X0 - 10} ${y0}`
  for (let x = X0; x <= X1; x += 20) d += ` L${x} ${f(y0 + Math.sin(x * 0.03 + fase) * amp)}`
  d += ` L${X1} ${y0 + 150} L${X0 - 10} ${y0 + 150} Z`
  return `<path d="${d}" fill="${relleno}" opacity="${op}" filter="url(#tai-difuso)"/>`
}

export function dibujarTaiga(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('tai-cielo', [[0, p.cielo[0]], [0.6, p.cielo[1]], [1, p.cielo[2]]]) +
    grad('tai-verde', [[0, '#5cf0b0'], [1, '#5cf0b000']]) + grad('tai-violeta', [[0, '#a07cf0'], [1, '#a07cf000']]) +
    '<filter id="tai-difuso"><feGaussianBlur stdDeviation="7"/></filter>' + (a ? rad('tai-luz', a.luz, a.luzOp) : '')
  let copos = ''
  if (animado && p.copos) {
    const r = rng(99)
    for (let i = 0; i < p.copos; i++) {
      copos += `<circle class="esc-nieve" style="animation-delay:${f(r() * 4)}s;animation-duration:${f(5 + r() * 4)}s" cx="${f(X0 + r() * (X1 - X0))}" cy="${f(r() * ALTO)}" r="${f(0.8 + r() * 1.4)}" fill="#fff" opacity=".85"/>`
    }
  }
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#tai-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 91, 300) : '') +
    (p.aurora ? `<g class="${animado ? 'esc-aurora' : ''}">${cinta(70, 24, 'url(#tai-verde)', 0.85, 0)}${cinta(110, 20, 'url(#tai-violeta)', 0.7, 2)}${cinta(40, 16, 'url(#tai-verde)', 0.55, 4)}</g>` : '') +
    (a ? `<circle cx="${a.x}" cy="${a.y}" r="${hora === 'amanecer' ? 90 : 50}" fill="url(#tai-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` : '') +
    ridge(330, 24, 92, p.lejos, 0.8) +
    fila(372, 40, 66, p.pinosLejos[0], 93, 14, p.pinosLejos[1]) +
    ridge(392, 14, 94, p.nieve[0], 0.9) +
    fila(424, 70, 110, p.pinosCerca[0], 95, 22, p.pinosCerca[1]) +
    ridge(436, 12, 96, p.nieve[1]) + ridge(470, 14, 97, p.nieve[2], 1.1) + ridge(500, 12, 98, p.nieve[3], 1.3) +
    marcaLinea(NIEVE) + copos +
    (animado && p.brillos.n ? motas(p.brillos.n, 99, 100, 480, p.brillos.color) : ''))
  const izq = svgBorde('izq', pino(8, 560, 230, p.pinosCerca[0], p.pinosCerca[1]))
  const der = svgBorde('der', pino(132, 560, 200, p.pinosCerca[0], p.pinosCerca[1]) + pino(98, 560, 130, p.pinosCerca[0], p.pinosCerca[1]))
  return { fondo, izq, der, linea: NIEVE }
}
