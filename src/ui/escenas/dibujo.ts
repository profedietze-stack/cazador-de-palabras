// Utilidades para dibujar escenas en SVG (cadenas). Todo el azar es sembrado: una escena sale
// igual cada vez, así se puede comprobar con tests y no «salta» al volver a una pantalla.

/** Horas del día de las escenas: el nivel 1 es amanecer, el 2 día y el 3 noche. */
export type Hora = 'amanecer' | 'dia' | 'noche'

/** El arte cubre de X0 a X1: ancho de sobra para que una pantalla apaisada no deje bordes vacíos. */
export const X0 = -350
export const X1 = 650
export const ALTO = 520

export interface Dibujo {
  /** SVG ancho (viewBox `-350 0 1000 520`), anclado abajo al centro. Todo quieto: el navegador lo pinta una sola vez. */
  fondo: string
  /** Lo animado (luciérnagas, nieve, pájaros, rayo, lluvia, aurora) en un SVG propio encima del fondo; vacío si no hay nada. */
  viva: string
  /** SVG anclado al borde izquierdo (viewBox `0 0 140 520`). */
  izq: string
  /** SVG anclado al borde derecho (viewBox `0 0 140 520`). */
  der: string
  /** Altura (unidades de la escena) donde las palabras aterrizan. */
  linea: number
}

export const rng = (semilla: number): (() => number) => {
  let s = semilla | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const f = (n: number): number => Math.round(n * 10) / 10

/** Cordillera suave: suma de senos entre X0 y X1, rellena hasta abajo. */
export function ridge(base: number, amp: number, semilla: number, color: string, k = 1, extra = ''): string {
  const r = rng(semilla)
  const a = [r() * 6, r() * 6, r() * 6] as const
  const q = [0.011 * k, 0.027 * k, 0.05 * k] as const
  let d = `M${X0} ${ALTO}`
  for (let x = X0; x <= X1; x += 5) {
    d += ` L${x} ${f(base + amp * (Math.sin(x * q[0] + a[0]) * 0.6 + Math.sin(x * q[1] + a[1]) * 0.3 + Math.sin(x * q[2] + a[2]) * 0.1))}`
  }
  return `<path d="${d} L${X1} ${ALTO} Z" fill="${color}" ${extra}/>`
}

/** Pino de cuatro pisos que se tapan entre sí (sin tronco a la vista). `c2` es la luz del lado derecho. */
export function pino(x: number, y: number, h: number, c: string, c2?: string): string {
  const w = h * 0.34
  let s = ''
  for (let i = 0; i < 4; i++) {
    const top = y - h + i * h * 0.22
    const bot = top + h * 0.4
    const ww = w * (0.42 + i * 0.2)
    s += `<path d="M${f(x)} ${f(top)} L${f(x - ww)} ${f(bot)} Q${f(x)} ${f(bot - h * 0.05)} ${f(x + ww)} ${f(bot)} Z" fill="${c}"/>`
    if (c2) {
      s += `<path d="M${f(x)} ${f(top)} L${f(x + ww)} ${f(bot)} Q${f(x + ww * 0.4)} ${f(bot - h * 0.04)} ${f(x + ww * 0.08)} ${f(bot - h * 0.02)} Z" fill="${c2}" opacity=".4"/>`
    }
  }
  return s
}

/** Hilera de pinos de altura entre `h0` y `h1`, separados unos `paso` unidades. */
export function fila(y: number, h0: number, h1: number, c: string, semilla: number, paso: number, c2?: string): string {
  const r = rng(semilla)
  let s = ''
  for (let x = X0; x < X1; x += paso * (0.7 + r() * 0.6)) s += pino(x, y + r() * 6, h0 + r() * (h1 - h0), c, c2)
  return s
}

export function estrellas(n: number, semilla: number, ymax: number): string {
  const r = rng(semilla)
  let s = ''
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${f(X0 + r() * (X1 - X0))}" cy="${f(r() * ymax)}" r="${f(0.4 + r() * 0.9)}" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`
  }
  return s
}

