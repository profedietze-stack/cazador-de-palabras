import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { iniciarJuego } from '../game/GameEngine'
import { showAlert } from '../ui/Dialog'
import { showModal } from './MenuScreen'
import { lsGet } from '../utils/storage'

export function mostrarPreNivel(): void {
  mostrar('preNivel')
  const cat = CATS[G.cat!]
  // El alumno sabe que su docente ve en qué se equivoca (privacidad: consentimiento informado).
  document.getElementById('avisoDocente')!.style.display = lsGet('cdp_sala') ? 'block' : 'none'
  document.getElementById('preTitle')!.textContent = `${cat.icon} ${cat.nombre} — Nivel ${G.nivel}`
  document.getElementById('preDef')!.innerHTML = `<strong>Definición:</strong> ${cat.def}`
  document.getElementById('preEjs')!.innerHTML =
    `<strong>Ejemplos de ${cat.nombre.toLowerCase()}:</strong><br>` +
    cat.ejem.map(e => `<div class="ejemplo-item">✓ ${e}</div>`).join('')
}

export function initPreLevelScreen(): void {
  const empezar = async (practica: boolean): Promise<void> => {
    if (G.jugador.trim().length < 2) {
      await showAlert('Ingresá tu nombre (mínimo 2 caracteres) antes de jugar.')
      showModal()
      return
    }
    G.practica = practica
    mostrar('gameScreen')
    iniciarJuego()
  }
  document.getElementById('btnEntendido')!.addEventListener('click', () => empezar(false))
  // Práctica: sin reloj, sin objetivo, sin medalla y con la caída lenta. Para
  // quien lee despacio o quiere entender antes de competir.
  document.getElementById('btnPractica')!.addEventListener('click', () => empezar(true))
}
