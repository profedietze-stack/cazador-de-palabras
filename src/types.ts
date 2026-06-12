export type CategoryKey =
  | 'sustantivos' | 'adjetivos' | 'verbos' | 'adverbios'
  | 'articulos' | 'pronombres' | 'preposiciones' | 'conjunciones' | 'interjecciones'

export interface Category {
  nombre: string
  icon: string
  def: string
  ejem: string[]
  ok: string[]
  mal: string[]
}

export type Medal = 'ORO' | 'PLATA' | 'BRONCE'

export interface GameRecord {
  cat: CategoryKey
  catNombre: string
  nivel: number
  pts: number
  medalla: Medal | null
  precision: number
  cazadas: number
  erradas: number
  tiempoUsado: number
  combosHechos: number
  fecha: string
  jugador?: string
}

export interface AchievementRecord {
  id: number
  fecha: string
}

export interface PlayerData {
  partidas?: GameRecord[]
  logros?: AchievementRecord[]
  tituloAnterior?: string
}

export interface Achievement {
  id: number
  e: string
  n: string
  d: string
}

export interface TitleDef {
  req: number
  t: string
}

export interface ComboLevel {
  racha: number
  mult: number
  label: string
  clase: string
}

export interface GameState {
  jugador: string
  cat: CategoryKey | null
  nivel: number
  pts: number
  obj: number
  tiempo: number
  tiempoExtra: boolean
  cazadas: number
  erradas: number
  activo: boolean
  pausado: boolean
  intervaloTiempo: ReturnType<typeof setInterval> | null
  velocidadBase: number
  sonido: boolean
  tiempoInicioNivel: number | null
  racha: number
  comboNivel: number
  combosTotalesPartida: number
}
