import { G } from '../game/state'
import { mostrarSeleccionCategoria } from './CategoryScreen'
import { detenerJuego, terminarPractica } from '../game/GameEngine'
import { enfocarPalabra } from '../game/WordSpawner'
import { iniciarMusica, detenerMusica } from '../audio/AudioEngine'
import { showConfirm } from '../ui/Dialog'

export function initGameScreen(): void {
  // Teclado dentro de la partida: flechas para recorrer las palabras que caen
  // (la más baja primero), Enter o espacio para cazar la enfocada, P para pausar.
  document.addEventListener('keydown', e => {
    if (!G.activo) return
    if (!document.getElementById('gameScreen')?.classList.contains('active')) return
    if (document.getElementById('dialogOverlay')?.classList.contains('show')) return
    const actual = document.activeElement instanceof HTMLElement && document.activeElement.classList.contains('palabra')
      ? document.activeElement : null
    if (G.pausado) { if (e.key === 'p' || e.key === 'P') document.getElementById('btnPausa')?.click(); return }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); enfocarPalabra(1, actual) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); enfocarPalabra(-1, actual) }
    else if ((e.key === 'p' || e.key === 'P') && !actual) { document.getElementById('btnPausa')?.click() }
  })

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
