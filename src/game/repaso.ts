// Repaso espaciado de las palabras que el alumno tocó mal (DID-10).
//
// Antes lo que se fallaba no volvía: el sorteo era uniforme e independiente de
// los errores, y cada palabra se veía ~0,5 veces por partida. Tres cajas de
// Leitner, por jugador y por categoría:
//   caja 1: acaba de fallarla            -> vuelve seguido
//   caja 2: la dejó pasar bien una vez   -> vuelve de vez en cuando
//   caja 3: la dejó pasar bien 3 veces   -> dominada, sale del mazo
// «Acertar» una palabra del repaso es no tocarla cuando cae (son distractores
// que se tocaron por error); tocarla de nuevo la devuelve a la caja 1.
//
// Se guarda en localStorage por nombre de jugador, versionado y leído campo por
// campo (CLAUDE.md §14): un guardado con un tipo cambiado cae en vacío, no rompe.

export interface ItemRepaso {
  fallos: number
  seguidos: number
  caja: 1 | 2 | 3
  ultima: string
}

export interface Repaso {
  v: 1
  items: Record<string, ItemRepaso>
}

export const SEGUIDOS_PARA_DOMINAR = 3
const MAX_ITEMS = 400

export const claveRepaso = (cat: string, palabra: string): string => `${cat}|${palabra}`
export const claveStorageRepaso = (jugador: string): string => `cdp_repaso_${jugador.trim().toLowerCase()}`

export function repasoVacio(): Repaso {
  return { v: 1, items: {} }
}

const entero = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0)

/** Lee un guardado ilegible o de otra versión sin romper: lo que no sirve se descarta. */
export function leerRepaso(raw: string | null): Repaso {
  if (!raw) return repasoVacio()
  let json: unknown
  try { json = JSON.parse(raw) } catch { return repasoVacio() }
  if (typeof json !== 'object' || json === null) return repasoVacio()
  const j = json as Record<string, unknown>
  if (j['v'] !== 1 || typeof j['items'] !== 'object' || j['items'] === null || Array.isArray(j['items'])) return repasoVacio()
  const out = repasoVacio()
  for (const [k, v] of Object.entries(j['items'] as Record<string, unknown>)) {
    if (Object.keys(out.items).length >= MAX_ITEMS) break
    if (!k.includes('|') || typeof v !== 'object' || v === null) continue
    const it = v as Record<string, unknown>
    const caja = it['caja'] === 1 || it['caja'] === 2 || it['caja'] === 3 ? it['caja'] : 1
    out.items[k] = {
      fallos: Math.max(1, entero(it['fallos'])),
      seguidos: entero(it['seguidos']),
      caja,
      ultima: typeof it['ultima'] === 'string' ? it['ultima'].slice(0, 30) : '',
    }
  }
  return out
}

/** No muta el original (CLAUDE.md §14: al acumular, no mutar lo recibido). */
export function registrarFallo(r: Repaso, cat: string, palabra: string, ahora: string): Repaso {
  const k = claveRepaso(cat, palabra)
  const previo = r.items[k]
  const items = { ...r.items }
  items[k] = { fallos: (previo?.fallos ?? 0) + 1, seguidos: 0, caja: 1, ultima: ahora }
  return { v: 1, items }
}

/** La palabra cayó y el alumno la dejó pasar. Solo cuenta si estaba en el mazo. */
export function registrarAcierto(r: Repaso, cat: string, palabra: string, ahora: string): Repaso {
  const k = claveRepaso(cat, palabra)
  const previo = r.items[k]
  if (!previo || previo.caja === 3) return r
  const seguidos = previo.seguidos + 1
  const caja: 1 | 2 | 3 = seguidos >= SEGUIDOS_PARA_DOMINAR ? 3 : 2
  return { v: 1, items: { ...r.items, [k]: { ...previo, seguidos, caja, ultima: ahora } } }
}

/** Palabras de esta categoría que siguen en el mazo, las más urgentes primero. */
export function palabrasPendientes(r: Repaso, cat: string): string[] {
  const pref = cat + '|'
  return Object.entries(r.items)
    .filter(([k, it]) => k.startsWith(pref) && it.caja < 3)
    .sort((a, b) => a[1].caja - b[1].caja || b[1].fallos - a[1].fallos)
    .map(([k]) => k.slice(pref.length))
}

export function cantidadDominadas(r: Repaso): number {
  return Object.values(r.items).filter(it => it.caja === 3).length
}

/**
 * Lleva al frente de la lista de distractores hasta `fraccion` de los que se van
 * a usar, tomando los pendientes (caja 1 pesa más). Solo reordena lo que ya está
 * en el pool de la categoría: no inventa palabras.
 */
export function priorizarRepaso(
  pool: readonly string[], pendientes: readonly string[], r: Repaso, cat: string,
  cantidad: number, azar: () => number = Math.random,
): string[] {
  const enPool = pendientes.filter(w => pool.includes(w))
  if (enPool.length === 0 || cantidad <= 0) return [...pool]
  const elegidas: string[] = []
  for (const w of enPool) {
    const caja = r.items[claveRepaso(cat, w)]?.caja ?? 1
    const prob = caja === 1 ? 0.7 : 0.3
    if (elegidas.length < cantidad && azar() < prob) elegidas.push(w)
  }
  return [...elegidas, ...pool.filter(w => !elegidas.includes(w))]
}
