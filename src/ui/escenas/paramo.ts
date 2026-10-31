import { ALTO, X0, X1, f, grad, marcaLinea, rad, ridge, rng, svgBorde, svgFondo, type Dibujo, type Hora } from './dibujo'
import { pastos } from './formas'

// Páramo con tormenta: lomas con matas de brezo y tojo, enebros bajos, rocas, un ciervo colorado
// en la loma, nubes pesadas, lluvia y un rayo. Escena de las interjecciones (¡ay!, ¡uf!, ¡cuidado!).
// Las palabras que caen se pierden en el pajonal (aterrizaje «pasto»).

interface Paleta {
  cielo: [string, string, string]
  nubes: [string, string]
  colinas: [string, string, string, string, string, string]
  matas: string[]
  flores: [string, string, string]
  pajas: string
  lluvia: number
  rayo: string
  ciervo: string
}

const PALETAS: Record<Hora, Paleta> = {
  noche: {
    cielo: ['#141a2a', '#3b4a62', '#8c9aae'], nubes: ['#0f1422', '#4a5a78'],
    colinas: ['#4a5668', '#566a5a', '#3f5546', '#2f4438', '#22352b', '#17241d'],
    matas: ['#3d4a3c', '#33463a', '#2c3d33', '#27392f', '#22332a', '#18261f'],
    flores: ['#8a5a9a', '#a46aa8', '#6f4a86'], pajas: '#6c8a5a', lluvia: 0.3, rayo: '#e6f2ff', ciervo: '#0f0d15',
  },
  amanecer: {
    cielo: ['#3a3a5e', '#a07a8e', '#e8bca8'], nubes: ['#2e2e4a', '#8a6a8a'],
    colinas: ['#6a5e7a', '#667a62', '#4f6a4c', '#3d583d', '#2e4630', '#213623'],
    matas: ['#4a5a48', '#3d5240', '#35493a', '#2f4033', '#28392c', '#1d2b21'],
    flores: ['#9a6aa8', '#b47ab4', '#7a5a96'], pajas: '#84a06a', lluvia: 0.25, rayo: '#fff0e6', ciervo: '#1a1220',
  },
  dia: {
    cielo: ['#56677f', '#8798ae', '#bfcad6'], nubes: ['#3a4458', '#7a8aa0'],
    colinas: ['#7a8aa0', '#6f8a6a', '#58774f', '#46633f', '#35502f', '#27401f'],
    matas: ['#4a6a48', '#3f5f40', '#365439', '#2e4a32', '#27402b', '#1d3022'],
    flores: ['#9a6aa8', '#b47ab4', '#7a5a96'], pajas: '#8aaa6a', lluvia: 0.35, rayo: '#f6faff', ciervo: '#16141c',
  },
}

/** Y del pajonal: ahí se pierden las palabras. */
const PAJONAL = 452

/** Ciervo colorado de perfil, mirando a la derecha: silueta angulosa con una cuerna que se abre hacia atrás. */
function ciervo(x: number, y: number, s: number, c: string): string {
  const P = (pts: ReadonlyArray<readonly [number, number]>): string => pts.map(([a, b]) => `${a},${b}`).join(' ')
  const cuerpo = [[-37, -50], [-31, -58], [-14, -61], [8, -61], [23, -58], [31, -51], [29, -42], [21, -35], [5, -33], [-13, -35], [-30, -37], [-39, -44]] as const
  const cuello = [[20, -58], [30, -62], [36, -80], [39, -88], [44, -92], [51, -90], [60, -82], [64, -77], [58, -75], [51, -75], [43, -73], [38, -67], [31, -52]] as const
  const oreja = [[40, -91], [37, -99], [46, -93]] as const
  const traseraA = [[-37, -42], [-26, -42], [-25, -28], [-20, -17], [-21, -1], [-25, -1], [-26, -14], [-31, -24], [-38, -32]] as const
  const traseraB = traseraA.map(([a, b]) => [a + 9, b] as const)
  const delanteraA = [[13, -37], [23, -37], [21, -20], [20, -1], [16, -1], [16, -18], [12, -28]] as const
  const delanteraB = delanteraA.map(([a, b]) => [a - 8, b] as const)
  const cola = [[-38, -52], [-44, -49], [-39, -45]] as const
  const cuerna = (dx: number, op: number): string =>
    `<g stroke="${c}" stroke-width="1.7" stroke-linecap="round" fill="none" opacity="${op}" transform="translate(${dx} 0)"><path d="M44 -92 C41 -104 40 -118 32 -133"/><path d="M41 -101 L51 -105"/><path d="M39 -111 L48 -117"/><path d="M36 -121 L44 -129"/><path d="M32 -133 L26 -141"/><path d="M32 -133 L38 -143"/></g>`
  return `<g transform="translate(${x} ${y}) scale(${s})"><g fill="${c}"><polygon points="${P(traseraB)}" opacity=".75"/><polygon points="${P(delanteraB)}" opacity=".75"/><polygon points="${P(cuerpo)}"/><polygon points="${P(cuello)}"/><polygon points="${P(oreja)}"/><polygon points="${P(traseraA)}"/><polygon points="${P(delanteraA)}"/><polygon points="${P(cola)}"/></g>${cuerna(-3, 0.6)}${cuerna(0, 1)}</g>`
}

