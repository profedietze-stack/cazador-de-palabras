import { G } from '../game/state'
import { mostrar } from './ScreenManager'
import { mostrarSeleccionCategoria } from './CategoryScreen'
import { detenerJuego } from '../game/GameEngine'
import { iniciarMusica, detenerMusica } from '../audio/AudioEngine'
import { resetCombo } from '../game/ComboSystem'
import { showConfirm } from '../ui/Dialog'

export function initGameScreen(): void {
  document.getElementById('btnVolver')!.addEventListener('click', async () => {
    const ok = await showConfirm('¿Salir del nivel? El progreso actual no se guardará.')
    if (!ok) return
    detenerJuego()
    mostrarSeleccionCategoria()
  })

  document.getElementById('btnPausa')!.addEventListener('click', function (this: HTMLButtonElement) {
    G.pausado = !G.pausado
    this.textContent = G.pausado ? '▶ Continuar' : '⏸ Pausa'
    if (G.pausado) { detenerMusica() } else { iniciarMusica('juego') }
  })

  const btnFs = document.getElementById('btnFs')!
  if (!document.fullscreenEnabled && !(document as any).webkitFullscreenEnabled) {
    btnFs.style.display = 'none'
  } else {
    btnFs.addEventListener('click', toggleFS)
  }
}

function toggleFS(): void {
  if (!document.fullscreenElement) {
    document.getElementById('gameScreen')!.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen()
  }
}
