import type { CategoryKey } from '../types'
import { escapeHtml } from '../utils'
import { explicarError } from './porQue'

/**
 * «Palabras para repasar» de la pantalla final: un <details> plegado (se abre al tocarlo) para
 * que la pantalla no se haga larguísima. Cada palabra lleva su «¿Por qué?»; todo se escapa.
 */
export function repasoHtml(palabras: readonly string[], cat: CategoryKey): string {
  return `<details class="repaso"><summary>📝 Palabras para repasar (${palabras.length})</summary>` +
    '<ul class="rep-lista">' +
    palabras.map(w => `<li>${escapeHtml(explicarError(w, cat))}</li>`).join('') +
    '</ul><small>Van a volver en tus próximas partidas de esta categoría hasta que las dejes pasar bien.</small></details>'
}
