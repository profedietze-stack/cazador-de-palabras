let _resolve: ((v: boolean) => void) | null = null
let _foco: HTMLElement | null = null

function overlay() { return document.getElementById('dialogOverlay')! }
function msg()     { return document.getElementById('dialogMsg')! }
function btnOk()   { return document.getElementById('dialogOk') as HTMLButtonElement }
function btnCancel(){ return document.getElementById('dialogCancel') as HTMLButtonElement }

function open(text: string, isConfirm: boolean): Promise<boolean> {
  return new Promise(resolve => {
    _resolve = resolve
    // Se recuerda dónde estaba el foco para devolverlo al cerrar.
    _foco = document.activeElement instanceof HTMLElement ? document.activeElement : null
    msg().textContent = text
    btnCancel().style.display = isConfirm ? '' : 'none'
    overlay().classList.add('show')
    btnOk().focus()
  })
}

function close(result: boolean): void {
  overlay().classList.remove('show')
  _foco?.focus?.()
  _foco = null
  _resolve?.(result)
  _resolve = null
}

export function showAlert(text: string): Promise<void> {
  return open(text, false).then(() => {})
}

export function showConfirm(text: string): Promise<boolean> {
  return open(text, true)
}

export function initDialog(): void {
  btnOk().addEventListener('click', () => close(true))
  btnCancel().addEventListener('click', () => close(false))
  overlay().addEventListener('click', (e) => {
    if (e.target === overlay()) close(false)
  })
  document.addEventListener('keydown', (e) => {
    if (!overlay().classList.contains('show')) return
    if (e.key === 'Escape') { e.preventDefault(); close(false); return }
    // Trampa de foco: Tab no sale del diálogo hacia lo que quedó detrás.
    if (e.key === 'Tab') {
      const botones = [btnCancel(), btnOk()].filter(b => b.offsetParent !== null)
      if (botones.length === 0) return
      const primero = botones[0]!, ultimo = botones[botones.length - 1]!
      const activo = document.activeElement
      if (e.shiftKey && activo === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus() }
      else if (!botones.includes(activo as HTMLButtonElement)) { e.preventDefault(); primero.focus() }
    }
  })
}
