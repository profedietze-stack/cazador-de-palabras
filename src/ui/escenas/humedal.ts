import { ALTO, X0, X1, estrellas, f, grad, marcaLinea, motas, rad, ridge, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { arboleda, pajaros } from './formas'

// Humedal: un lago de aguas quietas con arboleda de sauces al fondo, juncos a los lados, patos y
// nenúfares. Escena de los adverbios (caza de patos). Las palabras se hunden en el agua.

interface Paleta {
  cielo: [string, string, string]
  agua: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number; mitad: boolean }
  nubes: string
  lejos: string
  arbolesLejos: [string, string]
  arbolesCerca: [string, string]
  brillo: string
  pato: [string, string]
  junco: [string, string]
  orilla: string
  nenufar: [string, string]
  pajaros: string | null
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  amanecer: {
    cielo: ['#6d7cb8', '#f3a58f', '#ffe0a8'], agua: ['#ffd9a8', '#c88aa0', '#34587e'], estrellas: 0,
    astro: { x: 170, y: 318, r: 24, color: '#fff8d8', luz: '#fff0b8', luzOp: 0.95, mitad: true },
    nubes: '#ffc7b0', lejos: '#9a86a8', arbolesLejos: ['#8d7aa6', '#b8a4c4'], arbolesCerca: ['#5b4c78', '#8a78a8'],
    brillo: '#fff3d0', pato: ['#2a2f33', '#1f4a3a'], junco: ['#2c3a26', '#5a3a22'], orilla: '#1f2a1c',
    nenufar: ['#3f6b44', '#5f8f56'], pajaros: '#3a3050', motas: { n: 10, color: '#fff2b0' },
  },
  dia: {
    cielo: ['#4a9be0', '#a8d8f0', '#e8f6f0'], agua: ['#cfeaf2', '#6fb8d0', '#2a7aa0'], estrellas: 0,
    astro: { x: 190, y: 90, r: 20, color: '#fffbe0', luz: '#fff6b0', luzOp: 0.6, mitad: false },
    nubes: '#ffffff', lejos: '#8ab0a0', arbolesLejos: ['#7aa88a', '#a8d0b0'], arbolesCerca: ['#3f7a5a', '#6fa886'],
    brillo: '#ffffff', pato: ['#2a2f33', '#1f4a3a'], junco: ['#3a5a2a', '#6a4a2a'], orilla: '#2a4a2a',
    nenufar: ['#4f8a54', '#7fb070'], pajaros: '#2a3a50', motas: { n: 8, color: '#ffffff' },
  },
  noche: {
    cielo: ['#070d24', '#14284a', '#2a3a68'], agua: ['#2a3a68', '#142848', '#0a1830'], estrellas: 60,
    astro: { x: 170, y: 110, r: 16, color: '#fff4d0', luz: '#cfe0ff', luzOp: 0.55, mitad: false },
    nubes: '#2a3a68', lejos: '#1c2a50', arbolesLejos: ['#1c2a50', '#2a3a68'], arbolesCerca: ['#0f1a38', '#1c2a50'],
    brillo: '#dfe9ff', pato: ['#0a0f1c', '#0f2a2a'], junco: ['#0a140f', '#2a1a10'], orilla: '#050a08',
    nenufar: ['#1f3a30', '#2f5a40'], pajaros: null, motas: { n: 16, color: '#fff2a0' },
  },
}

/** Y donde se hunden las palabras: en pleno lago, entre los patos. */
const LAGO = 410
const COSTA = 338

function juncos(p: Paleta, semilla: number, x0: number, x1: number, n: number): string {
  const r = rng(semilla)
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0)
    const h = 120 + r() * 150
    const d = (r() - 0.5) * 30
    s += `<path d="M${f(x)} 520 Q${f(x + d * 0.4)} ${f(520 - h * 0.6)} ${f(x + d)} ${f(520 - h)}" fill="none" stroke="${p.junco[0]}" stroke-width="1.6" stroke-linecap="round"/>`
    if (i % 3 === 0) s += `<rect x="${f(x + d - 2.2)}" y="${f(520 - h - 2)}" width="4.4" height="${f(16 + r() * 8)}" rx="2.2" fill="${p.junco[1]}" transform="rotate(${f(d * 0.6)} ${f(x + d)} ${f(520 - h)})"/>`
  }
  return s
}

