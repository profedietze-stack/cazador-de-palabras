import { mostrar } from './ScreenManager'
import { getRankingGlobal } from '../storage/GameStorage'
import { fetchGlobalRanking, fetchSalaRanking } from '../services/LeaderboardService'
import { formatFecha } from '../utils'

type TabMode = 'global' | 'local' | 'sala'

let _currentTab: TabMode = 'global'

function renderPodio(scores: { jugador: string; pts: number }[]): void {
  const posEmoji = ['🥇', '🥈', '🥉']
  document.getElementById('podioCont')!.innerHTML = scores.slice(0, 3).map((s, i) => `
    <div class="podio-item">
      <div class="podio-pos">${posEmoji[i] ?? i + 1}</div>
      <div class="podio-nom">${s.jugador}</div>
      <div class="podio-pts">${s.pts} pts</div>
    </div>`).join('')
}

function renderTabla(scores: { jugador: string; pts: number; cat_nombre?: string; catNombre?: string; cat?: string; nivel: number; medalla?: string | null; precision: number; fecha: string }[]): void {
  document.getElementById('rankingBody')!.innerHTML = scores.map((s, i) => {
    const cat = (s as any).cat_nombre || (s as any).catNombre || (s as any).cat || '—'
    const medallaEmoji: Record<string, string> = { ORO: '🥇', PLATA: '🥈', BRONCE: '🥉' }
    const med = s.medalla ? (medallaEmoji[s.medalla] ?? '') : ''
    return `<tr>
      <td>${i + 1}</td><td>${s.jugador}</td>
      <td>${s.pts} ${med}</td>
      <td>${cat}</td><td>${s.nivel}</td><td>${formatFecha(s.fecha)}</td>
    </tr>`
  }).join('')
}

function setLoading(on: boolean): void {
  const body = document.getElementById('rankingBody')!
  if (on) body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted)">⏳ Cargando...</td></tr>'
}

async function loadTab(mode: TabMode): Promise<void> {
  _currentTab = mode
  const tabs = document.querySelectorAll<HTMLButtonElement>('.rk-tab')
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === mode))

  const salaRow = document.getElementById('rkSalaRow')!
  salaRow.style.display = mode === 'sala' ? 'flex' : 'none'

  if (mode === 'local') {
    const scores = getRankingGlobal()
    renderPodio(scores)
    renderTabla(scores)
    return
  }

  setLoading(true)

  if (mode === 'global') {
    const scores = await fetchGlobalRanking()
    renderPodio(scores)
    renderTabla(scores)
  } else if (mode === 'sala') {
    const code = (document.getElementById('rkSalaInput') as HTMLInputElement).value.trim().toUpperCase()
    if (!code) { setLoading(false); return }
    const scores = await fetchSalaRanking(code)
    renderPodio(scores)
    renderTabla(scores)
  }
}

export function mostrarRanking(): void {
  mostrar('rankingScreen')
  loadTab('global')
}

export function initRankingScreen(): void {
  document.getElementById('backFromRanking')!.addEventListener('click', () => mostrar('menuPrincipal'))

  document.querySelectorAll<HTMLButtonElement>('.rk-tab').forEach(btn => {
    btn.addEventListener('click', () => loadTab(btn.dataset.tab as TabMode))
  })

  document.getElementById('rkSalaBtn')!.addEventListener('click', () => loadTab('sala'))
}
