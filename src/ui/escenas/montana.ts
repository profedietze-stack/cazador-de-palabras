import { ALTO, X0, X1, estrellas, fila, grad, marcaLinea, pino, rad, ridge, rng, f, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { nube, pico } from './formas'

// Montaña nevada: picos en tres planos, pinos nevados y laderas de nieve. Escena de los verbos.
// Las palabras que caen se entierran en la nieve (aterrizaje «nieve»).

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number }
  nubes: [string, string, number]
  picos: { claro: [string, string, string]; oscuro: [string, string, string]; nieve: string }
  lejos: string
  pinos: [string, string]
  laderas: [string, string, string]
  linea: string
  copos: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  dia: {
    cielo: ['#5f9fe0', '#bfdcf7', '#eaf5ff'], estrellas: 0,
    astro: { x: 60, y: 70, r: 14, color: '#fffdf0', luz: '#ffffff', luzOp: 0.8 },
    nubes: ['#ffffff', '#e4eef8', 0.75],
    picos: { claro: ['#e8f3ff', '#f4faff', '#ffffff'], oscuro: ['#8aa7cc', '#7d9cc4', '#6f8fbb'], nieve: '#ffffff' },
    lejos: '#a9c1de', pinos: ['#2c5a66', '#9cc8d4'], laderas: ['#e9f3fc', '#d2e3f4', '#f6fbff'], linea: '#9db8d8',
    copos: { n: 90, color: '#ffffff' },
  },
  amanecer: {
    cielo: ['#4a5a9e', '#f4a090', '#ffe0b8'], estrellas: 0,
    astro: { x: 214, y: 330, r: 18, color: '#fff0c0', luz: '#ffd27a', luzOp: 0.9 },
    nubes: ['#ffc7b8', '#ff9a8a', 0.55],
    picos: { claro: ['#ffd9c8', '#ffe6d6', '#fff0e6'], oscuro: ['#7a6a9e', '#6e5e94', '#605088'], nieve: '#fff0e6' },
    lejos: '#8a7aa8', pinos: ['#2e4a66', '#e8a8b0'], laderas: ['#fbe4e0', '#e4c8d8', '#fff3ee'], linea: '#c8a0b8',
    copos: { n: 0, color: '#fff' },
  },
  noche: {
    cielo: ['#070d24', '#14284e', '#2a4a78'], estrellas: 70,
    astro: { x: 60, y: 70, r: 14, color: '#fff4d0', luz: '#cfe0ff', luzOp: 0.6 },
    nubes: ['#2a3a68', '#1c2a58', 0.5],
    picos: { claro: ['#6f88c0', '#7a94cc', '#8aa4d8'], oscuro: ['#2a3a68', '#243464', '#1e2c58'], nieve: '#c8dcff' },
    lejos: '#22346a', pinos: ['#0a1a30', '#4a6a9a'], laderas: ['#8fa6d4', '#7088b8', '#a6bce4'], linea: '#5a74a8',
    copos: { n: 60, color: '#dfe9ff' },
  },
}

/** Y de la ladera de nieve: ahí se entierran las palabras. */
const NIEVE = 446

export function dibujarMontana(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('mon-cielo', [[0, p.cielo[0]], [0.6, p.cielo[1]], [1, p.cielo[2]]]) + rad('mon-luz', a.luz, a.luzOp)
  const picos = [[-180, 370, 220, 170, 0], [-40, 372, 170, 120, 1], [70, 360, 190, 170, 0], [236, 360, 210, 210, 1], [150, 380, 230, 250, 2], [390, 368, 200, 160, 0], [530, 372, 230, 190, 1]]
    .map(([cx, base, w, h, k]) => pico(cx!, base!, w!, h!, p.picos.claro[k!]!, p.picos.oscuro[k!]!, p.picos.nieve)).join('')
  const nubes = hora === 'noche' ? '' : [[200, 90, 60], [110, 130, 44], [250, 150, 40], [-100, 100, 60], [-20, 160, 44], [400, 120, 60], [480, 160, 44]]
    .map(([x, y, w]) => nube(x!, y!, w!, 11, p.nubes[0], p.nubes[1], p.nubes[2])).join('')
  let nieve = ''
  if (animado && p.copos.n) {
    const r = rng(12)
    for (let i = 0; i < p.copos.n; i++) {
      nieve += `<circle class="esc-nieve" style="animation-delay:${f(r() * 4)}s;animation-duration:${f(5 + r() * 4)}s" cx="${f(X0 + r() * (X1 - X0))}" cy="${f(r() * ALTO)}" r="${f(0.8 + r() * 1.6)}" fill="${p.copos.color}" opacity=".85"/>`
    }
  }
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#mon-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 14, 260) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="${hora === 'amanecer' ? 90 : 46}" fill="url(#mon-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` +
    nubes + picos +
    ridge(392, 14, 52, p.lejos, 0.9) +
    fila(420, 34, 58, p.pinos[0], 53, 14, p.pinos[1]) +
    ridge(436, 16, 54, p.laderas[0], 0.8) + ridge(468, 14, 55, p.laderas[1], 1) + ridge(498, 12, 56, p.laderas[2], 1.2) +
    `<path d="M${X0} 446 Q-250 436 -100 458 T50 456 T200 458 T350 456 T500 458 T650 456" fill="none" stroke="${p.linea}" stroke-width="2" opacity=".6"/>` +
    marcaLinea(NIEVE) + nieve)
  const izq = svgBorde('izq', pino(8, 560, 210, p.pinos[0], p.pinos[1]))
  const der = svgBorde('der', pino(132, 560, 180, p.pinos[0], p.pinos[1]) + pino(100, 560, 120, p.pinos[0], p.pinos[1]))
  return { fondo, izq, der, linea: NIEVE }
}
