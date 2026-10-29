import { ClientResponseError } from 'pocketbase'
import { pb, getHostKeyId, setSalaContexto } from '../lib/pocketbase'
import type { RegistroErrores } from '../game/panelDocente'
import type { GameRecord } from '../types'
import { withRetry } from '../utils/network'
import { showBanner } from '../ui/Banner'
import { compararRanking } from '../game/reglas'

// ── Propiedad de las salas ────────────────────────────────────────────────────
// La propiedad la da la clave de docente (`owner_key_id` + cabeceras que valida el
// servidor), no un identificador de dispositivo. Antes se guardaba el SHA-256 del
// device id en `creator_device_hash` y en `cdp_scores.device_hash`: un identificador
// persistente de un menor, legible por quien tuviera el código de la sala y sin
// ningún uso (las reglas ya no lo miraban; hallazgo SEG-12 de la auditoría).

/**
 * Filtro de las salas de este docente. Sin clave de docente no hay forma de
 * identificarlo: se devuelve un filtro que no matchea nada, para que la pantalla
 * muestre «sin salas» en vez de romperse (`id = ""` nunca matchea).
 */
async function filtroPropiedad(extra = ''): Promise<string> {
  const id = getHostKeyId()
  const base = id ? pb.filter('owner_key_id = {:id}', { id }) : "id = ''"
  return extra ? `${base} && ${extra}` : base
}


