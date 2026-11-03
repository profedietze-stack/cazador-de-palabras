/**
 * De dónde entran las palabras. Hasta el nivel 1 todas caen desde arriba; al subir de nivel
 * algunas entran por un costado y se curvan hacia abajo (nivel 2: derecha; nivel 3: derecha e
 * izquierda). Es lógica pura: WordSpawner elige y WordPhysics mueve.
 */

export type Lado = 'arriba' | 'derecha' | 'izquierda'

/** Proporción de palabras que entran por cada costado, según el nivel. */
const LATERAL: Record<number, { derecha: number; izquierda: number }> = {
  2: { derecha: 0.25, izquierda: 0 },
  3: { derecha: 0.2, izquierda: 0.2 },
}

/** Dos palabras por el mismo costado, con menos de esto entre una y otra, no se juntan. */
export const ESPACIO_LATERAL_MS = 600

/** Cuánto tarda una palabra lateral en llegar a su lugar (la curva) y en tomar su velocidad de caída. */
export const DURACION_ENTRADA_S = 2.8
export const DURACION_ACELERACION_S = 1.8
/** Las laterales caen más despacio que las de arriba: hay que leerlas en movimiento. */
export const FACTOR_VELOCIDAD_LATERAL = 0.8

/** Hasta dónde llega hacia adentro una palabra lateral (fracción del ancho, desde su borde). */
const ALCANCE = 0.4

export function proporcionesLaterales(nivel: number, practica: boolean): { derecha: number; izquierda: number } {
  if (practica) return { derecha: 0, izquierda: 0 }
  return LATERAL[nivel] ?? { derecha: 0, izquierda: 0 }
}

/** ¿Este nivel trae palabras por los costados? (Lo usa la pantalla previa al nivel.) */
export function ladosDelNivel(nivel: number, practica = false): Lado[] {
  const p = proporcionesLaterales(nivel, practica)
  const l: Lado[] = ['arriba']
  if (p.derecha > 0) l.push('derecha')
  if (p.izquierda > 0) l.push('izquierda')
  return l
}

/**
 * Lado de la próxima palabra. `ultimos` guarda cuándo entró la última por cada costado. Si el costado
 * que tocaba entró hace poco, se usa el otro (si este nivel lo tiene y está libre); si no hay ninguno
 * libre, cae desde arriba. `azar` (0 a 1) se pasa para poder probarla sin azar.
 */
export function elegirLado(
  nivel: number, practica: boolean, azar: number, ahora: number,
  ultimos: Partial<Record<Lado, number>>,
): Lado {
  const p = proporcionesLaterales(nivel, practica)
  if (azar >= p.derecha + p.izquierda) return 'arriba'
  const primero: 'derecha' | 'izquierda' = azar < p.derecha ? 'derecha' : 'izquierda'
  const otro: 'derecha' | 'izquierda' = primero === 'derecha' ? 'izquierda' : 'derecha'
  const libre = (l: 'derecha' | 'izquierda'): boolean => {
    const antes = ultimos[l]
    return p[l] > 0 && !(antes !== undefined && ahora - antes < ESPACIO_LATERAL_MS)
  }
  return libre(primero) ? primero : libre(otro) ? otro : 'arriba'
}

export interface EntradaLateral {
  lado: 'derecha' | 'izquierda'
  /** Posición final (`left`, px) de la palabra: a donde llega después de la curva. */
  left: number
  /** Cuánto está corrida al empezar respecto de `left` (px; positivo = a la derecha, afuera). */
  desfase: number
  /** Altura (px desde arriba del área) a la que entra. */
  y0: number
}

/**
 * Dónde y a qué altura entra una palabra lateral. Llega a la mitad del lado por el que entra
 * (no cruza toda la pantalla: sería ilegible) y entra por el borde, ya a media altura.
 */
export function planEntradaLateral(
  lado: 'derecha' | 'izquierda', anchoArea: number, altoArea: number, anchoPalabra: number,
  azarX: number = Math.random(), azarY: number = Math.random(),
): EntradaLateral {
  const margen = 10
  const libre = Math.max(0, anchoArea - anchoPalabra - 2 * margen)
  const alcance = Math.max(0, Math.min(libre, anchoArea * ALCANCE))
  // La palabra termina en la franja del lado por el que entró.
  const left = lado === 'derecha'
    ? margen + libre - azarX * alcance
    : margen + azarX * alcance
  const desfase = lado === 'derecha'
    ? anchoArea - left + 12            // empieza justo afuera, a la derecha
    : -(left + anchoPalabra + 12)      // o justo afuera, a la izquierda
  const y0 = altoArea * (0.08 + azarY * 0.22)
  return { lado, left, desfase, y0 }
}

/** Fracción recorrida de la curva (0 a 1), con freno al final: entra rápido y se acomoda despacio. */
export function avanceDeEntrada(tSeg: number): number {
  const t = Math.min(1, Math.max(0, tSeg / DURACION_ENTRADA_S))
  return 1 - (1 - t) * (1 - t)
}

/** Corrimiento horizontal que todavía le queda a la palabra lateral a los `tSeg` segundos. */
export function desfaseEn(desfase: number, tSeg: number): number {
  return desfase * (1 - avanceDeEntrada(tSeg))
}

/**
 * Cuánto de su velocidad de caída tiene una lateral a los `tSeg`: arranca casi horizontal (poca
 * caída) y va tomando velocidad. Junto con el frenado horizontal dibuja el arco.
 */
export function factorCaidaLateral(tSeg: number): number {
  const t = Math.min(1, Math.max(0, tSeg / DURACION_ACELERACION_S))
  return FACTOR_VELOCIDAD_LATERAL * (0.35 + 0.65 * t)
}