export function dibujarHumedal(hora: Hora, animado: boolean): Omit<Dibujo, 'viva'> {
  const p = PALETAS[hora]
  const a = p.astro
  const r = rng(71)
  let brillos = ''
  for (let i = 0; i < 90; i++) brillos += `<rect x="${f(X0 + r() * (X1 - X0))}" y="${f(360 + r() * 100)}" width="${f(8 + r() * 26)}" height="1.4" rx=".7" fill="${p.brillo}" opacity="${f(0.15 + r() * 0.35)}"/>`
  const patos = [[120, 420, 1], [158, 432, 0.9], [96, 446, 0.8], [-60, 436, 1], [-10, 452, 0.85], [260, 424, 0.95], [310, 444, 0.85]]
    .map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="11" ry="5" fill="${p.pato[0]}"/><circle cx="10" cy="-5" r="4" fill="${p.pato[1]}"/><path d="M13 -5 L18 -4 L13 -3 Z" fill="#e8a83a"/><ellipse cx="0" cy="7" rx="14" ry="2" fill="#fff" opacity=".18"/></g>`).join('')
  const nenufares = [[60, 470, 30], [230, 492, 36], [150, 505, 24], [-90, 480, 34], [340, 470, 30]]
    .map(([x, y, w]) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${f(w! * 0.22)}" fill="${p.nenufar[0]}"/><ellipse cx="${x! - 4}" cy="${y! - 1}" rx="${f(w! * 0.6)}" ry="${f(w! * 0.12)}" fill="${p.nenufar[1]}" opacity=".7"/>`).join('')
  const sol = a.mitad
    ? `<path d="M${a.x - a.r} ${a.y} A${a.r} ${a.r} 0 0 1 ${a.x + a.r} ${a.y} Z" fill="${a.color}"/>`
    : `<circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>`
  const defs = grad('hum-cielo', [[0, p.cielo[0]], [0.4, p.cielo[1]], [0.62, p.cielo[2]]]) +
    grad('hum-agua', [[0, p.agua[0]], [0.4, p.agua[1]], [1, p.agua[2]]]) + rad('hum-luz', a.luz, a.luzOp) +
    `<filter id="hum-borroso"><feGaussianBlur stdDeviation="1.6"/></filter>`
  const nubes = hora === 'noche' ? '' : [[40, 120, 60], [210, 90, 70], [120, 190, 50], [-160, 150, 70], [400, 130, 60]]
    .map(([x, y, w]) => `<ellipse cx="${x}" cy="${y}" rx="${w! / 2}" ry="6" fill="${p.nubes}" opacity=".55"/>`).join('')
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#hum-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 61, 280) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="120" fill="url(#hum-luz)"/>${sol}` + nubes +
    ridge(326, 4, 72, p.lejos, 0.6) + arboleda(330, 74, p.arbolesLejos[0], 26, 40, 14, p.arbolesLejos[1]) +
    `<rect x="${X0}" y="300" width="${X1 - X0}" height="34" fill="#ffe2c8" opacity="${hora === 'amanecer' ? 0.35 : 0.12}"/>` +
    arboleda(338, 75, p.arbolesCerca[0], 30, 52, 17, p.arbolesCerca[1]) +
    `<rect x="${X0}" y="${COSTA}" width="${X1 - X0}" height="${ALTO - COSTA}" fill="url(#hum-agua)"/>` +
    `<g filter="url(#hum-borroso)" opacity=".4" transform="translate(0 ${2 * COSTA}) scale(1 -1)">${arboleda(338, 75, p.arbolesCerca[0], 30, 52, 17)}</g>` +
    `<rect x="${X0}" y="${COSTA}" width="${X1 - X0}" height="22" fill="${hora === 'noche' ? '#8aa0d0' : '#ffd9c0'}" opacity=".24"/>` +
    (hora === 'noche' ? `<ellipse cx="${a.x}" cy="${COSTA + 60}" rx="12" ry="2" fill="${a.color}" opacity=".45"/><ellipse cx="${a.x}" cy="${COSTA + 82}" rx="18" ry="2" fill="${a.color}" opacity=".3"/>` : '') +
    brillos + patos + nenufares +
    (p.pajaros ? pajaros([[90, 130, 1.4], [116, 118, 1.2], [140, 134, 1.3], [66, 142, 1], [190, 100, 1.1], [214, 110, 1], [-100, 120, 1.2], [-70, 132, 1], [400, 110, 1.2]], p.pajaros, animado) : '') +
    ridge(516, 6, 77, p.orilla) + marcaLinea(LAGO) +
    (animado ? motas(p.motas.n, 73, 340, 450, p.motas.color) : ''))
  const borde = (lado: 'izq' | 'der', semilla: number): string =>
    svgBorde(lado, juncos(p, semilla, lado === 'izq' ? 0 : 50, lado === 'izq' ? 90 : 140, 13) +
      `<path d="M${lado === 'izq' ? '0 520 L0 500 Q40 492 90 504 L90 520' : '50 520 L50 506 Q100 494 140 500 L140 520'} Z" fill="${p.orilla}"/>`)
  return { fondo, izq: borde('izq', 411), der: borde('der', 412), linea: LAGO }
}
