import type { GameRecord, AchievementRecord, PlayerData, CategoryKey, Medal } from '../types'

// Lectura del guardado campo por campo (CLAUDE.md §14).
//
// Antes `cargarDatos` hacía solo `JSON.parse` en try/catch. Eso se defiende del
// JSON ilegible, pero un texto que SÍ parsea con el tipo cambiado pasaba entero:
// con `partidas: "x"` reventaban las medallas y el ranking (`n.map is not a
// function`), `logros: 5` y un `null` literal también, y un diseño de stickers con
// otra forma tiraba errores en el menú. No hace falta un alumno editando
// localStorage: alcanza con que una versión futura cambie un tipo.
//
// Lo que no sirve se descarta, lo que sirve se conserva.

const CATEGORIAS: readonly string[] = [
  'sustantivos', 'adjetivos', 'verbos', 'adverbios', 'articulos',
  'pronombres', 'preposiciones', 'conjunciones', 'interjecciones',
]
const MEDALLAS: readonly string[] = ['ORO', 'PLATA', 'BRONCE']

const MAX_PARTIDAS = 500
const MAX_LOGROS = 50

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const numero = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null

export function validarPartida(v: unknown): GameRecord | null {
  if (!esObjeto(v)) return null
  if (typeof v['cat'] !== 'string' || !CATEGORIAS.includes(v['cat'])) return null
  const nivel = numero(v['nivel'], 1, 3)
  const pts = numero(v['pts'], 0, 1e6)
  const precision = numero(v['precision'], 0, 100)
  const cazadas = numero(v['cazadas'], 0, 1e4)
  const erradas = numero(v['erradas'], 0, 1e4)
  if (nivel === null || pts === null || precision === null || cazadas === null || erradas === null) return null
  const medalla = typeof v['medalla'] === 'string' && MEDALLAS.includes(v['medalla']) ? (v['medalla'] as Medal) : null
  return {
    cat: v['cat'] as CategoryKey,
    catNombre: typeof v['catNombre'] === 'string' ? v['catNombre'].slice(0, 40) : v['cat'],
    nivel,
    pts,
    medalla,
    precision,
    cazadas,
    erradas,
    tiempoUsado: numero(v['tiempoUsado'], 0, 1e5) ?? 0,
    combosHechos: numero(v['combosHechos'], 0, 1e4) ?? 0,
    fecha: typeof v['fecha'] === 'string' ? v['fecha'].slice(0, 40) : '',
  }
}

export function validarLogro(v: unknown): AchievementRecord | null {
  if (!esObjeto(v)) return null
  const id = numero(v['id'], 1, 1000)
  if (id === null || !Number.isInteger(id)) return null
  return { id, fecha: typeof v['fecha'] === 'string' ? v['fecha'].slice(0, 40) : '' }
}

/** Convierte lo que haya guardado (cualquier cosa) en un PlayerData seguro. */
export function validarDatos(crudo: unknown): PlayerData {
  if (!esObjeto(crudo)) return {}
  const out: PlayerData = {}
  if (Array.isArray(crudo['partidas'])) {
    out.partidas = crudo['partidas'].slice(-MAX_PARTIDAS).map(validarPartida).filter((p): p is GameRecord => p !== null)
  }
  if (Array.isArray(crudo['logros'])) {
    out.logros = crudo['logros'].slice(0, MAX_LOGROS).map(validarLogro).filter((l): l is AchievementRecord => l !== null)
  }
  if (typeof crudo['tituloAnterior'] === 'string') out.tituloAnterior = crudo['tituloAnterior'].slice(0, 60)
  return out
}

/** Diseño de stickers: lista de objetos; cualquier otra forma se descarta. */
export function validarLayout(crudo: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(crudo)) return null
  return crudo.filter(esObjeto).slice(0, 200)
}
