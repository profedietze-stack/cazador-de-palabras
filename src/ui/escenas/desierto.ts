import { ALTO, X0, X1, estrellas, f, grad, marcaLinea, motas, rad, ridge, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { nube, pajaros } from './formas'

// Desierto de dunas con una caravana de camellos en la cresta lejana y cactus. Escena de los
// pronombres (representan a otros: yo, vos, ellos). Las palabras que caen levantan arena.

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number }
  nubes: string | null
  rocas: string
  dunas: [string, string, string, string]
  sombras: string
  ondas: string
  camello: string
  cactus: string
  pajaros: string | null
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  amanecer: {
    cielo: ['#5a5aa8', '#f09a8a', '#ffd9a0'], estrellas: 0,
    astro: { x: 210, y: 336, r: 26, color: '#fff2c4', luz: '#ffd27a', luzOp: 0.95 },
    nubes: '#ffc0a8', rocas: '#8a6a9a', dunas: ['#e0a070', '#cf8a5a', '#b87448', '#8f5636'],
    sombras: '#6a3a4a', ondas: '#fff0d0', camello: '#2a1a24', cactus: '#3a4a34', pajaros: '#3a2a40', motas: { n: 0, color: '#fff' },
  },
  dia: {
    cielo: ['#3f8fd8', '#9fd0ee', '#f6f0d0'], estrellas: 0,
    astro: { x: 196, y: 96, r: 22, color: '#fffbd8', luz: '#fff6b0', luzOp: 0.7 },
    nubes: '#ffffff', rocas: '#b88a6a', dunas: ['#f0d090', '#e6bc70', '#d4a458', '#b8863e'],
    sombras: '#a06a3a', ondas: '#fff6d8', camello: '#4a3420', cactus: '#3f6a3a', pajaros: '#2a3a50', motas: { n: 0, color: '#fff' },
  },
  noche: {
    cielo: ['#070a22', '#1a1a4a', '#3a3a72'], estrellas: 70,
    astro: { x: 200, y: 104, r: 17, color: '#fff4d0', luz: '#cfd8ff', luzOp: 0.55 },
    nubes: null, rocas: '#2a2a58', dunas: ['#4a4a78', '#3a3a66', '#2c2c54', '#1e1e3c'],
    sombras: '#10102a', ondas: '#9aa8e0', camello: '#0a0a1c', cactus: '#0c1a22', pajaros: null, motas: { n: 12, color: '#fff2a0' },
  },
}

/** Y de la duna cercana: ahí se pierden las palabras. */
const ARENA = 452

/** Camello de perfil (mirando a la derecha) con una sola joroba. */
function camello(x: number, y: number, s: number, c: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><ellipse cx="0" cy="-12" rx="12" ry="6"/><ellipse cx="-4" cy="-19" rx="4" ry="5"/><path d="M9 -14 L15 -27 L19 -26 L13 -12 Z"/><ellipse cx="19" cy="-27" rx="5" ry="2.6"/><path d="M-9 -8 L-8 0 L-6 0 L-6 -8 Z M-4 -8 L-4 0 L-2 0 L-2 -8 Z M4 -8 L4 0 L6 0 L6 -8 Z M8 -8 L9 0 L11 0 L10 -8 Z"/><path d="M-12 -14 L-16 -8" stroke="${c}" stroke-width="1.2"/></g>`
}

function saguaro(x: number, y: number, h: number, c: string): string {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${c}" stroke-linecap="round"><path d="M0 0 L0 ${-h}" stroke-width="9"/><path d="M0 ${-h * 0.45} q-16 0 -16 ${-h * 0.2} L-16 ${-h * 0.55}" stroke-width="7"/><path d="M0 ${-h * 0.6} q14 0 14 ${-h * 0.15} L14 ${-h * 0.78}" stroke-width="7"/></g>`
}

export function dibujarDesierto(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('des-cielo', [[0, p.cielo[0]], [0.55, p.cielo[1]], [1, p.cielo[2]]]) + rad('des-luz', a.luz, a.luzOp)
  const r = rng(131)
  let ondas = ''
  for (let i = 0; i < 26; i++) {
    const x = X0 + r() * (X1 - X0)
    const y = 462 + r() * 50
    const w = 20 + r() * 40
    ondas += `<path d="M${f(x)} ${f(y)} q${f(w / 2)} -3 ${f(w)} 0" fill="none" stroke="${p.ondas}" stroke-width="1" opacity=".22" stroke-linecap="round"/>`
  }
  const nubes = p.nubes ? [[40, 130, 60], [230, 170, 50], [-150, 150, 60], [400, 140, 60]].map(([x, y, w]) => nube(x!, y!, w!, 6, p.nubes!, p.nubes!, 0.45)).join('') : ''
  const caravana = [[34, 364, 0.7], [62, 366, 0.7], [90, 365, 0.7]].map(([x, y, s]) => camello(x!, y!, s!, p.camello)).join('')
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#des-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 133, 300) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="110" fill="url(#des-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` + nubes +
    (p.pajaros ? pajaros([[90, 130, 1.3], [112, 120, 1.1], [-100, 120, 1.2], [380, 110, 1.2]], p.pajaros) : '') +
    ridge(352, 8, 134, p.rocas, 0.5) +
    `<path d="M120 352 L132 322 L146 322 L158 352 Z M-90 352 L-76 318 L-58 318 L-44 352 Z M330 352 L344 326 L360 326 L372 352 Z" fill="${p.rocas}"/>` +
    ridge(368, 14, 135, p.dunas[0], 0.5) + caravana +
    ridge(398, 18, 136, p.dunas[1], 0.55) +
    `<path d="M${X0} 520 L${X0} 410 Q-200 400 -40 428 T220 424 T480 430 T650 424 L650 520 Z" fill="${p.sombras}" opacity=".18"/>` +
    ridge(432, 20, 137, p.dunas[2], 0.6) +
    ridge(478, 14, 138, p.dunas[3], 0.7) + ondas +
    marcaLinea(ARENA) +
    (animado && p.motas.n ? motas(p.motas.n, 139, 330, 470, p.motas.color) : ''))
  const izq = svgBorde('izq', saguaro(40, 524, 150, p.cactus) + saguaro(96, 524, 80, p.cactus))
  const der = svgBorde('der', saguaro(104, 524, 130, p.cactus))
  return { fondo, izq, der, linea: ARENA }
}
