import type { GameRecord } from '../types'
import type { LOGROS_DEF } from '../data/achievements'
import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { mostrarPreNivel } from './PreLevelScreen'
import { iniciarJuego, setOnGameEnd, setOnPracticaEnd } from '../game/GameEngine'
import { calcularTitulo } from '../game/ScoreSystem'
import { cargarDatos, guardarDatos } from '../storage/GameStorage'
import { showAlert } from '../ui/Dialog'
import { postScore, postErrores } from '../services/LeaderboardService'
import { lsGet } from '../utils/storage'
import { motivoSinMedalla, calcularPrecision } from '../game/reglas'
import { repasoHtml } from '../game/repasoHtml'
import { lanzarConfeti, cantidadConfeti } from '../ui/confeti'

export function initResultScreen(): void {
  setOnGameEnd(mostrarResultado)
  setOnPracticaEnd(mostrarResumenPractica)

  document.getElementById('btnResMenu')!.addEventListener('click', () => mostrar('menuPrincipal'))

  document.getElementById('btnResReintentar')!.addEventListener('click', () => {
    G.pts = 0; G.tiempo = 180; G.tiempoExtra = false
    G.cazadas = 0; G.erradas = 0
    G.racha = 0; G.comboNivel = 0; G.combosTotalesPartida = 0
    // Reintentar conserva el modo: una práctica vuelve a ser práctica.
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

/** «Palabras para repasar»: las que más se tocaron mal en esta partida, con el porqué. */
function pintarRepaso(): void {
  const cont = document.getElementById('resRepaso')!
  const fallos = Object.entries(G.fallosPartida).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (fallos.length === 0 || !G.cat) { cont.style.display = 'none'; cont.innerHTML = ''; return }
  cont.style.display = 'block'
  cont.innerHTML = repasoHtml(fallos.map(([w]) => w), G.cat)
}

function mostrarResumenPractica(): void {
  mostrar('resultadoScreen')
  document.querySelector('.medalla-wrap')!.classList.add('sin-medalla')
  lanzarConfeti(document.getElementById('confeti')!, 0)
  document.getElementById('resMedalla')!.textContent = '🧘'
  document.getElementById('resTitle')!.textContent = 'Práctica terminada'
  document.getElementById('resPts')!.textContent = `${G.cazadas} correctas`
  document.getElementById('resStats')!.innerHTML = `
    <div class="sg-row"><span>Palabras correctas:</span><strong>${G.cazadas}</strong></div>
    <div class="sg-row"><span>Palabras incorrectas:</span><strong>${G.erradas}</strong></div>
    <div class="sg-row"><span>Precisión:</span><strong>${calcularPrecision(G.cazadas, G.erradas)}%</strong></div>
    <p class="sg-aviso">La práctica no da medallas ni sube al ranking: es para entender sin apuro.</p>`
  pintarRepaso()
  document.getElementById('resLogros')!.style.display = 'none'
  document.getElementById('resTitulo')!.style.display = 'none'
  document.getElementById('btnResSiguiente')!.style.display = 'none'
}

function mostrarResultado(p: GameRecord, logrosNuevos: typeof LOGROS_DEF): void {
  document.getElementById('btnResSiguiente')!.style.display = ''
  // Publica el puntaje en el ranking del aula (best-effort, sin bloquear)
  const salaCode = lsGet('cdp_sala') ?? undefined
  if (G.jugador && p.medalla) {
    postScore(p, G.jugador, salaCode)
  }
  // Los errores se publican también sin medalla: esos intentos son los que le
  // dicen al docente quién se atascó y en qué.
  if (G.jugador && salaCode) {
    void postErrores(p, G.fallosPartida, G.jugador, salaCode)
  }

  mostrar('resultadoScreen')
  document.querySelector('.medalla-wrap')!.classList.toggle('sin-medalla', !p.medalla)
  lanzarConfeti(document.getElementById('confeti')!, cantidadConfeti(p.medalla))
  const em = { ORO: '🥇', PLATA: '🥈', BRONCE: '🥉' }
  document.getElementById('resMedalla')!.textContent = p.medalla ? em[p.medalla] : '❌'
  const ptsEl = document.getElementById('resPts')!
  ptsEl.textContent = '0 pts'
  setTimeout(() => animarPuntos(p.pts, ptsEl), 400)
  const sinPrecision = motivoSinMedalla(p.pts, G.obj, p.precision)
  document.getElementById('resTitle')!.textContent =
    p.medalla ? '¡Nivel Completado!' : sinPrecision ? 'Casi: falta precisión' : 'Tiempo agotado'

  const m = Math.floor(p.tiempoUsado / 60), s = p.tiempoUsado % 60
  document.getElementById('resStats')!.innerHTML = `
    <div class="sg-row"><span>Palabras correctas:</span><strong>${p.cazadas}</strong></div>
    <div class="sg-row"><span>Palabras incorrectas:</span><strong>${p.erradas}</strong></div>
    <div class="sg-row"><span>Precisión:</span><strong>${p.precision}%</strong></div>
    <div class="sg-row"><span>Tiempo:</span><strong>${m}:${s.toString().padStart(2, '0')}</strong></div>
    ${sinPrecision ? `<p class="sg-aviso">${sinPrecision}</p>` : ''}
  `

  pintarRepaso()

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