export interface GlobalScore {
  /** Lo marco el auditor del servidor: las cuentas del puntaje no cierran. */
  sospechoso?: boolean
  motivo?: string | null
  jugador: string
  sala_code: string | null
  cat_nombre: string
  nivel: number
  pts: number
  medalla: string | null
  precision: number
  tiempo?: number | null
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
    await withRetry(() => pb.collection('cdp_scores').create({
      jugador,
      sala_code:    salaCode ?? null,
      // Deja explicito que es una partida de un jugador. Los de duelo los
      // escribe el servidor con `modo: 'duelo'`, y el auditor solo revisa
      // estos: los del duelo los calculo el servidor.
      modo:         'solo',
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
  } catch (e) {
    // Antes todo fallo decía "sin conexión", incluso cuando el servidor había
    // rechazado el puntaje. Un rechazo de validación no es un problema de red,
    // y decir que sí lo es manda a buscar el problema donde no está.
    const rechazado = e instanceof ClientResponseError && e.status === 400
    showBanner(rechazado
      ? '⚠️ El servidor no aceptó este puntaje. Avisale a tu docente.'
      : '⚠️ Sin conexión — tu puntaje no se registró en el ranking del aula')
  }
}

export async function fetchSalaRanking(salaCode: string, limit = 50): Promise<GlobalScore[]> {
  try {
    // Antes de leer: la regla del servidor exige la cabecera con el código de
    // la sala, y sin ella no devuelve nada aunque los puntajes existan.
    setSalaContexto(salaCode)
    const result = await pb.collection('cdp_scores').getList(1, limit, {
      filter: pb.filter('sala_code = {:code}', { code: salaCode }),
      sort: '-pts',
      fields: 'jugador,sala_code,cat_nombre,nivel,pts,medalla,precision,tiempo_usado,created,sospechoso,motivo_sospecha',
    })
    const filas = result.items.map(r => ({
      jugador:    r['jugador'],
      sala_code:  r['sala_code'] ?? null,
      cat_nombre: r['cat_nombre'],
      nivel:      r['nivel'],
      pts:        r['pts'],
      medalla:    r['medalla'] ?? null,
      precision:  r['precision'],
      tiempo:     typeof r['tiempo_usado'] === 'number' ? r['tiempo_usado'] : null,
      fecha:      r['created'],
      // Marca del auditor del servidor: el puntaje declara algo que no cierra.
      sospechoso: r['sospechoso'] === true,
      motivo:     r['motivo_sospecha'] ?? null,
    }))
    return filas.sort(compararRanking)
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
      owner_key_id:        getHostKeyId(),
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

/**
 * 'si' | 'no' | 'red'. Antes todo fallo daba `false`, y sin internet el alumno leía
 * «No se encontró una sala activa»: se culpaba al código de un problema de red.
 */
export async function verificarSala(code: string): Promise<'si' | 'no' | 'red'> {
  try {
    setSalaContexto(code)
    await pb.collection('cdp_salas').getFirstListItem(
      pb.filter('code = {:code} && activa = true', { code: code.toUpperCase() })
    )
    return 'si'
  } catch (e) {
    return e instanceof ClientResponseError && e.status === 404 ? 'no' : 'red'
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

/**
 * Borra los puntajes y los errores de una sala y VERIFICA que no quedó nada.
 *
 * Antes listaba con la cabecera `x-sala-code` del último ranking que se había
 * mirado, no la de esta sala: la regla de lectura devolvía una lista vacía, el
 * `Promise.all([])` daba `true` y el cartel decía «Scores eliminados» con los
 * datos de los chicos todavía en el servidor. Ahora se fija el contexto de esta
 * sala y se vuelve a contar.
 */
async function borrarContenidoDeSala(code: string): Promise<boolean> {
  setSalaContexto(code)
  const filtro = pb.filter('sala_code = {:code}', { code })
  const borrarColeccion = async (col: string, tolerarAusente: boolean): Promise<number> => {
    try {
      const filas = await pb.collection(col).getFullList({ filter: filtro, fields: 'id' })
      await Promise.all(filas.map(f => pb.collection(col).delete(f.id)))
      const quedan = await pb.collection(col).getList(1, 1, { filter: filtro, fields: 'id' })
      return quedan.totalItems
    } catch (e) {
      // cdp_errores puede no existir todavía en el servidor (migración sin aplicar).
      if (tolerarAusente && e instanceof ClientResponseError && e.status === 404) return 0
      throw e
    }
  }
  const quedanScores = await borrarColeccion('cdp_scores', false)
  const quedanErrores = await borrarColeccion('cdp_errores', true)
  return quedanScores === 0 && quedanErrores === 0
}

export async function limpiarScoresSala(code: string): Promise<boolean> {
  try {
    // Verify ownership first
    await pb.collection('cdp_salas').getFirstListItem(
      await filtroPropiedad(pb.filter('code = {:code}', { code }))
    )
    return await borrarContenidoDeSala(code)
  } catch (_) {
    return false
  }
}

/**
 * Publica qué palabras le salieron mal al alumno en esta partida, para el panel
 * del docente. Solo con sala, y también cuando no hubo medalla: justo esos
 * intentos son los que dicen quién se atascó. Nunca molesta al alumno: si falla
 * (o la colección todavía no existe), calla.
 */
export async function postErrores(
  p: { cat: string; nivel: number; cazadas: number; erradas: number },
  fallos: Record<string, number>, jugador: string, salaCode: string,
): Promise<void> {
  if (!salaCode) return
  const limpio: Record<string, number> = {}
  for (const [w, n] of Object.entries(fallos).slice(0, 40)) {
    if (w.length > 0 && w.length <= 24) limpio[w] = Math.max(1, Math.min(99, Math.floor(n)))
  }
  try {
    await pb.collection('cdp_errores').create({
      sala_code: salaCode.toUpperCase(),
      jugador,
      cat: p.cat,
      nivel: p.nivel,
      cazadas: p.cazadas,
      erradas: p.erradas,
      fallos: limpio,
    })
  } catch (_) { /* best-effort */ }
}

/** Solo el dueño de la sala puede leerlos (lo exige la regla del servidor). */
export async function fetchErroresSala(salaCode: string): Promise<RegistroErrores[] | null> {
  try {
    setSalaContexto(salaCode)
    const res = await pb.collection('cdp_errores').getList(1, 500, {
      filter: pb.filter('sala_code = {:code}', { code: salaCode }),
      sort: '-created',
      fields: 'jugador,cat,nivel,cazadas,erradas,fallos',
    })
    return res.items.map(r => ({
      jugador: String(r['jugador'] ?? ''),
      cat: String(r['cat'] ?? ''),
      nivel: Number(r['nivel']) || 0,
      cazadas: Number(r['cazadas']) || 0,
      erradas: Number(r['erradas']) || 0,
      fallos: (typeof r['fallos'] === 'object' && r['fallos'] !== null && !Array.isArray(r['fallos']))
        ? r['fallos'] as Record<string, number> : {},
    }))
  } catch (_) {
    return null   // sin conexión, sin permiso o la colección no existe
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
    // Primero el contenido: con la sala borrada, las reglas ya no dejan al
    // docente tocar los puntajes y quedan huérfanos para siempre (SEG-13).
    if (!(await borrarContenidoDeSala(code))) return false
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
