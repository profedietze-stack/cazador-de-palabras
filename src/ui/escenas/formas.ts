import { X0, X1, f, rng } from './dibujo'

// Formas que usan varias escenas: pájaros, picos nevados, arboledas de copa redonda y nubes.

/** Bandada de pájaros: cada uno una «v» fina. `pts` = [x, y, escala]. */
export function pajaros(pts: ReadonlyArray<readonly [number, number, number]>, color: string): string {
  return pts.map(([x, y, s]) => `<path d="M${x - 6 * s} ${y} Q${x - 3 * s} ${y - 4 * s} ${x} ${y} Q${x + 3 * s} ${y - 4 * s} ${x + 6 * s} ${y}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/>`).join('')
}

/** Pico de montaña de dos tonos (lado con luz y lado en sombra) y, si se pide, la nieve de la cima. */
export function pico(cx: number, base: number, w: number, h: number, claro: string, oscuro: string, nieve?: string): string {
  const top = base - h
  let s = `<path d="M${cx - w / 2} ${base} L${cx} ${top} L${cx + w / 2} ${base} Z" fill="${oscuro}"/>`
  s += `<path d="M${cx} ${top} L${cx - w / 2} ${base} L${f(cx - w * 0.08)} ${base} L${f(cx + w * 0.04)} ${f(top + h * 0.45)} Z" fill="${claro}"/>`
  if (nieve) {
    s += `<path d="M${cx} ${top} L${f(cx - w * 0.17)} ${f(top + h * 0.3)} L${f(cx - w * 0.09)} ${f(top + h * 0.27)} L${f(cx - w * 0.04)} ${f(top + h * 0.36)} L${f(cx + w * 0.03)} ${f(top + h * 0.28)} L${f(cx + w * 0.09)} ${f(top + h * 0.33)} L${f(cx + w * 0.17)} ${f(top + h * 0.3)} Z" fill="${nieve}"/>`
  }
  return s
}

/** Arboleda de copas redondas (sauces, álamos): nubes de círculos sobre un tronco fino. */
export function arboleda(y: number, semilla: number, c: string, h0: number, h1: number, paso: number, c2?: string): string {
  const r = rng(semilla)
  let s = ''
  for (let x = X0; x < X1 + 12; x += paso * (0.7 + r() * 0.7)) {
    const h = h0 + r() * (h1 - h0)
    const w = h * (0.5 + r() * 0.35)
    s += `<rect x="${f(x - 1)}" y="${f(y - h * 0.5)}" width="2" height="${f(h * 0.5)}" fill="${c}"/>`
    for (let k = 0; k < 4; k++) s += `<circle cx="${f(x + (r() - 0.5) * w)}" cy="${f(y - h * (0.55 + r() * 0.4))}" r="${f(w * (0.28 + r() * 0.2))}" fill="${c}"/>`
    if (c2) s += `<circle cx="${f(x - w * 0.15)}" cy="${f(y - h * 0.85)}" r="${f(w * 0.22)}" fill="${c2}" opacity=".5"/>`
  }
  return s
}

/** Nube alargada: una elipse y una sombra más chica debajo. */
export const nube = (cx: number, cy: number, rx: number, ry: number, c1: string, c2: string, op = 0.5): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c1}" opacity="${op}"/><ellipse cx="${cx}" cy="${cy + 2}" rx="${f(rx * 0.72)}" ry="${f(ry * 0.6)}" fill="${c2}" opacity="${f(op * 0.7)}"/>`

/** Matas de pasto: tres briznas curvas cada una, sembradas entre `y0` e `y1` y entre `x0` y `x1`. */
export function pastos(n: number, semilla: number, x0: number, x1: number, y0: number, y1: number, hmin: number, hmax: number, colores: readonly string[], grosor = 1.4): string {
  const r = rng(semilla)
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0)
    const y = y0 + r() * (y1 - y0)
    const h = hmin + r() * (hmax - hmin)
    s += `<path d="M${f(x)} ${f(y)} Q${f(x + (r() - 0.5) * 10)} ${f(y - h * 0.6)} ${f(x + (r() - 0.5) * 16)} ${f(y - h)}" fill="none" stroke="${colores[i % colores.length]}" stroke-width="${grosor}" stroke-linecap="round"/>`
  }
  return s
}