/** Luciérnagas o motas de polen: parpadean con CSS (`esc-luci`), cada una con su retraso. */
export function motas(n: number, semilla: number, y0: number, y1: number, color: string, x0 = X0, x1 = X1): string {
  const r = rng(semilla)
  let s = ''
  for (let i = 0; i < n; i++) {
    s += `<circle class="esc-luci" style="animation-delay:${f(r() * 3)}s" cx="${f(x0 + r() * (x1 - x0))}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(1 + r() * 1.5)}" fill="${color}"/>`
  }
  return s
}

export const grad = (id: string, stops: ReadonlyArray<readonly [number, string]>, x2 = 0, y2 = 1): string =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`

export const rad = (id: string, color: string, op = 1): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

/** Envuelve el contenido en el SVG ancho de la escena. */
export function svgFondo(defs: string, cuerpo: string): string {
  return `<svg class="pa-escena" viewBox="${X0} 0 ${X1 - X0} ${ALTO}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><defs>${defs}</defs>${cuerpo}</svg>`
}

/** Elementos animados que las escenas dejan marcados en el fondo con una clase `esc-*`. */
const ANIMADOS = /<circle class="esc-(luci|nieve)"[^>]*\/>|<g class="esc-(vuelo|rayo|lluvia|aurora)"[^>]*>.*?<\/g>/g

const ENCUADRE = `viewBox="${X0} 0 ${X1 - X0} ${ALTO}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"`
const capa = (clase: string, cuerpo: string): string => `<svg class="pa-escena pa-viva ${clase}" ${ENCUADRE}>${cuerpo}</svg>`
/** Quita la marca de animación: ahora se anima la capa entera, no cada elemento. */
const limpiar = (m: string): string => m.replace(/ class="esc-\w+"/, '').replace(/ style="animation-[^"]*"/, '')

/**
 * Saca del `fondo` todo lo animado y lo reparte en capas propias, una por tipo de animación.
 * Animar un elemento DENTRO de un SVG obliga a repintarlo; en cambio mover o desvanecer el SVG
 * entero lo hace la GPU sin repintar nada. Con la CPU frenada 6× esto devolvía el juego de
 * 36–41 a ~58 cuadros por segundo. El fondo queda quieto y se pinta una sola vez.
 */
export function separarViva(d: Omit<Dibujo, 'viva'>): Dibujo {
  const g: Record<string, string[]> = { luci: [], nieve: [], vuelo: [], rayo: [], lluvia: [], aurora: [] }
  const fondo = d.fondo.replace(ANIMADOS, (m, circulo: string | undefined, grupo: string | undefined) => {
    g[(circulo ?? grupo)!]!.push(limpiar(m))
    return ''
  })
  const luciA = g['luci']!.filter((_, i) => i % 2 === 0).join('')
  const luciB = g['luci']!.filter((_, i) => i % 2 === 1).join('')
  const nieve = g['nieve']!.join('')
  const viva =
    (g['aurora']!.length ? capa('viva-aurora', g['aurora']!.join('')) : '') +
    (g['rayo']!.length ? capa('viva-rayo', g['rayo']!.join('')) : '') +
    (g['vuelo']!.length ? capa('viva-vuelo', g['vuelo']!.join('')) : '') +
    (luciA ? capa('viva-luci', luciA) : '') + (luciB ? capa('viva-luci viva-luci-b', luciB) : '') +
    // La nieve cae como una lámina que baja una pantalla entera; la copia de arriba tapa el hueco: no se nota el salto.
    (nieve ? `<div class="viva-cae">${capa('', nieve)}${capa('viva-arriba', nieve)}</div>` : '') +
    (g['lluvia']!.length ? capa('viva-lluvia', g['lluvia']!.join('')) : '')
  return { ...d, fondo, viva }
}

/** Envuelve el contenido en un SVG de borde (izquierdo o derecho). */
export function svgBorde(lado: 'izq' | 'der', cuerpo: string): string {
  return `<svg class="pa-borde ${lado}" viewBox="0 0 140 ${ALTO}" preserveAspectRatio="${lado === 'izq' ? 'xMinYMax' : 'xMaxYMax'} meet" aria-hidden="true" focusable="false">${cuerpo}</svg>`
}

/** Marca invisible: el juego lee su posición real en pantalla para saber dónde aterrizan las palabras. */
export const marcaLinea = (y: number): string =>
  `<rect class="pa-linea" x="${X0}" y="${y}" width="${X1 - X0}" height="1" fill="none"/>`
