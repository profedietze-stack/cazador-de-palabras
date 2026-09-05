import PocketBase from 'pocketbase'

export const pb = new PocketBase('https://aulaplay.duckdns.org')
// Disable auto-cancel so parallel requests don't cancel each other
pb.autoCancellation(false)

// ── Clave de docente ─────────────────────────────────────────────────────────
// Cada docente genera la suya desde el juego. Con ella maneja SUS salas: las
// desactiva, las borra y limpia sus puntajes. Se guarda en `host_keys`, una
// colección que nadie puede leer desde la API — el servidor la usa para validar
// y nunca la devuelve.
//
// Las cabeceras van en `beforeSend`, así viajan en todas las peticiones sin
// tocar cada llamada, y en cabecera y no en la URL para que no queden en los
// logs del servidor.

const K_CLAVE = 'cdp_host_key'
const K_ID = 'cdp_host_key_id'
const K_SALA = 'cdp_sala_contexto'

function get(k: string): string { try { return localStorage.getItem(k) || '' } catch { return '' } }
function set(k: string, v: string): void { try { localStorage.setItem(k, v) } catch { /* modo privado */ } }

export function getHostKey(): string { return get(K_CLAVE) }
export function getHostKeyId(): string { return get(K_ID) }
export function tieneClaveDocente(): boolean { return !!getHostKey() && !!getHostKeyId() }

/**
 * Guarda la clave y verifica releyendo que haya quedado escrita.
 *
 * En modo incógnito localStorage acepta la escritura y después devuelve vacío.
 * Hay que avisarle al docente: si cierra la pestaña pierde el manejo de sus
 * salas, y la clave no se puede recuperar.
 */
export function guardarClaveDocente(clave: string, id: string): boolean {
  set(K_CLAVE, clave); set(K_ID, id)
  return get(K_CLAVE) === clave && get(K_ID) === id
}

/** Sala cuyo contexto se usa para leer: las reglas la exigen por cabecera. */
export function setSalaContexto(code: string): void { set(K_SALA, (code || '').toUpperCase()) }
export function getSalaContexto(): string { return get(K_SALA) }

export function generarClave(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 32).toUpperCase()
}

export async function crearClaveDocente(): Promise<{ clave: string; id: string; guardada: boolean }> {
  const clave = generarClave()
  const registro = await pb.collection('host_keys').create({ key: clave, nombre: 'docente' })
  return { clave, id: registro.id, guardada: guardarClaveDocente(clave, registro.id) }
}

pb.beforeSend = (url, options) => {
  options.headers = {
    ...options.headers,
    'x-host-key': getHostKey(),
    'x-host-key-id': getHostKeyId(),
    'x-sala-code': getSalaContexto(),
  }
  return { url, options }
}
