import { ALTO, X0, X1, estrellas, f, fila, grad, marcaLinea, motas, pino, rad, ridge, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'

// Bosque de pinos en cuatro planos con niebla entre ellos y helechos en el suelo. Es la escena
// de los sustantivos. Las palabras que caen se pierden entre el follaje (aterrizaje «hojas»).

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  sol: { x: number; y: number; color: string; luzOp: number; rayosOp: number; r: number; luna: boolean }
  lejos: string
  medio: [string, string]
  cerca: [string, string]
  suelo: [string, string]
  borde: [string, string]
  niebla: number
  helecho: string
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  amanecer: {
    cielo: ['#7ac2a4', '#cfe7b4', '#f4efb8'], estrellas: 0,
    sol: { x: 214, y: 52, color: '#fff3b0', luzOp: 0.9, rayosOp: 0.09, r: 120, luna: false },
    lejos: '#86bba0', medio: ['#4d9a7b', '#8fd0a8'], cerca: ['#2d7459', '#7fc79a'],
    suelo: ['#1c5240', '#143f31'], borde: ['#1d5a46', '#6fbf92'], niebla: 0.28, helecho: '#7fd08a',
    motas: { n: 22, color: '#fff7b8' },
  },
  dia: {
    cielo: ['#5fb3e0', '#cfeccc', '#f4f8c8'], estrellas: 0,
    sol: { x: 200, y: 36, color: '#fffbd0', luzOp: 0.6, rayosOp: 0.06, r: 100, luna: false },
    lejos: '#7fc0a2', medio: ['#3f9a6c', '#8fd8a8'], cerca: ['#237a50', '#6fd09a'],
    suelo: ['#1a6a3e', '#12532f'], borde: ['#176a44', '#6fd09a'], niebla: 0.16, helecho: '#8fe09a',
    motas: { n: 14, color: '#fffbd0' },
  },
  noche: {
    cielo: ['#0a1830', '#14405a', '#1f6a64'], estrellas: 50,
    sol: { x: 214, y: 60, color: '#dff0ff', luzOp: 0.5, rayosOp: 0.07, r: 100, luna: true },
    lejos: '#17485a', medio: ['#0f3a4a', '#2a7a80'], cerca: ['#0a2a38', '#1d6a70'],
    suelo: ['#06202a', '#041820'], borde: ['#06202c', '#1d5f66'], niebla: 0.12, helecho: '#2f9a7a',
    motas: { n: 26, color: '#fff2a0' },
  },
}

/** Y del suelo del bosque: ahí se pierden las palabras. */
const SUELO = 462

export function dibujarBosque(hora: Hora, animado: boolean): Omit<Dibujo, 'viva'> {
  const p = PALETAS[hora]
  const s = p.sol
  const rayos = [0, 1, 2, 3, 4, 5]
    .map(i => `<path d="M${s.x} ${s.y} L${60 + i * 42} ${ALTO} L${96 + i * 42} ${ALTO} Z" fill="#fffbd0" opacity="${s.rayosOp}"/>`)
    .join('')
  const helechos = []
  for (let x = X0 + 20; x < X1; x += 28) {
    helechos.push(`<path d="M${x} 516 Q${x - 10} 486 ${x - 22} 476 M${x} 516 Q${x + 2} 484 ${x + 4} 468 M${x} 516 Q${x + 12} 488 ${x + 24} 478" fill="none" stroke="${p.helecho}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`)
  }
  const defs = grad('bos-cielo', [[0, p.cielo[0]], [0.5, p.cielo[1]], [1, p.cielo[2]]]) + rad('bos-luz', s.color, s.luzOp)
  const niebla = (y: number, alto: number): string =>
    `<rect x="${X0}" y="${y}" width="${X1 - X0}" height="${alto}" fill="#fff" opacity="${f(p.niebla)}"/>`
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#bos-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 7, 200) : '') +
    `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="url(#bos-luz)"/>` +
    (s.luna ? `<circle cx="${s.x}" cy="${s.y}" r="16" fill="${s.color}"/>` : '') + rayos +
    fila(310, 56, 84, p.lejos, 31, 14) + niebla(276, 60) +
    fila(392, 92, 132, p.medio[0], 32, 20, p.medio[1]) + niebla(356, 55) +
    fila(470, 140, 200, p.cerca[0], 33, 34, p.cerca[1]) +
    ridge(470, 10, 4, p.suelo[0]) + ridge(496, 8, 5, p.suelo[1]) +
    helechos.join('') + marcaLinea(SUELO) +
    (animado ? motas(p.motas.n, 8, 120, 440, p.motas.color) : ''))
  const izq = svgBorde('izq', pino(8, 540, 250, p.borde[0], p.borde[1]))
  const der = svgBorde('der', pino(132, 540, 230, p.borde[0], p.borde[1]))
  return { fondo, izq, der, linea: SUELO }
}
