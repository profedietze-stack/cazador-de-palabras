import { ClientResponseError } from 'pocketbase'
import { pb } from '../lib/pocketbase'
import type { GameRecord } from '../types'
import { withRetry } from '../utils/network'
import { lsGet, lsSet } from '../utils/storage'
import { showBanner } from '../ui/Banner'

const DEVICE_KEY = 'cdp_device_id'

export function getDeviceId(): string {
  let id = lsGet(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    lsSet(DEVICE_KEY, id)
  }
  return id
}

// ── Identidad de dispositivo por hash ────────────────────────────────────────
// `cdp_salas` y `cdp_scores` tienen lectura publica. Guardar el UUID del
// dispositivo en crudo permitia que cualquiera lo copiara de la API a su propio
// localStorage y quedara como duenio de las salas ajenas: verlas, desactivarlas
// y borrarlas, sin escribir codigo.
//
// Ahora se guarda el SHA-256. El cliente conoce su UUID, calcula el hash y
// consulta por hash; un atacante lee el hash pero no puede derivar el UUID.
// El hash se cachea porque las consultas de salas son frecuentes.

const DEVICE_HASH_KEY = 'cdp_device_hash'

async function sha256Hex(input: string): Promise<string> {
  // crypto.subtle solo existe en contextos seguros (https o localhost). Si no
  // esta, devolvemos '' y el llamador cae al filtro por el id viejo.
  if (!globalThis.crypto?.subtle) return ''
  try {
    const bytes = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return ''
  }
}

/** Hash del device id, cacheado en localStorage. Idempotente. */
export async function getDeviceHash(): Promise<string> {
  const cached = lsGet(DEVICE_HASH_KEY)
  if (cached) return cached
  const hash = await sha256Hex(getDeviceId())
  if (hash) lsSet(DEVICE_HASH_KEY, hash)
  return hash
}

/**
 * Filtro de propiedad en modo dual.
 *
 * Empareja por hash y, mientras exista la columna vieja, tambien por el id en
 * crudo, para que las salas creadas antes de la migracion sigan siendo
 * administrables por su duenio. Cuando se elimine `creator_device_id`, la rama
 * legacy queda muerta y se puede borrar.
 */
async function filtroPropiedad(extra = ''): Promise<string> {
  const hash = await getDeviceHash()
  const did = getDeviceId()
  const base = hash
    ? pb.filter('(creator_device_hash = {:h} || creator_device_id = {:d})', { h: hash, d: did })
    : pb.filter('creator_device_id = {:d}', { d: did })
  return extra ? `${base} && ${extra}` : base
}

export interface GlobalScore {
  jugador: string
  sala_code: string | null
  cat_nombre: string
  nivel: number
  pts: number
  medalla: string | null
  precision: number
  fecha: string
}

export interface SalaInfo {
  code: string
  nombre: string
  descripcion: string | null
  activa: boolean | null
  created_at: string | null
}

export async function postScore(p: GameRecord, jugador: string, salaCode?: string): Promise<void> {
  try {
    // Fuera del callback: `withRetry` lo reintenta, y el hash no cambia.
    const deviceHash = await getDeviceHash()
    await withRetry(() => pb.collection('cdp_scores').create({
      device_id:    getDeviceId(),
      device_hash:  deviceHash,
      jugador,
      sala_code:    salaCode ?? null,
      cat:          p.cat,
      cat_nombre:   p.catNombre,
      nivel:        p.nivel,
      pts:          p.pts,
      medalla:      p.medalla ?? null,
      precision:    p.precision,
      cazadas:      p.cazadas,
      erradas:      p.erradas,
      tiempo_usado: p.tiempoUsado,
      combos:       p.combosHechos,
    }), 3, 500)
  } catch (_) {
    // offline play still works — score just won't appear on the global ranking
    showBanner('⚠️ Sin conexión — puntaje no registrado en el ranking global')
  }
}

export async function fetchGlobalRanking(limit = 50): Promise<GlobalScore[]> {
  try {
    const result = await pb.collection('cdp_scores').getList(1, limit, {
      sort: '-pts',
      fields: 'jugador,sala_code,cat_nombre,nivel,pts,medalla,precision,created',
    })
    return result.items.map(r => ({
      jugador:    r['jugador'],
      sala_code:  r['sala_code'] ?? null,
      cat_nombre: r['cat_nombre'],
      nivel:      r['nivel'],
      pts:        r['pts'],
      medalla:    r['medalla'] ?? null,
      precision:  r['precision'],
      fecha:      r['created'],
    }))
  } catch (_) {
    showBanner('⚠️ Sin conexión — no se pudo cargar el ranking')
    return []
  }
}

