// Razón de contraste WCAG 2.x. Se usa en los tests (y solo ahí) para medir las paletas de
// los mundos en vez de suponer que se leen bien.

const HEX = /^#[0-9a-f]{6}$/i

function canales(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`color inválido (se espera #rrggbb): ${hex}`)
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** Luminancia relativa (0 negro, 1 blanco). */
export function luminancia(hex: string): number {
  const [r, g, b] = canales(hex).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste entre dos colores #rrggbb, de 1 a 21; no depende del orden. */
export function razonContraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Color con transparencia `alfa` (0-1) puesto sobre `fondo`, como #rrggbb opaco. */
export function componer(frente: string, alfa: number, fondo: string): string {
  const f = canales(frente), g = canales(fondo)
  const mezcla = f.map((c, i) => Math.round(c * alfa + g[i]! * (1 - alfa)))
  return '#' + mezcla.map(c => c.toString(16).padStart(2, '0')).join('')
}
