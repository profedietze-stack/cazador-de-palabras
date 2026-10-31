import type { RoomState } from './types'
import { MIN_DURACION_PUBLICABLE_MS } from './ritmo'
import { contar } from './observabilidad'

// Publicacion del resultado del duelo en el ranking del aula.
//
// Por que estos puntajes valen mas que los del modo de un jugador: el servidor
// llevo la partida entera. El tablero lo armo el, cada captura la valido el, y
// el puntaje nunca paso por el dispositivo del alumno. Es confiable por
// construccion, no por validacion posterior.
//
// Como se identifica el servidor ante PocketBase, sin ninguna credencial:
//
//   - PocketBase no esta expuesto a internet (puerto 8090 cerrado, verificado
//     desde afuera). Solo se llega por nginx.
//   - nginx vacia `X-Origen-Duelo` en toda peticion publica, asi que ningun
//     cliente puede mandarla.
//   - Este proceso habla con PocketBase por la red interna de Docker, sin
//     pasar por nginx, y por eso la cabecera sobrevive.
//
// La cabecera no es un secreto: es una marca que solo sobrevive si la peticion
// no vino de afuera. No hay nada que filtrar ni que rotar.

const PB_URL = process.env.POCKETBASE_URL ?? 'http://pocketbase:8090'
const CABECERA_INTERNA = '1'

export type EstadoPocketBase = 'ok' | 'inalcanzable' | 'sin_verificar'

let estadoPB: EstadoPocketBase = 'sin_verificar'

/** Lo que muestra `/duel/health`: si desde este contenedor se llega a PocketBase. */
export const estadoPocketBase = (): EstadoPocketBase => estadoPB

/** Por qué falló la conexión, sin datos sensibles: «ENOTFOUND», «ECONNREFUSED», «TimeoutError», «http_403»… */
function motivoDe(e: unknown): string {
  const err = e as { cause?: { code?: string }; code?: string; name?: string } | null
  return err?.cause?.code ?? err?.code ?? err?.name ?? 'desconocido'
}

/**
 * Anota que PocketBase no se alcanza y lo dice FUERTE, una sola vez por caída.
 *
 * Esto existe por un caso real: el contenedor de duelos y el de PocketBase estaban
 * en redes de Docker distintas, el nombre `pocketbase` no se resolvía y el servidor
 * lo trataba como «el aula no existe». Los duelos se jugaban bien y sus resultados no
 * llegaban nunca al ranking del docente, sin ningún aviso. Quedó así semanas.
 */
function marcarInalcanzable(motivo: string): void {
  if (estadoPB !== 'inalcanzable') {
    console.error(
      `[duelo] POCKETBASE INALCANZABLE desde este contenedor (${motivo}): los resultados de los duelos NO se estan ` +
      'publicando en el ranking del aula. ¿Estan en la misma red de Docker? Ver docs/operaciones/servidor-docker.md',
    )
  }
  estadoPB = 'inalcanzable'
}

function marcarAlcanzable(): void {
  if (estadoPB === 'inalcanzable') console.log('[duelo] PocketBase volvio a ser alcanzable: se retoma la publicacion de resultados.')
  estadoPB = 'ok'
}

/** Pregunta a PocketBase si está sano. Cambia el estado y avisa solo cuando cambia. */
export async function verificarPocketBase(): Promise<boolean> {
  try {
    const r = await fetch(`${PB_URL}/api/health`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) { marcarInalcanzable(`http_${r.status}`); return false }
    marcarAlcanzable()
    return true
  } catch (e) {
    marcarInalcanzable(motivoDe(e))
    return false
  }
}

/** Comprueba ahora y cada `cadaMs`: una caída o una red mal armada se ve en el log en minutos, no en semanas. */
export function vigilarPocketBase(cadaMs = 5 * 60_000): ReturnType<typeof setInterval> {
  void verificarPocketBase()
  const t = setInterval(() => { void verificarPocketBase() }, cadaMs)
  t.unref?.()
  return t
}

