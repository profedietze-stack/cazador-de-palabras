import { supabase } from '../lib/supabase'
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
    await supabase.from('scores').insert({
      device_id:    getDeviceId(),
      jugador,
      sala_code:    salaCode ?? null,
      cat:          p.cat,
      cat_nombre:   p.catNombre,
      nivel:        p.nivel,
      pts:          p.pts,
      medalla:      p.medalla,
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
    const { data, error } = await supabase
      .from('scores')
      .select('jugador, sala_code, cat_nombre, nivel, pts, medalla, precision, fecha')
      .order('pts', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data as GlobalScore[]
  } catch (_) {
    return []
  }
}

export async function fetchSalaRanking(salaCode: string, limit = 50): Promise<GlobalScore[]> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('jugador, sala_code, cat_nombre, nivel, pts, medalla, precision, fecha')
      .eq('sala_code', salaCode)
      .order('pts', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data as GlobalScore[]
  } catch (_) {
    return []
  }
}

export async function crearSala(code: string, nombre: string, descripcion?: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('salas').insert({
      code,
      nombre,
      descripcion: descripcion ?? null,
      creator_device_id: getDeviceId(),
    })
    return !error
  } catch (_) {
    return false
  }
}

export async function verificarSala(code: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('salas')
      .select('code')
      .eq('code', code.toUpperCase())
      .eq('activa', true)
      .single()
    return !!data
  } catch (_) {
    return false
  }
}

export async function fetchMisSalas(): Promise<SalaInfo[]> {
  try {
    const { data, error } = await supabase
      .from('salas')
      .select('code, nombre, descripcion, activa, created_at')
      .eq('creator_device_id', getDeviceId())
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as SalaInfo[]
  } catch (_) {
    return []
  }
}

export async function limpiarScoresSala(code: string): Promise<boolean> {
  try {
    // Verify this device created the sala before deleting
    const { data: sala } = await supabase
      .from('salas')
      .select('code')
      .eq('code', code)
      .eq('creator_device_id', getDeviceId())
      .single()
    if (!sala) return false

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('sala_code', code)
    return !error
  } catch (_) {
    return false
  }
}

export async function desactivarSala(code: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('salas')
      .update({ activa: false })
      .eq('code', code)
      .eq('creator_device_id', getDeviceId())
    return !error
  } catch (_) {
    return false
  }
}

export { lsGet, lsSet }
