import { pb } from '../lib/pocketbase'
import type { GameRecord } from '../types'

const DEVICE_KEY = 'cdp_device_id'

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch { /* Safari private / quota */ }
}

export function getDeviceId(): string {
  let id = lsGet(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    lsSet(DEVICE_KEY, id)
  }
  return id
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
    await pb.collection('cdp_scores').create({
      device_id:    getDeviceId(),
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
    })
  } catch (_) {
    // best-effort — offline play still works
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
    return []
  }
}

export async function crearSala(code: string, nombre: string, descripcion?: string): Promise<boolean> {
  try {
    await pb.collection('cdp_salas').create({
      code:              code.toUpperCase(),
      nombre,
      descripcion:       descripcion ?? null,
      activa:            true,
      creator_device_id: getDeviceId(),
    })
    return true
  } catch (_) {
    return false
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
      filter: pb.filter('creator_device_id = {:did}', { did: getDeviceId() }),
      sort: '-created',
      fields: 'code,nombre,descripcion,activa,created',
    })
    return result.items.map(r => ({
      code:        r['code'],
      nombre:      r['nombre'],
      descripcion: r['descripcion'] ?? null,
      activa:      r['activa'] ?? null,
      created_at:  r['created'],
    }))
  } catch (_) {
    return []
  }
}

export async function limpiarScoresSala(code: string): Promise<boolean> {
  try {
    // Verify ownership first
    await pb.collection('cdp_salas').getFirstListItem(
      pb.filter('code = {:code} && creator_device_id = {:did}', { code, did: getDeviceId() })
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
      pb.filter('code = {:code} && creator_device_id = {:did}', { code, did: getDeviceId() })
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
      pb.filter('code = {:code} && creator_device_id = {:did}', { code, did: getDeviceId() })
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
      filter: pb.filter('creator_device_id = {:did} && activa = true', { did: getDeviceId() }),
      fields: 'id',
    })
    return result.totalItems
  } catch (_) {
    return 0
  }
}

export { lsGet, lsSet }
