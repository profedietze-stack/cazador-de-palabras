// Estado del repaso del jugador actual, en memoria, con persistencia en
// localStorage (por nombre). Separado de repaso.ts para que aquello siga puro.
import { G } from './state'
import { lsGet, lsSet } from '../utils/storage'
import {
  leerRepaso, registrarFallo, registrarAcierto, palabrasPendientes, priorizarRepaso,
  claveStorageRepaso, repasoVacio, type Repaso,
} from './repaso'

let actual: Repaso = repasoVacio()
let jugadorCargado = ''
let sucio = false

export function cargarRepasoJugador(): void {
  if (!G.jugador) { actual = repasoVacio(); jugadorCargado = ''; return }
  actual = leerRepaso(lsGet(claveStorageRepaso(G.jugador)))
  jugadorCargado = G.jugador
  sucio = false
}

/** Se llama también al salir a mitad de partida: en el aula cerrar antes de la meta es lo normal. */
export function guardarRepaso(): void {
  if (!sucio || !jugadorCargado) return
  lsSet(claveStorageRepaso(jugadorCargado), JSON.stringify(actual))
  sucio = false
}

export function repasoActual(): Repaso { return actual }

export function falloEnRepaso(cat: string, palabra: string): void {
  actual = registrarFallo(actual, cat, palabra, new Date().toISOString())
  sucio = true
}

export function aciertoEnRepaso(cat: string, palabra: string): void {
  const antes = actual
  actual = registrarAcierto(actual, cat, palabra, new Date().toISOString())
  if (actual !== antes) sucio = true
}

export function pendientesDe(cat: string): string[] {
  return palabrasPendientes(actual, cat)
}

/** Reordena los distractores de la ola poniendo al frente los que hay que repasar. */
export function priorizarDistractores(cat: string, pool: readonly string[], cantidad: number): string[] {
  return priorizarRepaso(pool, pendientesDe(cat), actual, cat, cantidad)
}
