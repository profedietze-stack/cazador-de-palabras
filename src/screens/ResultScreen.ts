import type { GameRecord } from '../types'
import type { LOGROS_DEF } from '../data/achievements'
import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { mostrarSeleccionCategoria, seleccionarNivel } from './CategoryScreen'
import { mostrarPreNivel } from './PreLevelScreen'
import { iniciarJuego, setOnGameEnd } from '../game/GameEngine'
import { calcularTitulo } from '../game/ScoreSystem'
import { cargarDatos, guardarDatos } from '../storage/GameStorage'
import { showAlert } from '../ui/Dialog'
import { postScore } from '../services/LeaderboardService'
import { lsGet } from '../utils/storage'

export function initResultScreen(): void {
  setOnGameEnd(mostrarResultado)

  document.getElementById('btnResMenu')!.addEventListener('click', () => mostrar('menuPrincipal'))

  document.getElementById('btnResReintentar')!.addEventListener('click', () => {
    G.pts = 0; G.tiempo = 180; G.tiempoExtra = false
    G.cazadas = 0; G.erradas = 0
    G.racha = 0; G.comboNivel = 0; G.combosTotalesPartida = 0
    mostrar('gameScreen')
    iniciarJuego()
  })

  document.getElementById('btnResSiguiente')!.addEventListener('click', async () => {
    const cats = Object.keys(CATS)
    if (G.nivel < 3) {
      G.nivel++
    } else {
      const idx = cats.indexOf(G.cat!)
      if (idx < cats.length - 1) {
        G.cat = cats[idx + 1] as typeof G.cat
        G.nivel = 1
      } else {
        await showAlert('🏆 ¡Completaste todas las categorías y niveles! Sos un verdadero Cazador de Palabras.')
        mostrar('menuPrincipal')
        return
      }
    }
    G.obj = G.nivel === 1 ? 250 : G.nivel === 2 ? 350 : 500
    G.velocidadBase = 1 + (G.nivel - 1) * 0.5
    mostrarPreNivel()
  })
}

function animarPuntos(target: number, el: HTMLElement): void {
  const dur = 1400
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur)
    const ease = 1 - Math.pow(1 - t, 3)
    el.textContent = Math.round(ease * target) + ' pts'
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function mostrarResultado(p: GameRecord, logrosNuevos: typeof LOGROS_DEF): void {
  // Post to global leaderboard (best-effort, fire and forget)
  if (G.jugador && p.medalla) {
    const salaCode = lsGet('cdp_sala') ?? undefined
    postScore(p, G.jugador, salaCode)
  }

  mostrar('resultadoScreen')
  const em = { ORO: '🥇', PLATA: '🥈', BRONCE: '🥉' }
  document.getElementById('resMedalla')!.textContent = p.medalla ? em[p.medalla] : '❌'
  const ptsEl = document.getElementById('resPts')!
  ptsEl.textContent = '0 pts'
  setTimeout(() => animarPuntos(p.pts, ptsEl), 400)
  document.getElementById('resTitle')!.textContent = p.medalla ? '¡Nivel Completado!' : 'Tiempo agotado'

  const m = Math.floor(p.tiempoUsado / 60), s = p.tiempoUsado % 60
  document.getElementById('resStats')!.innerHTML = `
    <div class="sg-row"><span>Palabras correctas:</span><strong>${p.cazadas}</strong></div>
    <div class="sg-row"><span>Palabras incorrectas:</span><strong>${p.erradas}</strong></div>
    <div class="sg-row"><span>Precisión:</span><strong>${p.precision}%</strong></div>
    <div class="sg-row"><span>Tiempo:</span><strong>${m}:${s.toString().padStart(2, '0')}</strong></div>
  `

  const lr = document.getElementById('resLogros')!
  if (logrosNuevos.length > 0) {
    lr.style.display = 'block'
    lr.innerHTML = '🏆 <strong>¡Logros desbloqueados!</strong><br>' + logrosNuevos.map(l => `${l.e} ${l.n}`).join('<br>')
  } else {
    lr.style.display = 'none'
  }

  const tr = document.getElementById('resTitulo')!
  const titulo = calcularTitulo()
  const d = cargarDatos()
  if (titulo !== d.tituloAnterior) {
    tr.style.display = 'block'
    tr.textContent = '🎖 Nuevo título: ' + titulo
    d.tituloAnterior = titulo; guardarDatos(d)
  } else {
    tr.style.display = 'none'
  }
}
