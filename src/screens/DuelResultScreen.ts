import { mostrar } from './ScreenManager'
import { D, resetDuelState } from '../game/duelState'
import { duelService } from '../services/DuelService'
import { lastDuelEnd, cleanupDuelGame } from './DuelGameScreen'
import { mostrarDuelLobby } from './DuelLobbyScreen'
import { showAlert } from '../ui/Dialog'

const REASON_TEXT: Record<string, string> = {
  time:       'Se acabó el tiempo',
  all_words:  '¡Se cazaron todas las palabras!',
  disconnect: 'El rival se desconectó',
}

export function mostrarDuelResult(): void {
  const end = lastDuelEnd
  if (!end) { mostrar('menuPrincipal'); return }

  const mySlot = D.mySlot!
  const rival  = mySlot === 'A' ? 'B' : 'A'

  // Title
  let title: string
  if (end.winner === 'draw')   title = '🤝 ¡Empate!'
  else if (end.winner === mySlot) title = '🏆 ¡Ganaste!'
  else                            title = '😔 ¡Perdiste!'
  document.getElementById('duelResultTitle')!.textContent = title

  // Scores
  document.getElementById('duelRsNombreMe')!.textContent    = D.myNombre
  document.getElementById('duelRsNombreRival')!.textContent = D.rivalNombre
  document.getElementById('duelRsScoreMe')!.textContent     = String(end.scores[mySlot])
  document.getElementById('duelRsScoreRival')!.textContent  = String(end.scores[rival])

  // Highlight winner
  document.getElementById('duelRsMe')!.style.opacity    = end.winner === mySlot || end.winner === 'draw' ? '1' : '.5'
  document.getElementById('duelRsRival')!.style.opacity = end.winner === rival  || end.winner === 'draw' ? '1' : '.5'

  // Reason
  document.getElementById('duelResultReason')!.textContent = REASON_TEXT[end.reason] ?? end.reason

  // Rematch button — hide if rival disconnected
  const rematchBtn = document.getElementById('btnDuelRematch') as HTMLButtonElement
  const rematchStatus = document.getElementById('duelRematchStatus')!
  rematchBtn.style.display    = end.reason === 'disconnect' ? 'none' : ''
  rematchBtn.textContent      = '🔁 Revancha'
  rematchBtn.disabled         = false
  rematchStatus.style.display = 'none'

  mostrar('duelResultScreen')
}

export function initDuelResultScreen(): void {
  let iRequested = false

  // Rival wants rematch
  duelService.on('rematch_requested', () => {
    if (D.phase !== 'ended') return
    const btn = document.getElementById('btnDuelRematch') as HTMLButtonElement
    const status = document.getElementById('duelRematchStatus')!

    if (iRequested) {
      // Both requested — accept automatically handled by server's accept_rematch
      // But server only sends rematch_start on accept_rematch from other player.
      // Actually server sends rematch_requested to the OTHER player.
      // If I already requested, this means rival also clicked — accept.
      duelService.acceptRematch()
    } else {
      btn.style.display   = ''
      btn.textContent     = '✅ Aceptar revancha'
      btn.disabled        = false
      status.style.display = 'block'
      status.textContent  = '¡Tu rival quiere una revancha!'
    }
  })

  // Rematch confirmed — both agreed
  duelService.on('rematch_start', () => {
    iRequested = false
    cleanupDuelGame()
    D.phase   = 'lobby'
    D.scores  = { A: 0, B: 0 }
    D.myPowers = []
    D.words   = []
    mostrarDuelLobby()
  })

  // Rival disconnected while on result screen
  duelService.on('rival_disconnected', async () => {
    if (D.phase !== 'ended') return
    const btn = document.getElementById('btnDuelRematch') as HTMLButtonElement
    btn.style.display = 'none'
    document.getElementById('duelRematchStatus')!.style.display = 'none'
    await showAlert('Tu rival se desconectó.')
  })

  // "Revancha" / "Aceptar revancha" button
  document.getElementById('btnDuelRematch')!.addEventListener('click', () => {
    const btn = document.getElementById('btnDuelRematch') as HTMLButtonElement
    const status = document.getElementById('duelRematchStatus')!

    if (btn.textContent?.includes('Aceptar')) {
      // Rival already requested — accept
      duelService.acceptRematch()
      btn.disabled = true
      btn.textContent = '⏳...'
    } else {
      // I request first
      iRequested = true
      duelService.requestRematch()
      btn.disabled = true
      btn.style.display = 'none'
      status.style.display = 'block'
      status.textContent = 'Esperando respuesta del rival...'
    }
  })

  // Menu button
  document.getElementById('btnDuelResultMenu')!.addEventListener('click', () => {
    iRequested = false
    cleanupDuelGame()
    resetDuelState()
    duelService.disconnect()
    mostrar('menuPrincipal')
  })
}
