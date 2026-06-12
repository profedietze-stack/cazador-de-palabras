import { mostrar } from './ScreenManager'

export function initInfoScreen(): void {
  document.getElementById('backFromInfo')!.addEventListener('click', () => mostrar('menuPrincipal'))

  const tabs = document.querySelectorAll<HTMLButtonElement>('.info-tab')
  const panels = document.querySelectorAll<HTMLElement>('.info-panel')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab!
      tabs.forEach(t => {
        const isActive = t.dataset.tab === target
        t.classList.toggle('active', isActive)
        t.setAttribute('aria-selected', String(isActive))
      })
      panels.forEach(p => p.classList.toggle('active', p.id === `info-${target}`))
    })
  })
}
