import { mostrar } from './ScreenManager'
import { fetchErroresSala } from '../services/LeaderboardService'
import { resumirSala } from '../game/panelDocente'
import { textoVisible } from '../game/distractores'
import { CATS } from '../data/categories'
import { escapeHtml } from '../utils'

// Panel del docente (DID-13): qué le cuesta a la clase. Todo lo que se dibuja
// lo escribió un alumno (nombre, palabras): va escapado, nunca crudo.

const nombreCat = (k: string): string => (CATS as Record<string, { nombre: string }>)[k]?.nombre ?? k

export async function mostrarResultadosSala(code: string, nombre: string): Promise<void> {
  mostrar('resultadosSalaScreen')
  const sub = document.getElementById('rsSub')!
  const cont = document.getElementById('rsContenido')!
  sub.textContent = `Sala ${code} — ${nombre}`
  cont.innerHTML = '<p class="sala-hint">⏳ Cargando...</p>'

  const registros = await fetchErroresSala(code)
  if (registros === null) {
    cont.innerHTML = '<p class="sala-hint">No se pudieron cargar los resultados. Revisá la conexión y que estés usando el dispositivo donde creaste la sala.</p>'
    return
  }
  if (registros.length === 0) {
    cont.innerHTML = '<p class="sala-hint">Todavía no hay intentos en esta sala. Cuando tus alumnos jueguen con el código de la sala, vas a ver acá en qué se equivocan.</p>'
    return
  }

  const p = resumirSala(registros)
  const filaCat = p.porCategoria.map(c => `
    <div class="rs-barra"><span class="rs-etq">${escapeHtml(nombreCat(c.cat))}</span>
      <span class="rs-pista"><span class="rs-relleno" style="width:${Math.max(2, Math.min(100, c.precision))}%"></span></span>
      <strong>${escapeHtml(c.precision)}%</strong> <small>(${escapeHtml(c.intentos)} intentos)</small></div>`).join('')
  const filaPal = p.palabras.map(w => `
    <tr><td><strong>${escapeHtml(textoVisible(w.palabra))}</strong></td><td>${escapeHtml(nombreCat(w.cat))}</td>
    <td>${escapeHtml(w.veces)}</td><td>${escapeHtml(w.alumnos)}</td></tr>`).join('')
  const filaAl = p.alumnos.map(a => `
    <tr${a.necesitaAyuda ? ' class="rs-ayuda"' : ''}>
      <td>${escapeHtml(a.jugador)}${a.necesitaAyuda ? ' <span title="Menos de 60 % de precisión en al menos 2 intentos">⚠️ necesita ayuda</span>' : ''}</td>
      <td>${escapeHtml(a.intentos)}</td><td>${escapeHtml(a.precision)}%</td>
      <td>${a.palabras.map(w => escapeHtml(textoVisible(w))).join(', ') || '—'}</td></tr>`).join('')

  cont.innerHTML = `
    <h3>Precisión por categoría</h3>${filaCat}
    <h3 style="margin-top:1rem">Palabras que más les cuestan</h3>
    <div style="overflow-x:auto"><table class="ranking-tbl"><thead><tr><th>Palabra</th><th>Categoría</th><th>Errores</th><th>Alumnos</th></tr></thead><tbody>${filaPal || '<tr><td colspan="4">Sin errores registrados.</td></tr>'}</tbody></table></div>
    <h3 style="margin-top:1rem">Por alumno</h3>
    <div style="overflow-x:auto"><table class="ranking-tbl"><thead><tr><th>Alumno</th><th>Intentos</th><th>Precisión</th><th>Les cuestan</th></tr></thead><tbody>${filaAl}</tbody></table></div>
    <p class="sala-hint" style="margin-top:.8rem">Incluye los intentos sin medalla. «Limpiar scores» en Mi Sala también borra estos datos.</p>`
}

export function initResultadosSalaScreen(): void {
  document.getElementById('backFromResultadosSala')!.addEventListener('click', () => mostrar('salaScreen'))
}
