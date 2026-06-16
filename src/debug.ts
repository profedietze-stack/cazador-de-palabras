import { G } from './game/state'
import { D } from './game/duelState'
import { duelService } from './services/DuelService'

export const DEBUG = new URLSearchParams(location.search).has('debug')
export const BOT_MODE = new URLSearchParams(location.search).has('bot')

export function initDebugMode(): void {
  if (!DEBUG) return

  // Expose state for console inspection
  ;(window as any).G = G
  ;(window as any).D = D
  ;(window as any).duelService = duelService

  // Auto-set player name so the name modal can be skipped
  if (!localStorage.getItem('cdp_nombre')) {
    localStorage.setItem('cdp_nombre', 'DebugPlayer')
  }

  // Floating state panel (bottom-left)
  const panel = document.createElement('div')
  panel.id = 'debugPanel'
  panel.style.cssText = [
    'position:fixed', 'bottom:8px', 'left:8px', 'z-index:9999',
    'background:rgba(0,0,0,.85)', 'color:#0f0', 'font:11px/1.5 monospace',
    'padding:8px 10px', 'border-radius:6px', 'min-width:190px',
    'pointer-events:none', 'white-space:pre',
  ].join(';')
  document.body.appendChild(panel)

  setInterval(() => {
    panel.textContent = [
      `[DEBUG${BOT_MODE ? '+BOT' : ''}]`,
      `G.activo:  ${G.activo}`,
      `G.jugador: ${G.jugador || '–'}`,
      `G.pts:     ${G.pts}   racha: ${G.racha}`,
      `────────────────────`,
      `D.phase:   ${D.phase}`,
      `D.mySlot:  ${D.mySlot ?? '–'}`,
      `D.code:    ${D.roomCode || '–'}`,
      `D.scores:  A=${D.scores.A} B=${D.scores.B}`,
      `socket:    ${duelService.connected ? '🟢' : '🔴'}`,
    ].join('\n')
  }, 300)

  // Speed-up helper exposed for GameEngine (opt-in)
  ;(window as any).__DEBUG_SPEED_MULT = 5

  console.info(
    '%c[CDP DEBUG] active — window.G, window.D, window.duelService',
    'color:#0f0;font-weight:bold',
  )
  if (BOT_MODE) console.info('[CDP DEBUG] ?bot active — bot will auto-join after sala creation')
}
