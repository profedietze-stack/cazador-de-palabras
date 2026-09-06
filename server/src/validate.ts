// Validación de todo lo que llega por socket.
//
// Por qué existe: los handlers confiaban en la forma de los datos. Un
// `join_duel` con `code: 12345` hacía `data.code.toUpperCase()` sobre un
// número, tiraba una excepción no capturada y **mataba el proceso**. Un solo
// paquete desde cualquier navegador cortaba los duelos de todo el mundo, y se
// podía repetir. Reproducido antes de escribir esto.
//
// Regla: nada que venga del cliente se usa sin comprobar tipo y límites. El
// cliente propio manda datos bien formados; el que no lo hace, no es el
// cliente propio.

import type { DuelWord } from './types'

// Un tablero de duelo real tiene unas decenas de palabras. El tope existe para
// que nadie mande un millón y llene la memoria del servidor.
export const MAX_WORDS = 200
export const MAX_NOMBRE = 24
export const MAX_TEXTO_PALABRA = 40
export const MIN_DURACION = 10
export const MAX_DURACION = 600
export const MAX_CATS = 10

export function esTexto(v: unknown): v is string {
  return typeof v === 'string'
}

/** Recorta y limita. Devuelve '' si no era texto. */
export function textoLimpio(v: unknown, max: number): string {
  if (!esTexto(v)) return ''
  // Se sacan los caracteres de control: no aportan nada y ensucian los logs.
  return v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max)
}

/** Número dentro de un rango. Devuelve `porDefecto` si no lo es. */
export function numeroEnRango(v: unknown, min: number, max: number, porDefecto: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return porDefecto
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/**
 * Código de sala: sólo el alfabeto que genera el servidor.
 *
 * No se recorta antes de validar. Recortando, un código de 10 caracteres
 * quedaba en 8 y pasaba como válido; si es más largo de lo que el servidor
 * emite, es basura y se rechaza.
 */
export function codigoSala(v: unknown): string | null {
  const s = textoLimpio(v, 64).toUpperCase()
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4,8}$/.test(s)) return null
  return s
}

/** Nombre de jugador. Vacío se reemplaza para no romper la interfaz. */
export function nombreJugador(v: unknown): string {
  const s = textoLimpio(v, MAX_NOMBRE)
  return s.length > 0 ? s : 'Jugador'
}

/**
 * Palabras del tablero. Las manda el que crea el duelo, así que llegan del
 * cliente y hay que darles forma antes de guardarlas y reenviarlas al rival.
 * Devuelve null si no hay ni una palabra utilizable.
 */
export function tableroDePalabras(v: unknown): DuelWord[] | null {
  if (!Array.isArray(v)) return null
  const palabras: DuelWord[] = []
  for (const w of v.slice(0, MAX_WORDS)) {
    if (typeof w !== 'object' || w === null) continue
    const raw = w as Record<string, unknown>
    const text = textoLimpio(raw['text'], MAX_TEXTO_PALABRA)
    if (!text) continue
    palabras.push({
      // El id se reasigna acá: el del cliente no se usa para nada más y así
      // no puede colisionar ni traer sorpresas.
      id: String(palabras.length),
      text,
      isCorrect: raw['isCorrect'] === true,
      takenBy: null,
    })
  }
  return palabras.length > 0 ? palabras : null
}

// Mazo de señuelos: palabras sueltas, no objetos. Tope generoso pero acotado.
export const MAX_SEÑUELOS = 60

/**
 * Palabras candidatas a señuelo que manda el cliente. Se muestran en la
 * pantalla del rival, así que pasan por la misma limpieza que todo lo demás.
 * Devuelve [] ante cualquier cosa rara: sin mazo, el servidor usa su reserva.
 */
export function mazoDeSeñuelos(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const vistas = new Set<string>()
  for (const w of v.slice(0, MAX_SEÑUELOS)) {
    const t = textoLimpio(w, MAX_TEXTO_PALABRA)
    if (t) vistas.add(t)
  }
  return [...vistas]
}

/** Categorías. Acepta el formato viejo (`cat` string) y el nuevo (`cats`). */
export function categorias(cats: unknown, cat: unknown): string[] {
  if (Array.isArray(cats)) {
    return cats.slice(0, MAX_CATS).map(c => textoLimpio(c, 32)).filter(Boolean)
  }
  const uno = textoLimpio(cat, 32)
  return uno ? [uno] : []
}
