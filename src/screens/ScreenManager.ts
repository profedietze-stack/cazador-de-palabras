import { iniciarDecoMenu, detenerDecoMenu } from '../ui/DecoBackground'
import { iniciarMusica, detenerMusica } from '../audio/AudioEngine'

export type ScreenId =
  | 'menuPrincipal' | 'seleccionCategoria' | 'preNivel'
  | 'gameScreen' | 'resultadoScreen' | 'medallasScreen'
  | 'rankingScreen' | 'infoScreen' | 'salaScreen'
  | 'duelMenuScreen' | 'duelLobbyScreen' | 'duelGameScreen' | 'duelResultScreen'

let _pending: ScreenId | null = null
let _screens: NodeListOf<Element> | null = null

function getScreens(): NodeListOf<Element> {
  if (!_screens) _screens = document.querySelectorAll('.screen')
  return _screens
}

function activate(id: ScreenId): void {
  _pending = null
  getScreens().forEach(s => s.classList.remove('active', 'exiting'))
  document.getElementById(id)!.classList.add('active')

  if (id === 'menuPrincipal') {
    setTimeout(iniciarDecoMenu, 80)
    setTimeout(() => iniciarMusica('menu'), 120)
  } else if (id === 'seleccionCategoria' || id === 'preNivel') {
    detenerDecoMenu()
    setTimeout(() => iniciarMusica('menu'), 80)
  } else if (id === 'gameScreen') {
    detenerDecoMenu()
    iniciarMusica('juego')
  } else {
    detenerDecoMenu()
    detenerMusica()
  }
}

export function mostrar(id: ScreenId): void {
  if (_pending === id) return
  const current = document.querySelector('.screen.active:not(.exiting)') as HTMLElement | null

  if (current && current.id !== id) {
    _pending = id
    current.classList.add('exiting')
    setTimeout(() => activate(id), 260)
  } else {
    activate(id)
  }
}
