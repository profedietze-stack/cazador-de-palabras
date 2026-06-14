import { mostrar } from './ScreenManager'

export function mostrarDuelMenu(): void {
  mostrar('duelMenuScreen')
}

export function initDuelMenuScreen(): void {
  document.getElementById('backFromDuelMenu')!.addEventListener('click', () => mostrar('menuPrincipal'))
}
