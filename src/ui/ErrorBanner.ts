let bannerEl: HTMLDivElement | null = null

function getBanner(): HTMLDivElement {
  if (!bannerEl) {
    bannerEl = document.createElement('div')
    bannerEl.id = 'errorBanner'
    bannerEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#b91c1c', 'color:#fff', 'font:13px/1.4 monospace',
      'padding:10px 40px 10px 12px', 'white-space:pre-wrap', 'word-break:break-all',
      'box-shadow:0 2px 8px #0006', 'cursor:pointer', 'display:none'
    ].join(';')

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = [
      'position:absolute', 'top:6px', 'right:8px',
      'background:none', 'border:none', 'color:#fff',
      'font-size:16px', 'cursor:pointer', 'line-height:1'
    ].join(';')
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      hide()
    })

    bannerEl.addEventListener('click', () => {
      navigator.clipboard?.writeText(bannerEl!.dataset.full ?? '').catch(() => {})
    })

    bannerEl.appendChild(closeBtn)
    document.body.appendChild(bannerEl)
  }
  return bannerEl
}

function show(msg: string, full: string): void {
  const el = getBanner()
  el.dataset.full = full
  el.childNodes[0]!.textContent = msg
  el.style.display = 'block'
}

function hide(): void {
  if (bannerEl) bannerEl.style.display = 'none'
}

function format(err: unknown, source?: string, lineno?: number): { short: string; full: string } {
  let stack = ''
  let message = String(err)
  if (err instanceof Error) {
    message = err.message
    stack = err.stack ?? ''
  }
  const loc = source ? ` @ ${source.split('/').pop()}:${lineno}` : ''
  const short = `[Error]${loc}\n${message}`
  const full = stack || short
  return { short, full }
}

export function initErrorBanner(): void {
  window.addEventListener('error', (e) => {
    const { short, full } = format(e.error ?? e.message, e.filename, e.lineno)
    show(short + '\n\n(tap to copy full stack)', full)
  })

  window.addEventListener('unhandledrejection', (e) => {
    const { short, full } = format(e.reason)
    show('[Unhandled Promise]\n' + short + '\n\n(tap to copy full stack)', full)
  })
}
