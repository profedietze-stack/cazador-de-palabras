import { lsGet, lsSet } from '../utils/storage'

// Ajustes del dispositivo (pantalla de inicio ⚙️): sonido, vibración, aspecto y
// ayudas. Sin DOM, para poder probarlos.
//
// Regla: solo entra acá lo que NO cambia la dificultad ni el puntaje. La velocidad
// de caída, el tiempo y los puntos no se configuran: si cada alumno los cambiara,
// el ranking de una sala dejaría de comparar partidas iguales.
//
// El guardado se lee campo por campo (`normalizarAjustes`): un valor ilegible o de
// otro tipo cae en el de fábrica sin tirar abajo el resto ni el juego.

export type Tema = 'auto' | 'claro' | 'oscuro'
export type TamanoPalabras = 'normal' | 'grande' | 'muygrande'
export type IntensidadVibracion = 'suave' | 'media' | 'fuerte'
export type EventoVibracion = 'acierto' | 'error' | 'combo'
export type TipoSonido = 'musica' | 'efectos'

export interface Ajustes {
  /** Interruptor general: apagado, no suena nada. */
  sonido: boolean
  volGeneral: number   // 0-100
  musica: boolean
  volMusica: number    // 0-100
  efectos: boolean
  volEfectos: number   // 0-100

  vibracion: boolean
  vibIntensidad: IntensidadVibracion
  vibAcierto: boolean
  vibError: boolean
  vibCombo: boolean

  tema: Tema
  tamanoPalabras: TamanoPalabras
  reducirMovimiento: boolean
  altoContraste: boolean
  fondoDecorativo: boolean
  stickers: boolean
}

export const AJUSTES_DE_FABRICA: Readonly<Ajustes> = Object.freeze({
  sonido: true, volGeneral: 80,
  musica: true, volMusica: 70,
  efectos: true, volEfectos: 100,
  vibracion: true, vibIntensidad: 'media' as IntensidadVibracion,
  vibAcierto: false, vibError: true, vibCombo: true,
  tema: 'oscuro' as Tema,
  tamanoPalabras: 'normal' as TamanoPalabras,
  reducirMovimiento: false, altoContraste: false,
  fondoDecorativo: true, stickers: true,
})

// Con «:» y no «_»: las claves de jugador son 'cdp_' + nombre, y un alumno llamado
// «ajustes» pisaría la clave. Tampoco la recorre el ranking global (solo mira 'cdp_').
export const CLAVE_AJUSTES = 'cdp:ajustes'

const TEMAS: readonly Tema[] = ['auto', 'claro', 'oscuro']
const TAMANOS: readonly TamanoPalabras[] = ['normal', 'grande', 'muygrande']
const INTENSIDADES: readonly IntensidadVibracion[] = ['suave', 'media', 'fuerte']

const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def)
const enumDe = <T extends string>(v: unknown, validos: readonly T[], def: T): T =>
  validos.includes(v as T) ? (v as T) : def
const porcentaje = (v: unknown, def: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : def

/** Lee un objeto cualquiera y devuelve ajustes válidos, campo por campo. */
export function normalizarAjustes(raw: unknown): Ajustes {
  const d = AJUSTES_DE_FABRICA
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    sonido: bool(o['sonido'], d.sonido), volGeneral: porcentaje(o['volGeneral'], d.volGeneral),
    musica: bool(o['musica'], d.musica), volMusica: porcentaje(o['volMusica'], d.volMusica),
    efectos: bool(o['efectos'], d.efectos), volEfectos: porcentaje(o['volEfectos'], d.volEfectos),
    vibracion: bool(o['vibracion'], d.vibracion),
    vibIntensidad: enumDe(o['vibIntensidad'], INTENSIDADES, d.vibIntensidad),
    vibAcierto: bool(o['vibAcierto'], d.vibAcierto), vibError: bool(o['vibError'], d.vibError),
    vibCombo: bool(o['vibCombo'], d.vibCombo),
    tema: enumDe(o['tema'], TEMAS, d.tema),
    tamanoPalabras: enumDe(o['tamanoPalabras'], TAMANOS, d.tamanoPalabras),
    reducirMovimiento: bool(o['reducirMovimiento'], d.reducirMovimiento),
    altoContraste: bool(o['altoContraste'], d.altoContraste),
    fondoDecorativo: bool(o['fondoDecorativo'], d.fondoDecorativo),
    stickers: bool(o['stickers'], d.stickers),
  }
}

