/**
 * Escapa texto para meterlo en `innerHTML`.
 *
 * Hace falta porque el ranking de la sala muestra nombres que escribieron
 * OTROS alumnos: viajan al servidor y se renderizan en el navegador de todos
 * sus compañeros y del docente. Sin esto, un nombre como
 * `<img src=x onerror=...>` se ejecuta en la máquina de cada uno.
 *
 * Lo correcto donde se pueda es `textContent`, que no interpreta nada. Esto es
 * para los lugares que arman HTML como string.
 */
export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Limpia el apodo antes de guardarlo. Es defensa en profundidad, no la
 * defensa: la real es escapar al renderizar, porque la API se puede llamar
 * directo sin pasar por este formulario.
 */
export function sanitizeNickname(v: string): string {
  return v.replace(/[<>]/g, '').trim().slice(0, 24)
}

export function formatFecha(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

export function shuffleArr<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
}
