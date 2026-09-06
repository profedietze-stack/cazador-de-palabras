import type { RoomState } from './types'

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
export async function publicarResultado(room: RoomState): Promise<void> {
  // Sin sala no hay ranking al que publicar: el duelo se jugo suelto.
  if (!room.salaCode) return

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
      // `device_hash` identifica al dispositivo en el modo de un jugador. Acá
      // no hay uno: se usa el id de socket, que ya es efímero y anónimo.
      device_hash: 'duelo:' + jugador.socketId,
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
