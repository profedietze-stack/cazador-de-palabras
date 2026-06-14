import { G } from '../game/state'
import { mostrar } from './ScreenManager'
import { mostrarSeleccionCategoria } from './CategoryScreen'
import { mostrarLogros } from './AchievementsScreen'
import { mostrarRanking } from './RankingScreen'
import { mostrarSala, getSalaActual } from './SalaScreen'
import { limpiarStickersMenu } from '../ui/StickerSystem'
import { showAlert, showConfirm } from '../ui/Dialog'

export function showModal(): void {
  document.getElementById('modalNombre')!.classList.add('show')
}

export function hideModal(): void {
  document.getElementById('modalNombre')!.classList.remove('show')
}

export function initMenuScreen(): void {
  document.getElementById('btnContinuar')!.addEventListener('click', async () => {
    const v = (document.getElementById('inputNombre') as HTMLInputElement).value.trim()
    if (v.length < 2) {
      await showAlert('Por favor ingresá un nombre de al menos 2 caracteres.')
      return
    }
    G.jugador = v
    localStorage.setItem('cdp_nombre', v)
    hideModal()
    mostrarSeleccionCategoria()
  })

  document.getElementById('inputNombre')!.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') (document.getElementById('btnContinuar') as HTMLButtonElement).click()
  })

  document.getElementById('btnIniciar')!.addEventListener('click', () => {
    if (G.jugador) { mostrarSeleccionCategoria() } else { showModal() }
  })

  document.getElementById('btnRanking')!.addEventListener('click', mostrarRanking)

  document.getElementById('btnLogros')!.addEventListener('click', () => {
    if (!G.jugador) { showModal(); return }
    mostrarLogros()
  })

  const btnSala = document.getElementById('btnSala')!
  function refreshSalaBtn(): void {
    const sala = getSalaActual()
    btnSala.innerHTML = sala
      ? `🏫 Mi Sala <span class="sala-dot"></span>`
      : '🏫 Mi Sala'
  }
  refreshSalaBtn()
  btnSala.addEventListener('click', () => { mostrarSala(); })
  // Refresh dot when returning from sala screen
  document.getElementById('backFromSala')?.addEventListener('click', refreshSalaBtn)
  document.getElementById('btnDuelo')!.addEventListener('click', () => mostrar('duelMenuScreen'))
  document.getElementById('btnInfo')!.addEventListener('click', () => mostrar('infoScreen'))

  document.getElementById('btnBorrar')!.addEventListener('click', async () => {
    const ok = await showConfirm('¿Borrar todo el progreso?\n\nSe eliminarán puntuaciones, medallas, logros y stickers.\nEsta acción no se puede deshacer.')
    if (!ok) return
    const son = localStorage.getItem('cdp_sonido')
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cdp_'))
    keys.forEach(k => localStorage.removeItem(k))
    if (son) localStorage.setItem('cdp_sonido', son)
    G.jugador = ''
    G.racha = 0; G.comboNivel = 0; G.combosTotalesPartida = 0
    limpiarStickersMenu()
    await showAlert('✅ Progreso borrado. Podés comenzar una nueva partida.')
  })
}
