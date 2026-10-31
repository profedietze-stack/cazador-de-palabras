import { ALTO, X0, X1, estrellas, f, grad, marcaLinea, motas, rad, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { nube, pajaros } from './formas'

// Cañón de roca roja con un puente colgante: paredes con estratos, mesetas lejanas con bruma, un
// río en el fondo y el sol (o la luna) asomando entre las paredes. Escena de las preposiciones
// (sobre, bajo, entre). Las palabras que caen levantan polvo en el fondo del cañón.

interface Paleta {
  cielo: [string, string, string]
  estrellas: number
  astro: { y: number; r: number; color: string; luz: string; luzOp: number }
  mesetas: [string, string]
  paredIzq: string
  paredDer: string
  bandas: [string, string, string, string, string]
  fondo: [string, string]
  rio: [string, string]
  puente: string
  primerPlano: string
  cactus: string
  yuyo: [string, string, string]
  nubes: string | null
  pajaros: string | null
  motas: { n: number; color: string }
}

const PALETAS: Record<Hora, Paleta> = {
  dia: {
    cielo: ['#4a86c8', '#ffc98a', '#ffe2b0'], estrellas: 0,
    astro: { y: 214, r: 22, color: '#fffbe6', luz: '#fff1c0', luzOp: 0.9 },
    mesetas: ['#e6a077', '#cf7a58'], paredIzq: '#8f3a2a', paredDer: '#a24832',
    bandas: ['#8f3a2a', '#b25a40', '#7a3024', '#c4704c', '#9c4430'], fondo: ['#e0996a', '#6a2a1c'],
    rio: ['#7fc4cc', '#e8fbff'], puente: '#3a2418', primerPlano: '#5a2218', cactus: '#3f6a3a',
    yuyo: ['#b8863a', '#c9a050', '#a67428'], nubes: '#ffffff', pajaros: '#3a2230', motas: { n: 10, color: '#ffe9a0' },
  },
  amanecer: {
    cielo: ['#5a64a8', '#f09a8a', '#ffd9a0'], estrellas: 0,
    astro: { y: 262, r: 24, color: '#fff0c0', luz: '#ffd27a', luzOp: 0.95 },
    mesetas: ['#f0b090', '#d98a6e'], paredIzq: '#9a4a3a', paredDer: '#b25a46',
    bandas: ['#9a4a3a', '#bc6a50', '#86402e', '#cc7a58', '#a8503c'], fondo: ['#ffc09a', '#7a3a2c'],
    rio: ['#f0b8a0', '#fff0e8'], puente: '#3a2418', primerPlano: '#5e2a22', cactus: '#4a6a3a',
    yuyo: ['#b8863a', '#c9a050', '#a67428'], nubes: '#ffd8c8', pajaros: '#3a2230', motas: { n: 8, color: '#fff0b0' },
  },
  noche: {
    cielo: ['#070d24', '#1c2450', '#3a3a68'], estrellas: 60,
    astro: { y: 200, r: 16, color: '#fff4d0', luz: '#cfd8ff', luzOp: 0.55 },
    mesetas: ['#4a3a68', '#3a2e58'], paredIzq: '#4a1f24', paredDer: '#5a262a',
    bandas: ['#4a1f24', '#5a2a2e', '#3a181c', '#6a3236', '#4a2024'], fondo: ['#5a4a78', '#1a1020'],
    rio: ['#6a86b8', '#dfe9ff'], puente: '#1a0f0c', primerPlano: '#2a0f12', cactus: '#1f3a2a',
    yuyo: ['#6a5a3a', '#7a6a48', '#5a4a30'], nubes: null, pajaros: null, motas: { n: 16, color: '#fff2a0' },
  },
}

/** Y del fondo del cañón: ahí se pierden las palabras. */
const FONDO = 470

const L = 'M-10 250 L-10 520 L98 520 Q88 470 94 420 L84 360 L96 312 L86 270 L88 250 Z'
const R = 'M310 232 L310 520 L212 520 Q224 470 216 420 L226 360 L214 312 L224 258 L222 232 Z'

/** Estratos y grietas de una pared: franjas onduladas de distinto rojo y rayitas oscuras. */
function estratos(x0: number, x1: number, y0: number, semilla: number, colores: readonly string[]): string {
  const r = rng(semilla)
  let s = ''
  for (let y = y0, i = 0; y < 520; y += 12 + r() * 16, i++) {
    const h = 8 + r() * 14
    s += `<path d="M${x0} ${f(y)} Q${(x0 + x1) / 2} ${f(y + (r() - 0.5) * 6)} ${x1} ${f(y + (r() - 0.5) * 4)} L${x1} ${f(y + h)} Q${(x0 + x1) / 2} ${f(y + h + (r() - 0.5) * 6)} ${x0} ${f(y + h)} Z" fill="${colores[i % colores.length]}" opacity=".55"/>`
  }
  for (let i = 0; i < 10; i++) {
    const x = x0 + r() * (x1 - x0)
    const y = y0 + r() * 200
    s += `<path d="M${f(x)} ${f(y)} l${f((r() - 0.5) * 6)} ${f(14 + r() * 24)}" stroke="#3a1a14" stroke-width=".9" opacity=".35"/>`
  }
  return s
}

export function dibujarCanon(hora: Hora, animado: boolean): Omit<Dibujo, 'viva'> {
  const p = PALETAS[hora]
  const a = p.astro
  const defs = grad('can-cielo', [[0, p.cielo[0]], [0.55, p.cielo[1]], [1, p.cielo[2]]]) + rad('can-luz', a.luz, a.luzOp) +
    `<clipPath id="can-cl"><path d="${L}"/></clipPath><clipPath id="can-cr"><path d="${R}"/></clipPath>` +
    grad('can-sombra-i', [[0, '#00000000'], [1, '#2a0f0a99']], 1, 0) + grad('can-sombra-d', [[0, '#2a0f0a99'], [1, '#00000000']], 1, 0) +
    grad('can-fondo', [[0, p.fondo[0]], [1, p.fondo[1]]])
  const nubes = p.nubes ? [[60, 100, 70], [220, 80, 80], [-120, 120, 80], [400, 100, 80]].map(([x, y, w]) => nube(x!, y!, w! / 2, 8, p.nubes!, p.nubes!, 0.6)).join('') : ''
  const tablones = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
    const x = 92 + i * 13
    const k = Math.sin(((x - 86) / 132) * Math.PI) * 28
    const y = 267 + k
    return `<rect x="${f(x)}" y="${f(y)}" width="9" height="3" fill="#7a4a2a"/><path d="M${f(x + 4)} ${f(y - 8 - k * 0.5)} L${f(x + 4)} ${f(y)}" stroke="${p.puente}" stroke-width=".8"/>`
  }).join('')
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#can-cielo)"/>` +
    (p.estrellas ? estrellas(p.estrellas, 108, 220) : '') +
    `<circle cx="150" cy="${a.y}" r="100" fill="url(#can-luz)"/><circle cx="150" cy="${a.y}" r="${a.r}" fill="${a.color}"/>` + nubes +
    (p.pajaros ? pajaros([[130, 150, 1.6], [168, 132, 1.3], [-80, 140, 1.4], [380, 130, 1.4]], p.pajaros, animado) : '') +
    `<path d="M${X0} 330 L-300 316 L-200 316 L-100 330 L-40 330 L0 316 L70 316 L88 330 L112 330 L130 312 L190 312 L212 330 L250 330 L270 318 L350 318 L420 330 L520 316 L650 316 L650 400 L${X0} 400 Z" fill="${p.mesetas[0]}" opacity=".7"/>` +
    `<path d="M${X0} 360 L-280 340 L-180 340 L-100 360 L40 340 L80 340 L100 360 L140 360 L160 346 L220 346 L240 360 L330 340 L440 340 L500 360 L650 340 L650 420 L${X0} 420 Z" fill="${p.mesetas[1]}" opacity=".85"/>` +
    `<rect x="${X0}" y="330" width="${X1 - X0}" height="70" fill="#ffe2c0" opacity="${hora === 'noche' ? 0.06 : 0.18}"/>` +
    `<rect x="86" y="380" width="128" height="140" fill="url(#can-fondo)" opacity=".9"/>` +
    `<path d="M92 505 C120 488 140 500 160 494 S200 486 208 498" fill="none" stroke="${p.rio[0]}" stroke-width="5" opacity=".75" stroke-linecap="round"/>` +
    `<path d="M96 512 C124 498 142 508 162 502 S198 496 206 506" fill="none" stroke="${p.rio[1]}" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>` +
    `<path d="${L}" fill="${p.paredIzq}"/><g clip-path="url(#can-cl)">${estratos(-10, 120, 250, 111, p.bandas)}<rect x="40" y="250" width="80" height="270" fill="url(#can-sombra-i)"/></g>` +
    `<path d="${R}" fill="${p.paredDer}"/><g clip-path="url(#can-cr)">${estratos(190, 310, 230, 112, p.bandas)}<rect x="190" y="230" width="60" height="290" fill="url(#can-sombra-d)"/></g>` +
    `<path d="M-10 250 H90 M210 258 H310" stroke="#4a2a1c" stroke-width="3"/>` +
    `<path d="M86 262 Q150 292 218 256" fill="none" stroke="${p.puente}" stroke-width="2.4"/><path d="M86 270 Q150 300 218 262" fill="none" stroke="${p.puente}" stroke-width="1.6"/>` + tablones +
    `<path d="M-350 500 L-350 440 Q-100 428 98 452 L124 520 L-350 520 Z" fill="${p.primerPlano}"/><path d="M650 506 L650 450 Q400 440 214 462 L196 520 L650 520 Z" fill="${p.primerPlano}"/>` +
    marcaLinea(FONDO) +
    (animado ? motas(p.motas.n, 103, 300, 480, p.motas.color) : ''))
  const cactus = (x: number, y: number): string =>
    `<g transform="translate(${x} ${y})"><rect x="-4" y="-34" width="8" height="34" rx="4" fill="${p.cactus}"/><path d="M-4 -18 q-12 0 -12 -12 M4 -22 q12 0 12 -12" fill="none" stroke="${p.cactus}" stroke-width="6" stroke-linecap="round"/></g>`
  const yuyo = (x: number, y: number, i: number): string =>
    `<path d="M${x} ${y} l-6 -12 M${x} ${y} l0 -15 M${x} ${y} l6 -12 M${x} ${y} l-10 -6 M${x} ${y} l10 -6" stroke="${p.yuyo[i % 3]}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`
  const izq = svgBorde('izq', cactus(30, 500) + yuyo(70, 508, 0) + yuyo(10, 508, 2))
  const der = svgBorde('der', cactus(110, 506) + yuyo(60, 512, 1))
  return { fondo, izq, der, linea: FONDO }
}
