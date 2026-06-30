import { initErrorBanner } from './ui/ErrorBanner'
import { initDebugMode } from './debug'
import { initLogger } from './utils/logger'
import './styles/base.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/screens.css'
import './styles/responsive.css'

import { G } from './game/state'
import { mostrar } from './screens/ScreenManager'
import { initMenuScreen } from './screens/MenuScreen'
import { initCategoryScreen } from './screens/CategoryScreen'
import { initPreLevelScreen } from './screens/PreLevelScreen'
import { initGameScreen } from './screens/GameScreen'
import { initResultScreen } from './screens/ResultScreen'
import { initAchievementsScreen } from './screens/AchievementsScreen'
import { initRankingScreen } from './screens/RankingScreen'
import { iniciarDecoMenu } from './ui/DecoBackground'
import { sonidoBtn } from './audio/AudioEngine'
import { initDialog } from './ui/Dialog'
import { initInfoScreen } from './screens/InfoScreen'
import { initSalaScreen } from './screens/SalaScreen'
import { initDuelMenuScreen } from './screens/DuelMenuScreen'
import { initDuelLobbyScreen } from './screens/DuelLobbyScreen'
import { initDuelGameScreen } from './screens/DuelGameScreen'
import { initDuelResultScreen } from './screens/DuelResultScreen'
import { lsGet, lsSet } from './utils/storage'

// Error banner must be absolute first
initErrorBanner()

// Debug + logging (must be first)
initDebugMode()
initLogger()

// Init all screens
initDialog()
initInfoScreen()
initMenuScreen()
initCategoryScreen()
initPreLevelScreen()
initGameScreen()
initResultScreen()
initAchievementsScreen()
initRankingScreen()
initSalaScreen()
initDuelMenuScreen()
initDuelLobbyScreen()
initDuelGameScreen()
initDuelResultScreen()

// Global sound on button click
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('button, .nv-btn, .btn')
  if (el && !el.classList.contains('palabra')) sonidoBtn()
}, true)

// Dark mode toggle
;(function initTheme() {
  const saved = lsGet('cdp_tema')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.dataset.theme = 'dark'
  }
  document.getElementById('themeBtn')!.textContent =
    document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'
})()

document.getElementById('themeBtn')!.addEventListener('click', function (this: HTMLButtonElement) {
  const isDark = document.documentElement.dataset.theme === 'dark'
  document.documentElement.dataset.theme = isDark ? '' : 'dark'
  this.textContent = isDark ? '🌙' : '☀️'
  lsSet('cdp_tema', isDark ? 'light' : 'dark')
})

// Volume button
document.getElementById('volBtn')!.addEventListener('click', function (this: HTMLButtonElement) {
  G.sonido = !G.sonido
  this.textContent = G.sonido ? '🔊' : '🔇'
  this.classList.toggle('off', !G.sonido)
  lsSet('cdp_sonido', G.sonido ? '1' : '0')
  const screen = document.querySelector('.screen.active')
  if (G.sonido && screen) {
    const id = screen.id
    if (id === 'menuPrincipal' || id === 'seleccionCategoria' || id === 'preNivel') {
      import('./audio/AudioEngine').then(m => m.iniciarMusica('menu'))
    } else if (id === 'gameScreen' && G.activo && !G.pausado) {
      import('./audio/AudioEngine').then(m => m.iniciarMusica('juego'))
    }
  } else {
    import('./audio/AudioEngine').then(m => m.detenerMusica())
  }
})


// Pause timer when tab is hidden (iOS background behavior)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.activo && !G.pausado) {
    G.pausado = true
    ;(G as any)._autoPaused = true
  } else if (!document.hidden && (G as any)._autoPaused) {
    G.pausado = false
    ;(G as any)._autoPaused = false
  }
})

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// Restore state from localStorage
;(function init() {
  const son = lsGet('cdp_sonido')
  if (son === '0') {
    G.sonido = false
    const btn = document.getElementById('volBtn') as HTMLButtonElement
    btn.textContent = '🔇'
    btn.classList.add('off')
  }
  const nombreGuardado = lsGet('cdp_nombre')
  if (nombreGuardado && nombreGuardado.length >= 2) {
    G.jugador = nombreGuardado
  }
  mostrar('menuPrincipal')
  iniciarDecoMenu()
})()
