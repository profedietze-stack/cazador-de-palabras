import { ALTO, X0, X1, estrellas, grad, marcaLinea, motas, rad, ridge, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { nube, pajaros, pastos } from './formas'

// Estepa: pastizal infinito con una acacia, nubes largas y una bandada. Escena de los adjetivos.
// Las palabras que caen se pierden en el pasto alto (aterrizaje «pasto»).

interface Paleta {
  cielo: [string, string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number }
  nubes: [string, string, number]
  lejos: string
  pasto: [string, string, string, string]
  matas: [string, string, string, string]
  acacia: string
  pajaros: string | null
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  amanecer: {
    cielo: ['#2d2358', '#a44a6c', '#ff8f5a', '#ffcf7a'], estrellas: 0,
    astro: { x: 150, y: 352, r: 30, color: '#fff5c8', luz: '#fff1b0', luzOp: 0.95 },
    nubes: ['#ffb8a0', '#ff7a68', 0.4], lejos: '#7a4570',
    pasto: ['#c9893f', '#a76a28', '#7e4c1d', '#4a2c12'], matas: ['#e8b350', '#d99a3a', '#f3c870', '#b97a2a'],
    acacia: '#2a1830', pajaros: '#2a1c40', motas: { n: 0, color: '#fff' },
  },
  dia: {
    cielo: ['#3f8fd8', '#8fc8ee', '#d6eefa', '#f4f7d8'], estrellas: 0,
    astro: { x: 196, y: 120, r: 24, color: '#fffbd8', luz: '#fff6b0', luzOp: 0.7 },
    nubes: ['#ffffff', '#dcebf5', 0.7], lejos: '#8aa8b8',
    pasto: ['#d8b858', '#c29c40', '#a07c2c', '#6e5420'], matas: ['#f0d070', '#e0b850', '#f8e090', '#c8a040'],
    acacia: '#3a3a28', pajaros: '#2a3a50', motas: { n: 0, color: '#fff' },
  },
  noche: {
    cielo: ['#070a22', '#1a1a4a', '#3a2a66', '#5a3a6e'], estrellas: 70,
    astro: { x: 208, y: 112, r: 17, color: '#fff4d0', luz: '#cfd8ff', luzOp: 0.55 },
    nubes: ['#3a3a6e', '#2a2a58', 0.5], lejos: '#2a2050',
    pasto: ['#3d4a5e', '#2f3a4e', '#232c3e', '#161c2a'], matas: ['#8aa0b8', '#6e86a0', '#a8bcd0', '#5a7088'],
    acacia: '#0c0a18', pajaros: null, motas: { n: 12, color: '#fff2a0' },
  },
}

/** Y donde empieza el pasto alto: ahí se pierden las palabras. */
const PASTO = 452

export function dibujarEstepa(hora: Hora, animado: boolean): Omit<Dibujo, 'viva'> {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('est-cielo', [[0, p.cielo[0]], [0.35, p.cielo[1]], [0.62, p.cielo[2]], [0.7, p.cielo[3]]]) + rad('est-luz', a.luz, a.luzOp)
  const nubes = [[40, 150, 90, 7], [190, 120, 100, 6], [80, 205, 140, 8], [210, 235, 70, 6], [-200, 170, 100, 7], [-80, 110, 90, 6], [330, 160, 110, 7], [430, 120, 90, 6], [500, 210, 120, 8], [-260, 240, 120, 7]]
    .map(([x, y, w, h]) => nube(x! + w! / 2, y!, w! / 2, h!, p.nubes[0], p.nubes[1], p.nubes[2])).join('')
  const acacia = `<g fill="${p.acacia}"><path d="M222 392 Q224 372 226 360 L229 360 Q229 374 232 392 Z"/><ellipse cx="228" cy="358" rx="34" ry="7"/><ellipse cx="214" cy="364" rx="20" ry="5"/><ellipse cx="246" cy="365" rx="16" ry="4"/></g>`
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#est-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 91, 300) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="110" fill="url(#est-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` +
    nubes +
    (p.pajaros ? pajaros([[70, 120, 1.2], [92, 108, 1], [112, 124, 1.1], [180, 90, 0.9], [200, 98, 0.8], [-120, 100, 1.1], [-98, 112, 1], [380, 110, 1], [402, 100, 1.1]], p.pajaros, animado) : '') +
    ridge(356, 6, 41, p.lejos, 0.6) + ridge(384, 12, 42, p.pasto[0], 0.9) + ridge(424, 14, 43, p.pasto[1], 0.8) + ridge(470, 12, 44, p.pasto[2], 1) +
    acacia +
    pastos(380, 9, X0, X1, 430, 520, 14, 40, p.matas) + ridge(510, 6, 45, p.pasto[3]) +
    marcaLinea(PASTO) +
    (animado && p.motas.n ? motas(p.motas.n, 12, 330, 470, p.motas.color) : ''))
  const borde = (lado: 'izq' | 'der', semilla: number) => svgBorde(lado, pastos(26, semilla, 0, 140, 500, 524, 40, 78, p.matas, 2) + `<path d="M0 520 L140 520 L140 524 L0 524 Z" fill="${p.pasto[3]}"/>`)
  return { fondo, izq: borde('izq', 301), der: borde('der', 302), linea: PASTO }
}