export async function fetchSalaRanking(salaCode: string, limit = 50): Promise<GlobalScore[]> {
  try {
    const result = await pb.collection('cdp_scores').getList(1, limit, {
      filter: pb.filter('sala_code = {:code}', { code: salaCode }),
      sort: '-pts',
      fields: 'jugador,sala_code,cat_nombre,nivel,pts,medalla,precision,created',
    })
    return result.items.map(r => ({
      jugador:    r['jugador'],
      sala_code:  r['sala_code'] ?? null,
      cat_nombre: r['cat_nombre'],
      nivel:      r['nivel'],
      pts:        r['pts'],
      medalla:    r['medalla'] ?? null,
      precision:  r['precision'],
      fecha:      r['created'],
    }))
  } catch (_) {
    showBanner('⚠️ Sin conexión — no se pudo cargar el ranking')
    return []
  }
}

export type CrearSalaResult = 'ok' | 'duplicate' | 'error'

export async function crearSala(code: string, nombre: string, descripcion?: string): Promise<CrearSalaResult> {
  try {
    await pb.collection('cdp_salas').create({
      code:              code.toUpperCase(),
      nombre,
      descripcion:       descripcion ?? null,
      activa:              true,
      creator_device_id:   getDeviceId(),
      creator_device_hash: await getDeviceHash(),
    })
    return 'ok'
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 400) {
      const data = e.response?.data as Record<string, unknown> | undefined
      if (data?.['code']) return 'duplicate'
    }
    return 'error'
  }
}

export async function verificarSala(code: string): Promise<boolean> {
  try {
    await pb.collection('cdp_salas').getFirstListItem(
      pb.filter('code = {:code} && activa = true', { code: code.toUpperCase() })
    )
    return true
  } catch (_) {
    return false
  }
}

export async function fetchMisSalas(): Promise<SalaInfo[]> {
  try {
    const result = await pb.collection('cdp_salas').getList(1, 200, {
      filter: await filtroPropiedad(),
      sort: '-id',
      fields: 'id,code,nombre,descripcion,activa,created',
    })
    return result.items.map(r => ({
      code:        r['code'],
      nombre:      r['nombre'],
      descripcion: r['descripcion'] ?? null,
      activa:      r['activa'] ?? null,
      created_at:  r['created'] ?? null,
    }))
  } catch (_) {
    showBanner('⚠️ Sin conexión — no se pudieron cargar tus salas')
    return []
  }
}

export async function limpiarScoresSala(code: string): Promise<boolean> {
  try {
    // Verify ownership first
    await pb.collection('cdp_salas').getFirstListItem(
      await filtroPropiedad(pb.filter('code = {:code}', { code }))
    )
    // PocketBase has no bulk delete by filter — list IDs then delete each
    const scores = await pb.collection('cdp_scores').getFullList({
      filter: pb.filter('sala_code = {:code}', { code }),
      fields: 'id',
    })
    await Promise.all(scores.map(s => pb.collection('cdp_scores').delete(s.id)))
    return true
  } catch (_) {
    return false
  }
}

export async function desactivarSala(code: string): Promise<boolean> {
  try {
    const sala = await pb.collection('cdp_salas').getFirstListItem(
      await filtroPropiedad(pb.filter('code = {:code}', { code }))
    )
    await pb.collection('cdp_salas').update(sala.id, { activa: false })
    return true
  } catch (_) {
    return false
  }
}

export async function eliminarSala(code: string): Promise<boolean> {
  try {
    const sala = await pb.collection('cdp_salas').getFirstListItem(
      await filtroPropiedad(pb.filter('code = {:code}', { code }))
    )
    await pb.collection('cdp_salas').delete(sala.id)
    return true
  } catch (_) {
    return false
  }
}

export async function contarSalasActivas(): Promise<number> {
  try {
    const result = await pb.collection('cdp_salas').getList(1, 1, {
      filter: await filtroPropiedad('activa = true'),
      fields: 'id',
    })
    return result.totalItems
  } catch (_) {
    return 0
  }
}
