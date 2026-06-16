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
  const el = document.getElementById('gameScreen')!
  const isFs = document.fullscreenElement || (document as any).webkitFullscreenElement
  if (!isFs) {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
  } else {
    if (document.exitFullscreen) document.exitFullscreen()
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
  }
}
