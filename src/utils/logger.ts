import { DEBUG } from '../debug'
import { duelService } from '../services/DuelService'
import type { DuelEventMap } from '../services/DuelService'

// ── Event log overlay (visible only in ?debug mode) ──────────────────────────

let logEl: HTMLElement | null = null

function getLogEl(): HTMLElement {
  if (!logEl) {
    logEl = document.createElement('div')
    logEl.id = 'debugLog'
    logEl.style.cssText = [
      'position:fixed', 'top:8px', 'right:8px', 'z-index:9999',
      'background:rgba(0,0,0,.82)', 'color:#0ff', 'font:10px/1.4 monospace',
      'padding:8px 10px', 'border-radius:6px', 'max-height:220px',
      'max-width:320px', 'overflow-y:auto', 'pointer-events:none',
    ].join(';')
    document.body.appendChild(logEl)
  }
  return logEl
}

function appendLog(line: string): void {
  const el = getLogEl()
  const row = document.createElement('div')
  row.textContent = line
  el.appendChild(row)
  while (el.children.length > 40) el.firstElementChild?.remove()
  el.scrollTop = el.scrollHeight
}

// ── Core log function ─────────────────────────────────────────────────────────

export function logDuelEvent(event: string, data?: unknown): void {
  const ts = new Date().toISOString().slice(11, 23)
  const payload = data !== undefined
    ? ' ' + JSON.stringify(data).slice(0, 80)
    : ''
  console.log(`[duel ${ts}] ${event}${payload}`)
  if (DEBUG) appendLog(`${ts} ▸ ${event}${payload}`)
}

// ── Error overlay ─────────────────────────────────────────────────────────────

function showErrorToast(msg: string): void {
  const toast = document.createElement('div')
  toast.style.cssText = [
    'position:fixed', 'top:50%', 'left:50%',
    'transform:translate(-50%,-50%)',
    'background:#b00', 'color:#fff', 'padding:14px 20px',
    'border-radius:8px', 'z-index:99999', 'font:13px monospace',
    'max-width:90vw', 'text-align:center', 'box-shadow:0 4px 20px #0008',
  ].join(';')
  toast.textContent = `⚠️ ${msg}`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 8000)
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initLogger(): void {
  // Patch duelService.on to log every registered event
  const _on = duelService.on.bind(duelService)
  ;(duelService as any).on = function <K extends keyof DuelEventMap>(
    event: K,
    handler: DuelEventMap[K],
  ): void {
    const wrapped = ((...args: unknown[]) => {
      logDuelEvent(event as string, args[0])
      return (handler as Function)(...args)
    }) as DuelEventMap[K]
    _on(event, wrapped)
  }

  // Capture unhandled JS errors
  window.addEventListener('error', (e) => {
    const loc = `${e.filename?.split('/').pop() ?? '?'}:${e.lineno}`
    console.error('[ERROR]', e.message, loc)
    if (DEBUG) showErrorToast(`${e.message} @ ${loc}`)
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED REJECTION]', e.reason)
    if (DEBUG) showErrorToast(String(e.reason))
  })
}