/** Mata baja e irregular: un polígono de radio variable con flores encima. */
function mata(x: number, y: number, w: number, h: number, semilla: number, c: string, flor: string, nf: number): string {
  const r = rng(semilla)
  let p = ''
  let fl = ''
  const n = 9
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n
    const rr = 0.62 + r() * 0.5
    p += `${i ? 'L' : 'M'}${f(x + Math.cos(Math.PI - a) * (w / 2) * rr)} ${f(y - Math.sin(a) * h * rr)} `
  }
  for (let i = 0; i < nf; i++) fl += `<circle cx="${f(x + (r() - 0.5) * w * 0.8)}" cy="${f(y - h * (0.35 + r() * 0.55))}" r="${f(0.9 + r() * 1.2)}" fill="${flor}"/>`
  return `<path d="${p}Z" fill="${c}"/>${fl}`
}

function enebro(x: number, y: number, h: number, c: string): string {
  const w = h * 0.5
  return `<path d="M${f(x)} ${f(y - h)} L${f(x + w / 2)} ${f(y - h * 0.5)} L${f(x + w * 0.65)} ${f(y)} L${f(x - w * 0.65)} ${f(y)} L${f(x - w / 2)} ${f(y - h * 0.5)} Z" fill="${c}"/><path d="M${f(x)} ${f(y - h)} L${f(x + w * 0.65)} ${f(y)} L${f(x + 2)} ${f(y)} Z" fill="#fff" opacity=".07"/>`
}

function roca(x: number, y: number, w: number, h: number, c: string): string {
  return `<path d="M${x} ${y} L${f(x + w * 0.12)} ${f(y - h * 0.7)} L${f(x + w * 0.45)} ${f(y - h)} L${f(x + w * 0.8)} ${f(y - h * 0.6)} L${x + w} ${y} Z" fill="${c}"/><path d="M${f(x + w * 0.45)} ${f(y - h)} L${f(x + w * 0.8)} ${f(y - h * 0.6)} L${x + w} ${y} L${f(x + w * 0.55)} ${y} Z" fill="#000" opacity=".22"/>`
}

/** Matorral de un plano: matas, enebros y alguna roca repartidas entre X0 y X1. */
function matorral(y: number, semilla: number, n: number, esc: number, p: Paleta, tono: number): string {
  const r = rng(semilla)
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = X0 + r() * (X1 - X0)
    const k = r()
    if (k < 0.62) s += mata(x, y + r() * 6, (26 + r() * 22) * esc, (9 + r() * 7) * esc, semilla * 10 + i, p.matas[tono]!, i % 3 === 0 ? '#e0c24a' : p.flores[i % 3]!, 5)
    else if (k < 0.85) s += enebro(x, y + r() * 4, (14 + r() * 16) * esc, p.matas[Math.min(5, tono + 1)]!)
    else s += roca(x, y + r() * 4, (18 + r() * 16) * esc, (8 + r() * 8) * esc, hexMezcla(p.colinas[tono + 1] ?? p.colinas[5], '#8c9aae'))
  }
  return s
}

