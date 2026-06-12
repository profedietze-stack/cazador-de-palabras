import type { GameState } from '../types'

export const G: GameState = {
  jugador: '',
  cat: null,
  nivel: 1,
  pts: 0,
  obj: 500,
  tiempo: 300,
  tiempoExtra: false,
  cazadas: 0,
  erradas: 0,
  activo: false,
  pausado: false,
  intervaloTiempo: null,
  velocidadBase: 1,
  sonido: true,
  tiempoInicioNivel: null,
  racha: 0,
  comboNivel: 0,
  combosTotalesPartida: 0,
}
