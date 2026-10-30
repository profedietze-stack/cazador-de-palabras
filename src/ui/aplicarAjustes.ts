import { ajustes, alCambiarAjustes, cargarAjustes, oscuroEfectivo, MULTIPLICADOR_TAMANO, type Ajustes } from '../storage/ajustes'

// Lleva los ajustes al documento: tema, contraste, movimiento, fondo y tamaño de
// palabra se expresan como atributos de <html>, y el CSS hace el resto.

function sistemaOscuro(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function aplicarAjustes(a: Readonly<Ajustes> = ajustes()): void {
  const h = document.documentElement
  if (oscuroEfectivo(a, sistemaOscuro())) h.dataset['theme'] = 'dark'
  else delete h.dataset['theme']
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