/** Mezcla un color con otro al 25 %: las rocas son un poco más claras que la loma donde están. */
function hexMezcla(a: string, b: string): string {
  const c = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16)
  return '#' + [1, 3, 5].map(i => Math.round(c(a, i) * 0.75 + c(b, i) * 0.25).toString(16).padStart(2, '0')).join('')
}

export function dibujarParamo(hora: Hora, animado: boolean): Dibujo {
  const p = PALETAS[hora]
  const r = rng(81)
  let lluvia = ''
  for (let i = 0; i < 160; i++) {
    const x = X0 + r() * (X1 - X0)
    const y = r() * ALTO
    lluvia += `<path d="M${f(x)} ${f(y)} l-5 16" stroke="#cfe0f0" stroke-width=".8" opacity="${f(0.12 + r() * 0.18)}"/>`
  }
  const nubes = ([[70, 60, 110, 34], [210, 40, 130, 38], [140, 120, 150, 36], [260, 150, 90, 28], [30, 170, 100, 30], [-120, 90, 120, 34], [-220, 140, 110, 30], [380, 80, 120, 34], [480, 130, 110, 30]] as const)
    .map(([x, y, w, h], i) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="${p.nubes[0]}" opacity="${f(0.85 - (i % 5) * 0.08)}"/><ellipse cx="${x}" cy="${y + h * 0.35}" rx="${w * 0.8}" ry="${h * 0.5}" fill="${p.nubes[1]}" opacity=".35"/>`).join('')
  const rayo = 'M232 60 L214 142 L234 142 L206 232 L252 128 L232 128 L248 60 Z'
  const defs = grad('par-cielo', [[0, p.cielo[0]], [0.5, p.cielo[1]], [1, p.cielo[2]]]) + rad('par-luz', '#cfe4ff', 0.8) +
    '<filter id="par-brillo"><feGaussianBlur stdDeviation="2"/></filter>'
  const fondo = svgFondo(defs,
    `<rect x="${X0}" y="0" width="${X1 - X0}" height="${ALTO}" fill="url(#par-cielo)"/>` + nubes +
    `<circle cx="232" cy="190" r="90" fill="url(#par-luz)" opacity=".35"/>` +
    `<g class="${animado ? 'esc-rayo' : ''}"><path d="${rayo}" fill="${p.rayo}" opacity=".95"/><path d="${rayo}" fill="${p.rayo}" filter="url(#par-brillo)" opacity=".9"/></g>` +
    ridge(300, 22, 82, p.colinas[0], 0.8) +
    `<rect x="${X0}" y="290" width="${X1 - X0}" height="50" fill="#b9c6d6" opacity=".3"/>` +
    ridge(338, 18, 83, p.colinas[1], 0.9) + matorral(342, 201, 14, 0.55, p, 0) + ciervo(168, 337, 0.55, p.ciervo) +
    ridge(380, 16, 84, p.colinas[2], 0.8) + matorral(398, 203, 22, 0.9, p, 1) +
    ridge(420, 14, 85, p.colinas[3], 1) + matorral(450, 206, 24, 1.3, p, 2) +
    ridge(462, 12, 86, p.colinas[4], 1.2) +
    pastos(220, 209, X0, X1, 440, 515, 6, 22, [p.pajas]) +
    ridge(500, 10, 87, p.colinas[5]) + marcaLinea(PAJONAL) +
    `<g class="${animado ? 'esc-lluvia' : ''}" opacity="${f(Math.min(1, p.lluvia / 0.3))}">${lluvia}</g>`)
  const izq = svgBorde('izq', mata(40, 524, 100, 40, 221, p.matas[5]!, '#a46aa8', 12) + enebro(14, 524, 70, p.matas[5]!))
  const der = svgBorde('der', mata(100, 526, 110, 42, 222, p.matas[5]!, '#e0c24a', 12) + enebro(128, 524, 84, p.matas[5]!))
  return { fondo, izq, der, linea: PAJONAL }
}
