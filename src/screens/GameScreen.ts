import { G } from '../game/state'
import { mostrar } from './ScreenManager'
import { mostrarSeleccionCategoria } from './CategoryScreen'
import { detenerJuego, terminarPractica } from '../game/GameEngine'
import { iniciarMusica, detenerMusica } from '../audio/AudioEngine'
import { resetCombo } from '../game/ComboSystem'
import { showConfirm } from '../ui/Dialog'

export function initGameScreen(): void {
  document.getElementById('btnVolver')!.addEventListener('click', async () => {
    // Terminar una práctica no pierde nada: se llega al resumen de repaso.
    if (G.practica) { terminarPractica(); return }
    // El reloj no corre mientras el alumno decide si sale.
    const yaPausado = G.pausado
    G.pausado = true
    const ok = await showConfirm('¿Salir del nivel? El progreso actual no se guardará.')
    if (!ok) { G.pausado = yaPausado; return }
    G.pausado = yaPausado
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
  // Sobre el documento entero (ver iniciarJuego): así los diálogos se ven.
  const el = document.documentElement
  const isFs = document.fullscreenElement || (document as any).webkitFullscreenElement
  if (!isFs) {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
  } else {
    if (document.exitFullscreen) document.exitFullscreen()
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
  }
}
