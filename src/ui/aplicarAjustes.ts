import { ajustes, alCambiarAjustes, cargarAjustes, oscuroEfectivo, MULTIPLICADOR_TAMANO, type Ajustes } from '../storage/ajustes'

// Lleva los ajustes al documento: tema, contraste, movimiento, fondo y tamaño de
// palabra se expresan como atributos de <html>, y el CSS hace el resto.

function sistemaOscuro(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export type Cielo = 'noche' | 'dia'

/** El cielo de los mundos: noche con el tema oscuro, día con el claro (y «auto» según el sistema). */
export function cieloActual(): Cielo {
  return document.documentElement.dataset['cielo'] === 'dia' ? 'dia' : 'noche'
}

export function aplicarAjustes(a: Readonly<Ajustes> = ajustes()): void {
  const h = document.documentElement
  const oscuro = oscuroEfectivo(a, sistemaOscuro())
  if (oscuro) h.dataset['theme'] = 'dark'
  else delete h.dataset['theme']
  h.dataset['cielo'] = oscuro ? 'noche' : 'dia'
  h.dataset['contraste'] = a.altoContraste ? 'alto' : 'normal'
  h.dataset['movimiento'] = a.reducirMovimiento ? 'reducido' : 'normal'
  h.dataset['fondo'] = a.fondoDecorativo ? 'si' : 'no'
  h.dataset['tamano'] = a.tamanoPalabras
  h.style.setProperty('--tam-palabras', String(MULTIPLICADOR_TAMANO[a.tamanoPalabras]))
}

/** Carga lo guardado, lo aplica y sigue los cambios (incluido el tema del sistema en «auto»). */
export function iniciarAjustes(): void {
  cargarAjustes()
  aplicarAjustes()
  alCambiarAjustes(a => aplicarAjustes(a))
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicarAjustes())
  }
}
