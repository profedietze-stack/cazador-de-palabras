let _resolve: ((v: boolean) => void) | null = null

function overlay() { return document.getElementById('dialogOverlay')! }
function msg()     { return document.getElementById('dialogMsg')! }
function btnOk()   { return document.getElementById('dialogOk') as HTMLButtonElement }
function btnCancel(){ return document.getElementById('dialogCancel') as HTMLButtonElement }

function open(text: string, isConfirm: boolean): Promise<boolean> {
  return new Promise(resolve => {
    _resolve = resolve
    msg().textContent = text
    btnCancel().style.display = isConfirm ? '' : 'none'
    overlay().classList.add('show')
    btnOk().focus()
  })
}

function close(result: boolean): void {
  overlay().classList.remove('show')
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
    if (e.key === 'Escape') { e.preventDefault(); close(false) }
  })
}
