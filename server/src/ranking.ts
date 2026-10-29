import type { RoomState } from './types'
import { MIN_DURACION_PUBLICABLE_MS } from './ritmo'

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
export async function salaActiva(code: string): Promise<boolean> {
  // El codigo viene del cliente y va dentro de un filtro: solo formato de aula.
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return false
  try {
    const filtro = encodeURIComponent(`code="${code}" && activa=true`)
    const r = await fetch(
      `${PB_URL}/api/collections/cdp_salas/records?perPage=1&filter=${filtro}`,
      { headers: { 'X-Sala-Code': code } },
    )
    if (!r.ok) return false
    const json = (await r.json()) as { items?: unknown[] }
    return Array.isArray(json.items) && json.items.length > 0
  } catch {
    return false
  }
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

  if (!(await salaActiva(room.salaCode))) {
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
