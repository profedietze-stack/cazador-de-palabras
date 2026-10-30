import { initErrorBanner } from './ui/ErrorBanner'
import { initDebugMode } from './debug'
import { initLogger } from './utils/logger'
import './styles/fuentes.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/screens.css'
import './styles/responsive.css'
import './styles/a11y.css'
import './styles/ajustes.css'
import './styles/componentes.css'
import './styles/paisaje.css'

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
import { sonidoBtn, refrescarMusica } from './audio/AudioEngine'
import { initDialog } from './ui/Dialog'
import { initInfoScreen } from './screens/InfoScreen'
import { initSalaScreen } from './screens/SalaScreen'
import { initResultadosSalaScreen } from './screens/ResultadosSalaScreen'
import { initDuelMenuScreen } from './screens/DuelMenuScreen'
import { initDuelLobbyScreen } from './screens/DuelLobbyScreen'
import { initDuelGameScreen } from './screens/DuelGameScreen'
import { initDuelResultScreen } from './screens/DuelResultScreen'
import { lsGet, lsRemove } from './utils/storage'
import { iniciarAjustes } from './ui/aplicarAjustes'
import { iniciarHidratacion } from './ui/emoji'
import { iniciarPausaPorVisibilidad } from './ui/paisaje'
import { iniciarFondoReactivo } from './ui/fondoMundo'
import { alCambiarAjustes } from './storage/ajustes'
import { initAjustesScreen } from './screens/AjustesScreen'

// Error banner must be absolute first
initErrorBanner()

// Debug + logging (must be first)
initDebugMode()
initLogger()

// Ajustes del dispositivo (tema, contraste, tamaño…): antes que las pantallas, para que
// ya nazcan con el aspecto elegido.
iniciarAjustes()
iniciarPausaPorVisibilidad()
iniciarFondoReactivo()
alCambiarAjustes(() => refrescarMusica())

// Los emojis del juego pasan a imágenes propias: ahora (HTML estático) y a medida que se agregan.
// Antes de las pantallas, para que ninguna se pinte con el emoji del sistema.
iniciarHidratacion()

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
initResultadosSalaScreen()
initDuelMenuScreen()
initDuelLobbyScreen()
initDuelGameScreen()
initDuelResultScreen()
initAjustesScreen()

// Global sound on button click
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('button, .nv-btn, .btn')
  if (el && !el.classList.contains('palabra')) sonidoBtn()
}, true)

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

// Ya no se guarda ningún identificador de dispositivo (antes: un UUID y su SHA-256,
// que viajaban al servidor con cada puntaje). Se borra el que haya quedado de
// versiones anteriores.
lsRemove('cdp_device_id')
lsRemove('cdp_device_hash')

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
}

// Restore state from localStorage
;(function init() {
  const nombreGuardado = lsGet('cdp_nombre')
  if (nombreGuardado && nombreGuardado.length >= 2) {
    G.jugador = nombreGuardado
  }
  mostrar('menuPrincipal')
  iniciarDecoMenu()
})()