/**
 * Publica el puntaje de cada jugador del duelo.
 *
 * Nunca lanza: que falle el ranking no puede romper la partida, que ya
 * termino. Si algo sale mal queda en el log del servidor.
 */
/**
 * ¿Existe esa aula y esta activa? El codigo de aula lo elige el cliente al crear
 * el duelo: sin esta comprobacion un alumno publicaba el resultado en el
 * ranking de cualquier curso, existiera o no. Va por la red interna con la
 * misma regla de lectura que usan los alumnos (el codigo en `X-Sala-Code`).
 */
export type ConsultaSala = 'activa' | 'no' | 'error'

/**
 * Como `salaActiva`, pero distingue «el aula no existe» de «no pude preguntar»: la segunda
 * es un problema de infraestructura y no se debe confundir con la primera.
 */
export async function consultarSala(code: string): Promise<ConsultaSala> {
  // El codigo viene del cliente y va dentro de un filtro: solo formato de aula.
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return 'no'
  try {
    const filtro = encodeURIComponent(`code="${code}" && activa=true`)
    const r = await fetch(
      `${PB_URL}/api/collections/cdp_salas/records?perPage=1&filter=${filtro}`,
      { headers: { 'X-Sala-Code': code }, signal: AbortSignal.timeout(8000) },
    )
    if (!r.ok) { marcarInalcanzable(`http_${r.status}`); return 'error' }
    const json = (await r.json()) as { items?: unknown[] }
    marcarAlcanzable()
    return Array.isArray(json.items) && json.items.length > 0 ? 'activa' : 'no'
  } catch (e) {
    marcarInalcanzable(motivoDe(e))
    return 'error'
  }
}

export async function salaActiva(code: string): Promise<boolean> {
  return (await consultarSala(code)) === 'activa'
}

export async function publicarResultado(room: RoomState): Promise<void> {
  // Sin sala no hay ranking al que publicar: el duelo se jugo suelto.
  if (!room.salaCode) return

  // Un duelo que terminó casi al empezar (todas las fichas en un instante, o un
  // corte de conexión) no mide nada y es la forma barata de sembrar puntajes.
  if (room.startedAt !== null && Date.now() - room.startedAt < MIN_DURACION_PUBLICABLE_MS) {
    console.warn(`[duelo] no se publica: el duelo ${room.code} duro menos de ${MIN_DURACION_PUBLICABLE_MS / 1000} s`)
    return
  }

  const sala = await consultarSala(room.salaCode)
  if (sala === 'error') {
    // Infraestructura, no culpa del aula: ya quedo el aviso fuerte en el log y el contador en /health.
    contar('ranking_no_publicado', { motivo: 'pocketbase_inalcanzable' })
    return
  }
  if (sala === 'no') {
    console.warn(`[duelo] no se publica: el aula ${room.salaCode} no existe o esta inactiva`)
    return
  }

  for (const jugador of room.players.values()) {
    const cuerpo = {
      // El ranking del aula muestra nombre y puntaje. El resto de los campos
      // son del modo de un jugador y no aplican a un duelo.
      jugador: jugador.nombre,
      pts: jugador.score,
      sala_code: room.salaCode,
      modo: 'duelo',
      cat: 'duelo',
      cat_nombre: 'Duelo',
      nivel: room.nivel,
    }

    try {
      const r = await fetch(`${PB_URL}/api/collections/cdp_scores/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Origen-Duelo': CABECERA_INTERNA,
        },
        body: JSON.stringify(cuerpo),
      })
      if (!r.ok) {
        const detalle = await r.text().catch(() => '')
        console.error(`[duelo] el ranking rechazo el puntaje de ${jugador.nombre}: ` +
          `${r.status} ${detalle.slice(0, 200)}`)
      }
    } catch (e) {
      console.error(`[duelo] no se pudo publicar el puntaje de ${jugador.nombre}:`, e)
    }
  }
}
