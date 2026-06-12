import { G } from '../game/state'
import { CATS } from '../data/categories'
import { LOGROS_DEF } from '../data/achievements'
import { mostrar } from './ScreenManager'
import { getPartidas, getLogros, getTotalCombosJugador } from '../storage/GameStorage'
import { calcularTitulo } from '../game/ScoreSystem'
import { iniciarStickersLogros, limpiarStickersLogros } from '../ui/StickerSystem'
import { showAlert } from '../ui/Dialog'
import { formatFecha } from '../utils'

export function mostrarLogros(): void {
  mostrar('medallasScreen')
  limpiarStickersLogros()

  const partidas = getPartidas()
  const logros = getLogros()

  document.getElementById('perfilNombre')!.textContent = G.jugador
  document.getElementById('perfilTitulo')!.textContent = calcularTitulo()

  const total = partidas.length
  const mejorPts = partidas.length ? Math.max(...partidas.map(p => p.pts)) : 0
  const precProm = partidas.length ? Math.round(partidas.reduce((s, p) => s + p.precision, 0) / partidas.length) : 0
  const totalCaz = partidas.reduce((s, p) => s + p.cazadas, 0)
  const totalSegs = partidas.reduce((s, p) => s + (p.tiempoUsado || 0), 0)
  const ttH = Math.floor(totalSegs / 3600)
  const ttM = Math.floor((totalSegs % 3600) / 60)
  const ttS = totalSegs % 60
  const tiempoTotal = ttH > 0 ? `${ttH}h ${ttM}m` : ttM > 0 ? `${ttM}m ${ttS}s` : `${ttS}s`

  document.getElementById('statsRow')!.innerHTML = `
    <div class="scard"><div class="sl">Partidas</div><div class="sv">${total}</div></div>
    <div class="scard"><div class="sl">Mejor Puntaje</div><div class="sv">${mejorPts}</div></div>
    <div class="scard"><div class="sl">Precisión Prom.</div><div class="sv">${precProm}%</div></div>
    <div class="scard"><div class="sl">Palabras Cazadas</div><div class="sv">${totalCaz}</div></div>
    <div class="scard" style="border:2px solid #667eea"><div class="sl">⏱ Tiempo de Juego</div><div class="sv" style="color:#764ba2">${tiempoTotal}</div></div>
  `

  const em = { ORO: '🥇', PLATA: '🥈', BRONCE: '🥉' }
  document.getElementById('medallasBody')!.innerHTML = Object.entries(CATS).map(([key, cat]) => {
    const ps = partidas.filter(p => p.cat === key)
    const celdas = [1, 2, 3].map(nv => {
      const p = ps.filter(x => x.nivel === nv && x.medalla).sort((a, b) => {
        const o: Record<string, number> = { ORO: 3, PLATA: 2, BRONCE: 1 }
        return (o[b.medalla!] || 0) - (o[a.medalla!] || 0)
      })[0]
      return `<td>${p ? em[p.medalla!] + '<br><small>' + p.pts + 'pts</small>' : '—'}</td>`
    }).join('')
    return `<tr><td>${cat.icon} ${cat.nombre}</td>${celdas}</tr>`
  }).join('')

  const logroIds = new Set(logros.map(l => l.id))
  document.getElementById('logrosGrid')!.innerHTML = LOGROS_DEF.map(l => `
    <div class="logro-card ${logroIds.has(l.id) ? 'ok' : ''}">
      <div class="le">${l.e}</div>
      <div class="ln">${l.n}</div>
      <div class="ld">${logroIds.has(l.id) ? '✅ Desbloqueado' : l.d}</div>
    </div>`).join('')

  const top10 = partidas.slice().sort((a, b) => b.pts - a.pts).slice(0, 10)
  document.getElementById('misPartidasBody')!.innerHTML = top10.map((p, i) => `
    <tr>
      <td>${i + 1}</td><td>${p.catNombre}</td><td>${p.nivel}</td>
      <td>${p.pts}</td><td>${p.precision}%</td><td>${formatFecha(p.fecha)}</td>
    </tr>`).join('')

  const totalCombos = getTotalCombosJugador()
  setTimeout(() => iniciarStickersLogros(totalCombos), 400)
}

export function initAchievementsScreen(): void {
  document.getElementById('backFromLogros')!.addEventListener('click', () => {
    limpiarStickersLogros()
    mostrar('menuPrincipal')
  })

  document.getElementById('btnCaptura')!.addEventListener('click', () => {
    showAlert('Para capturar tu progreso:\n\n📱 Móvil: Presioná el botón de captura de pantalla de tu dispositivo.\n💻 PC: Presioná la tecla "Impr Pant" o usá la herramienta de recorte de Windows/Mac.\n\nLa pantalla actual con tus medallas y logros quedará guardada.')
  })
}