/**
 * Ajustes a partir de lo guardado. Si todavía no hay `cdp_ajustes`, se heredan los
 * dos botones que existían antes (`cdp_sonido` y `cdp_tema`) para no cambiarle nada
 * a quien ya había silenciado el juego o elegido el tema oscuro.
 */
export function leerAjustes(guardado: string | null, sonidoViejo: string | null, temaViejo: string | null): Ajustes {
  if (guardado) {
    try { return normalizarAjustes(JSON.parse(guardado)) } catch { /* guardado ilegible: de fábrica */ }
    return normalizarAjustes({})
  }
  return normalizarAjustes({
    sonido: sonidoViejo === '0' ? false : true,
    tema: temaViejo === 'dark' ? 'oscuro' : temaViejo === 'light' ? 'claro' : 'oscuro',
  })
}

// ── Cálculos que consumen el audio, la vibración y la pantalla ───────────────

/** Ganancia (0-1) por la que se multiplica el volumen propio de cada sonido. */
export function ganancia(a: Ajustes, tipo: TipoSonido): number {
  if (!a.sonido) return 0
  if (tipo === 'musica' ? !a.musica : !a.efectos) return 0
  return (a.volGeneral / 100) * ((tipo === 'musica' ? a.volMusica : a.volEfectos) / 100)
}

const BASE_VIBRACION: Record<EventoVibracion, number[]> = {
  acierto: [15],
  error: [60],
  combo: [25, 40, 25],
}
const ESCALA_VIBRACION: Record<IntensidadVibracion, number> = { suave: 0.6, media: 1, fuerte: 1.8 }

/** Patrón para `navigator.vibrate`, o null si ese evento no debe vibrar. */
export function patronVibracion(a: Ajustes, evento: EventoVibracion): number[] | null {
  if (!a.vibracion) return null
  if (evento === 'acierto' && !a.vibAcierto) return null
  if (evento === 'error' && !a.vibError) return null
  if (evento === 'combo' && !a.vibCombo) return null
  const k = ESCALA_VIBRACION[a.vibIntensidad]
  // Los huecos (posiciones impares) no se escalan: son pausas, no vibración.
  return BASE_VIBRACION[evento].map((ms, i) => (i % 2 === 0 ? Math.round(ms * k) : ms))
}

export const MULTIPLICADOR_TAMANO: Record<TamanoPalabras, number> = { normal: 1, grande: 1.25, muygrande: 1.5 }

export function oscuroEfectivo(a: Ajustes, sistemaOscuro: boolean): boolean {
  return a.tema === 'oscuro' || (a.tema === 'auto' && sistemaOscuro)
}

// ── Estado actual y persistencia ─────────────────────────────────────────────

let actual: Ajustes = { ...AJUSTES_DE_FABRICA }
const oyentes = new Set<(a: Ajustes) => void>()

export function ajustes(): Readonly<Ajustes> { return actual }

export function cargarAjustes(): Ajustes {
  actual = leerAjustes(lsGet(CLAVE_AJUSTES), lsGet('cdp_sonido'), lsGet('cdp_tema'))
  return actual
}

/** Cambia uno o varios ajustes, lo guarda y avisa a quien lo aplica. */
export function cambiarAjustes(cambio: Partial<Ajustes>): Ajustes {
  actual = normalizarAjustes({ ...actual, ...cambio })
  lsSet(CLAVE_AJUSTES, JSON.stringify(actual))
  oyentes.forEach(fn => fn(actual))
  return actual
}

export function restablecerAjustes(): Ajustes {
  return cambiarAjustes({ ...AJUSTES_DE_FABRICA })
}

export function alCambiarAjustes(fn: (a: Ajustes) => void): void { oyentes.add(fn) }
