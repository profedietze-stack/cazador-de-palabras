import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { iniciarJuego } from '../game/GameEngine'
import { showAlert } from '../ui/Dialog'
import { showModal } from './MenuScreen'

export function mostrarPreNivel(): void {
  mostrar('preNivel')
  const cat = CATS[G.cat!]
  document.getElementById('preTitle')!.textContent = `${cat.icon} ${cat.nombre} — Nivel ${G.nivel}`
  document.getElementById('preDef')!.innerHTML = `<strong>Definición:</strong> ${cat.def}`
  document.getElementById('preEjs')!.innerHTML =
    `<strong>Ejemplos de ${cat.nombre.toLowerCase()}:</strong><br>` +
    cat.ejem.map(e => `<div class="ejemplo-item">✓ ${e}</div>`).join('')
}

export function initPreLevelScreen(): void {
  document.getElementById('btnEntendido')!.addEventListener('click', async () => {
    if (G.jugador.trim().length < 2) {
      await showAlert('Ingresá tu nombre (mínimo 2 caracteres) antes de jugar.')
      showModal()
      return
    }
    mostrar('gameScreen')
    iniciarJuego()
  })
}
