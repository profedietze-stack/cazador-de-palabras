// Limites de ritmo y de origen del duelo.
//
// Por que existe: `word_caught` no tenia limite. Un script con dos sockets
// capturo las 14 correctas de un tablero de nivel 3 en 1,5 s y obtuvo el maximo
// (540). Un humano no lee y decide una palabra cada pocos milisegundos.

/** Menos que esto entre dos capturas del mismo jugador no es una persona. */
export const MIN_INTERVALO_CAPTURA_MS = 200

/** Un aula entera detras de la misma IP de escuela: 15 duelos a la vez es mucho. */
export const MAX_SALAS_POR_IP = 20

/** Un duelo que dura menos que esto no se publica en el ranking del aula. */
export const MIN_DURACION_PUBLICABLE_MS = 8000

export function crearLimitadorCaptura(minimoMs: number = MIN_INTERVALO_CAPTURA_MS) {
  const ultima = new Map<string, number>()
  return {
    /** true si la captura puede procesarse; registra el instante si es asi. */
    permitir(socketId: string, ahora: number = Date.now()): boolean {
      const u = ultima.get(socketId)
      if (u !== undefined && ahora - u < minimoMs) return false
      ultima.set(socketId, ahora)
      return true
    },
    olvidar(socketId: string): void {
      ultima.delete(socketId)
    },
  }
}

/**
 * IP del cliente detras del reverse proxy.
 *
 * Se confia en `X-Real-IP` (nginx la sobrescribe) y NO en `X-Forwarded-For`,
 * que el cliente puede falsear anteponiendo valores.
 */
export function ipDelCliente(
  headers: Record<string, string | string[] | undefined>,
  direccion: string,
): string {
  const v = headers['x-real-ip']
  const real = Array.isArray(v) ? v[0] : v
  return (real && real.trim().slice(0, 64)) || direccion || 'desconocida'
}
