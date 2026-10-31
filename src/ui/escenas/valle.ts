import { ALTO, X0, X1, estrellas, f, grad, marcaLinea, motas, rad, ridge, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { arboleda, nube, pajaros } from './formas'

// Valle donde dos ríos se juntan en uno solo: lomas verdes, árboles en las orillas y el río que se
// ensancha hacia el frente. Escena de las conjunciones (unen). Las palabras se hunden en el río.

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number }
  nubes: string | null
  montes: [string, string]
  lomas: [string, string, string]
  arboles: [string, string]
  rio: [string, string]
  espuma: string
  pajaros: string | null
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  amanecer: {
    cielo: ['#7a86c0', '#f4b09a', '#ffe4b0'], estrellas: 0,
    astro: { x: 150, y: 330, r: 26, color: '#fff4c8', luz: '#ffe0a0', luzOp: 0.95 },
    nubes: '#ffd0b8', montes: ['#9a86b0', '#8070a0'], lomas: ['#7a9a78', '#5a8a64', '#3f7a52'],
    arboles: ['#3a6a52', '#6a9a78'], rio: ['#ffd0a8', '#e89aa8'], espuma: '#fff4e0', pajaros: '#4a3a58', motas: { n: 10, color: '#fff2b0' },
  },
  dia: {
    cielo: ['#4a9be0', '#a8d8f0', '#e8f6e0'], estrellas: 0,
    astro: { x: 200, y: 90, r: 20, color: '#fffbe0', luz: '#fff6b0', luzOp: 0.6 },
    nubes: '#ffffff', montes: ['#7aa8c0', '#6a98b4'], lomas: ['#6fb078', '#4f9a62', '#368048'],
    arboles: ['#2f7a4a', '#6fc080'], rio: ['#8ad0e8', '#3a9ac0'], espuma: '#ffffff', pajaros: '#2a3a50', motas: { n: 8, color: '#ffffff' },
  },
  noche: {
    cielo: ['#070d24', '#14284a', '#2a3a68'], estrellas: 60,
    astro: { x: 150, y: 110, r: 17, color: '#fff4d0', luz: '#cfe0ff', luzOp: 0.55 },
    nubes: null, montes: ['#1c2a50', '#162244'], lomas: ['#1a4a48', '#143a3a', '#0f2e30'],
    arboles: ['#0a2428', '#1c4a4a'], rio: ['#2a3a68', '#0a1830'], espuma: '#8aa0d0', pajaros: null, motas: { n: 16, color: '#fff2a0' },
  },
}

/** Y donde se hunden las palabras: en el río ya ensanchado. */
const RIO = 490

export function dibujarValle(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('val-cielo', [[0, p.cielo[0]], [0.5, p.cielo[1]], [1, p.cielo[2]]]) + rad('val-luz', a.luz, a.luzOp) +
    grad('val-rio', [[0, p.rio[0]], [1, p.rio[1]]])
  const r = rng(151)
  let brillos = ''
  for (let i = 0; i < 40; i++) {
    const x = 20 + r() * 260
    const y = 480 + r() * 38
    brillos += `<rect x="${f(x)}" y="${f(y)}" width="${f(8 + r() * 22)}" height="1.4" rx=".7" fill="${p.espuma}" opacity="${f(0.15 + r() * 0.3)}"/>`
  }
  const nubes = p.nubes ? [[60, 110, 70], [210, 80, 80], [-120, 130, 80], [400, 110, 80]].map(([x, y, w]) => nube(x!, y!, w! / 2, 8, p.nubes!, p.nubes!, 0.6)).join('') : ''
  // Dos afluentes que bajan desde el horizonte y se encuentran, y el río único que se ensancha hacia el frente.
  const afluenteIzq = 'M36 384 L68 384 C104 414 150 440 184 474 L120 474 C94 446 60 414 36 384 Z'
  const afluenteDer = 'M264 384 L232 384 C196 414 150 440 116 474 L180 474 C206 446 240 414 264 384 Z'
  const rio = `M126 470 L174 470 L650 520 L-350 520 Z`
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#val-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 153, 280) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="110" fill="url(#val-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` + nubes +
    (p.pajaros ? pajaros([[70, 140, 1.3], [92, 128, 1.1], [114, 144, 1.2], [-100, 120, 1.2], [380, 110, 1.2]], p.pajaros) : '') +
    ridge(336, 26, 154, p.montes[0], 0.7) + ridge(352, 20, 155, p.montes[1], 0.9) +
    ridge(374, 14, 156, p.lomas[0], 0.8) + arboleda(386, 157, p.arboles[0], 18, 30, 12, p.arboles[1]) +
    ridge(392, 12, 158, p.lomas[1], 1) + ridge(430, 10, 160, p.lomas[2], 1.1) +
    `<path d="${afluenteIzq}" fill="url(#val-rio)"/><path d="${afluenteDer}" fill="url(#val-rio)"/>` +
    `<path d="${rio}" fill="url(#val-rio)"/>` + brillos +
    arboleda(432, 159, p.arboles[0], 20, 34, 44, p.arboles[1]) +
    `<path d="M126 470 Q150 478 174 470" fill="none" stroke="${p.espuma}" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>` +
    marcaLinea(RIO) +
    (animado ? motas(p.motas.n, 161, 340, 470, p.motas.color) : ''))
  const izq = svgBorde('izq', copa(26, 472, 46, p.arboles[0], p.arboles[1]) + copa(8, 500, 36, p.arboles[0], p.arboles[1]))
  const der = svgBorde('der', copa(112, 482, 42, p.arboles[0], p.arboles[1]))
  return { fondo, izq, der, linea: RIO }
}

/** Árbol grande de borde: tronco y una copa de tres círculos con luz del lado del sol. */
function copa(x: number, y: number, r: number, c: string, luz: string): string {
  return `<rect x="${x - 3}" y="${y}" width="6" height="${ALTO - y}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.5}" cy="${f(y + r * 0.2)}" r="${f(r * 0.7)}" fill="${c}"/><circle cx="${x + r * 0.5}" cy="${f(y + r * 0.15)}" r="${f(r * 0.7)}" fill="${c}"/>` +
    `<circle cx="${f(x + r * 0.25)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.45)}" fill="${luz}" opacity=".35"/>`
}
