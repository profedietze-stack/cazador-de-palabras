import { ALTO, X0, X1, estrellas, f, fila, grad, marcaLinea, motas, pino, rad, ridge, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'

// Campamento junto a la laguna: la escena del menú de inicio. Carpa y fogata a la izquierda, pinos
// grandes a los lados, montañas y un lago que refleja el astro.

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { x: number; y: number; r: number; color: string; luz: string; luzOp: number; hoz: boolean }
  lejos: [string, string]
  pinosLejos: string
  agua: [string, string]
  reflejo: string
  reflejoOp: number
  tierra: string
  orilla: string
  carpa: [string, string]
  fuego: number
  pino: [string, string]
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  noche: {
    cielo: ['#081a2c', '#124a5a', '#1d6a66'], estrellas: 70,
    astro: { x: 232, y: 96, r: 16, color: '#fff4d0', luz: '#ffe9a8', luzOp: 0.5, hoz: true },
    lejos: ['#17485c', '#113a4c'], pinosLejos: '#0b2f3d',
    agua: ['#0a4260', '#06263a'], reflejo: '#fff4d0', reflejoOp: 0.4,
    tierra: '#071d22', orilla: '#2c6a55', carpa: ['#e8c27a', '#c79a52'], fuego: 1,
    pino: ['#06171d', '#1d5f55'], motas: { n: 14, color: '#fff2a0' },
  },
  amanecer: {
    cielo: ['#4f5a9e', '#e8909a', '#ffd9a0'], estrellas: 16,
    astro: { x: 214, y: 306, r: 22, color: '#fff2c4', luz: '#ffd27a', luzOp: 0.85, hoz: false },
    lejos: ['#6a5a8a', '#4a4a78'], pinosLejos: '#3a3f66',
    agua: ['#d98a9a', '#2d5f86'], reflejo: '#fff0c0', reflejoOp: 0.55,
    tierra: '#2a3a3a', orilla: '#6a8a6a', carpa: ['#e8c27a', '#c79a52'], fuego: 0.55,
    pino: ['#1a2a3a', '#b86a7a'], motas: { n: 8, color: '#ffe9a0' },
  },
  dia: {
    cielo: ['#4aa3e0', '#bfe6f5', '#e8f6e0'], estrellas: 0,
    astro: { x: 228, y: 92, r: 20, color: '#fff7c0', luz: '#fff3a0', luzOp: 0.7, hoz: false },
    lejos: ['#5f9aaa', '#4a8a8a'], pinosLejos: '#2f6b4f',
    agua: ['#3aa6c8', '#1f7fa8'], reflejo: '#ffffff', reflejoOp: 0.45,
    tierra: '#3c7a45', orilla: '#7fc47f', carpa: ['#e8c27a', '#c79a52'], fuego: 0.12,
    pino: ['#1d5a3d', '#6fbf92'], motas: { n: 8, color: '#ffffff' },
  },
}

/** Y de la orilla del lago: ahí se hunden las palabras. */
const ORILLA = 388

export function dibujarCampamento(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const a = p.astro
  const reflejos = [0, 1, 2, 3, 4, 5, 6]
    .map(i => `<ellipse cx="${a.x + (i % 2 ? 6 : -5)}" cy="${ORILLA + 10 + i * 14}" rx="${22 - i * 2}" ry="1.6" fill="${p.reflejo}" opacity="${f(p.reflejoOp - i * 0.045)}"/>`)
    .join('')
  const defs = grad('cmp-cielo', [[0, p.cielo[0]], [0.55, p.cielo[1]], [1, p.cielo[2]]]) + rad('cmp-luz', a.luz, a.luzOp) +
    grad('cmp-agua', [[0, p.agua[0]], [1, p.agua[1]]])
  const luna = a.hoz ? `<circle cx="${a.x + 8}" cy="${a.y - 5}" r="${a.r - 2}" fill="#0f3550" opacity=".18"/>` : ''
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#cmp-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 3, 270) : '') +
    `<circle cx="${a.x}" cy="${a.y}" r="${a.hoz ? 70 : 78}" fill="url(#cmp-luz)"/><circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.color}"/>${luna}` +
    ridge(300, 34, 11, p.lejos[0], 0.8) + ridge(332, 26, 14, p.lejos[1], 1.1) +
    fila(345, 22, 36, p.pinosLejos, 5, 11) +
    `<rect x="${X0}" y="${ORILLA}" width="${X1 - X0}" height="${ALTO - ORILLA}" fill="url(#cmp-agua)"/>` + reflejos +
    marcaLinea(ORILLA) +
    (animado && p.motas.n ? motas(p.motas.n, 21, 300, 480, p.motas.color) : ''))

  const fuego = `<g class="${animado ? 'esc-fuego' : ''}" opacity="${p.fuego}"><circle cx="66" cy="462" r="30" fill="url(#cmp-fuego)"/><path d="M58 470 Q66 448 73 470 Q68 462 66 455 Q64 463 58 470Z" fill="#ffb347"/><path d="M62 470 Q66 458 70 470Z" fill="#fff0a8"/></g>`
  const izq = svgBorde('izq',
    `<defs>${rad('cmp-fuego', '#ff9a3c', 0.75)}</defs>` +
    `<path d="M0 440 C50 424 100 440 128 470 L140 520 L0 520 Z" fill="${p.tierra}"/>` +
    `<path d="M0 448 C40 436 90 448 112 474" fill="none" stroke="${p.orilla}" stroke-width="2" opacity=".5"/>` +
    fuego +
    `<path d="M8 468 L30 438 L52 468 Z" fill="${p.carpa[0]}"/><path d="M30 438 L52 468 L36 468 Z" fill="${p.carpa[1]}"/><path d="M24 468 L30 452 L37 468 Z" fill="#2a1a10"/>` +
    pino(8, 522, 190, p.pino[0], p.pino[1]))
  const der = svgBorde('der',
    pino(112, 522, 230, p.pino[0], p.pino[1]) + pino(86, 522, 150, p.pino[0], p.pino[1]))
  return { fondo, izq, der, linea: ORILLA }
}
