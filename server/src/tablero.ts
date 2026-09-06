import type { DuelWord } from './types'
import { PALABRAS, CATEGORIAS_VALIDAS } from './palabras'

// El servidor arma el tablero.
//
// Antes lo mandaba el cliente, incluida la marca de qué palabra era correcta y
// el nivel que multiplica los puntos. Sin tocar una línea del juego, mandando
// otros datos por la API, se podía crear un duelo con todo marcado como
// correcto y nivel 10, y cobrar 100 puntos por tocar un verbo en una partida de
// sustantivos. Comprobado contra producción antes de escribir esto.
//
// La regla general: si el cliente decide qué vale puntos, no hay defensa
// posible. Lo único que cierra el agujero es que lo decida el servidor.

// Mismos tamaños que usaba el cliente, para que la partida se sienta igual.
const TAMAÑOS: Record<number, { ok: number; mal: number }> = {
  1: { ok: 12, mal: 8 },
  2: { ok: 15, mal: 9 },
  3: { ok: 18, mal: 10 },
}

export const NIVEL_MIN = 1
export const NIVEL_MAX = 3
export const MAX_SEÑUELOS = 40

/**
 * Nivel del duelo. Sólo 1, 2 o 3: son los que ofrece el juego.
 *
 * Recortar al máximo seria peor que caer al mínimo: quien mande `nivel: 99` se
 * quedaria con el multiplicador más alto por pedir algo invalido. Fuera de la
 * lista se usa el 1. (En este juego no cambia nada: el nivel es interno al
 * duelo, se aplica igual a los dos y no llega a ningun ranking. Pero la regla
 * sana es que un valor invalido caiga en el default, no en el mejor.)
 */
export function nivelValido(v: unknown): number {
  return v === 1 || v === 2 || v === 3 ? v : 1
}

/** Fisher-Yates: `sort(() => Math.random() - 0.5)` no reparte parejo. */
function mezclar<T>(arr: readonly T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copia[i]!
    copia[i] = copia[j]!
    copia[j] = tmp
  }
  return copia
}

/**
 * Deja sólo las categorías que el servidor conoce.
 *
 * Una categoría inventada no puede aportar palabras, así que se descarta en vez
 * de arrastrar un hueco hasta el sorteo.
 */
export function categoriasConocidas(cats: readonly string[]): string[] {
  const vistas = new Set<string>()
  for (const c of cats) {
    if (CATEGORIAS_VALIDAS.includes(c)) vistas.add(c)
  }
  return [...vistas]
}

/**
 * Arma el tablero: `ok` palabras de la categoría y `mal` que no pertenecen.
 *
 * Devuelve null si no quedó ninguna categoría válida, para que el que crea el
 * duelo reciba un error claro en vez de un tablero vacío.
 */
export function construirTablero(cats: readonly string[], nivel: number): DuelWord[] | null {
  const validas = categoriasConocidas(cats)
  if (validas.length === 0) return null

  const tam = TAMAÑOS[nivel] ?? TAMAÑOS[1]!
  const porCatOk = Math.ceil(tam.ok / validas.length)
  const porCatMal = Math.ceil(tam.mal / validas.length)

  const todasOk: string[] = []
  const todasMal: string[] = []
  for (const cat of validas) {
    const p = PALABRAS[cat]!
    todasOk.push(...mezclar(p.ok).slice(0, porCatOk))
    todasMal.push(...mezclar(p.mal).slice(0, porCatMal))
  }

  // Sin repetidos: dos categorías pueden compartir una palabra en su lista de
  // incorrectas, y dos fichas iguales en el tablero se ven como un error.
  const ok = [...new Set(mezclar(todasOk))].slice(0, tam.ok)
  const mal = [...new Set(mezclar(todasMal))].filter(w => !ok.includes(w)).slice(0, tam.mal)

  const palabras = mezclar([
    ...ok.map(text => ({ text, isCorrect: true })),
    ...mal.map(text => ({ text, isCorrect: false })),
  ])

  return palabras.map((p, i) => ({
    id: String(i),
    text: p.text,
    isCorrect: p.isCorrect,
    takenBy: null,
  }))
}

/**
 * Mazo para los señuelos del DECOY: palabras de las mismas categorías que no
 * entraron al tablero, para que parezcan de esta partida.
 */
export function construirMazoSeñuelos(cats: readonly string[], enTablero: readonly string[]): string[] {
  const validas = categoriasConocidas(cats)
  const usadas = new Set(enTablero)
  const candidatas: string[] = []
  for (const cat of validas) {
    const p = PALABRAS[cat]!
    candidatas.push(...p.ok, ...p.mal)
  }
  const sinRepetir = [...new Set(candidatas)].filter(w => !usadas.has(w))
  return mezclar(sinRepetir).slice(0, MAX_SEÑUELOS)
}
