import { mostrar } from './ScreenManager'
import { D, resetDuelState } from '../game/duelState'
import { duelService } from '../services/DuelService'
import { showAlert } from '../ui/Dialog'
import { mostrarDuelGame } from './DuelGameScreen'
import { CATS } from '../data/categories'
import type { CategoryKey } from '../types'

export function mostrarDuelLobby(): void {
  const mySlot = D.mySlot!

  // Reset ready indicators and connected state
  const slotACard = document.getElementById('lobbySlotA')!
  const slotBCard = document.getElementById('lobbySlotB')!
  const rdyA = document.getElementById('lobbyReadyA')!
  const rdyB = document.getElementById('lobbyReadyB')!
  slotACard.classList.remove('connected')
  slotBCard.classList.remove('connected')
  rdyA.textContent = '⏳'; rdyA.classList.remove('ready')
  rdyB.textContent = '⏳'; rdyB.classList.remove('ready')

  // Code
  document.getElementById('lobbyCode')!.textContent = D.roomCode

  // Player names
  if (mySlot === 'A') {
    document.getElementById('lobbyNombreA')!.textContent = D.myNombre
    document.getElementById('lobbyNombreB')!.textContent = D.rivalNombre || 'Esperando...'
    slotACard.classList.add('connected')
    if (D.rivalNombre) slotBCard.classList.add('connected')
  } else {
    document.getElementById('lobbyNombreA')!.textContent = D.rivalNombre
    document.getElementById('lobbyNombreB')!.textContent = D.myNombre
    slotACard.classList.add('connected')
    slotBCard.classList.add('connected')
  }

  // Code hint
  document.getElementById('lobbyCodeHint')!.textContent = mySlot === 'A'
    ? 'Compartí este código con tu rival'
    : `Sala creada por ${D.rivalNombre}`

  // Ready button
  const readyBtn = document.getElementById('btnLobbyReady') as HTMLButtonElement
  readyBtn.textContent = '✅ ¡Listo!'
  readyBtn.disabled = mySlot === 'A' && !D.rivalNombre

  // Info
  document.getElementById('lobbyInfo')!.textContent = mySlot === 'A' && !D.rivalNombre
    ? 'Esperando al segundo jugador...'
    : '¡Presioná ¡Listo! cuando estés preparado!'

  // Hide countdown overlay in case of rematch
  document.getElementById('duelCountdownOverlay')!.style.display = 'none'

  mostrar('duelLobbyScreen')
}

export function initDuelLobbyScreen(): void {
  let countdownInterval: ReturnType<typeof setInterval> | null = null

  // Rival joined → player A gets this
  duelService.on('rival_joined', ({ nombre }) => {
    if (D.phase !== 'lobby') return
    D.rivalNombre = nombre
    document.getElementById('lobbyNombreB')!.textContent = nombre
    document.getElementById('lobbySlotB')!.classList.add('connected')
    document.getElementById('lobbyInfo')!.textContent = '¡Presioná ¡Listo! cuando estés preparado!'
    ;(document.getElementById('btnLobbyReady') as HTMLButtonElement).disabled = false
  })

  // Countdown
  duelService.on('countdown_start', () => {
    if (D.phase !== 'lobby') return
    D.phase = 'countdown'
    const overlay = document.getElementById('duelCountdownOverlay')!
    const numEl  = document.getElementById('duelCountdownNum')!
    overlay.style.display = 'flex'
    let count = 3
    numEl.textContent = String(count)
    countdownInterval = setInterval(() => {
      count--
      if (count <= 0) {
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
      } else {
        numEl.textContent = String(count)
        numEl.style.animation = 'none'
        void numEl.offsetHeight
        numEl.style.animation = 'pop .4s ease'
      }
    }, 1000)
  })

  // Duel start → hand off to game screen
  duelService.on('duel_start', ({ words, duracion, cats, nivel }) => {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
    document.getElementById('duelCountdownOverlay')!.style.display = 'none'
    D.words = words
    D.duracion = duracion
    // Joiner needs cats/nivel from server (creator already has them set)
    if (cats?.length) {
      D.cats = cats as CategoryKey[]
      D.nivel = nivel
      D.catsNombre = cats.map((c: string) => CATS[c as CategoryKey]?.nombre ?? c).join(', ')
    }
    D.phase = 'playing'
    mostrarDuelGame()
  })

  // Rival disconnected during lobby / countdown
  duelService.on('rival_disconnected', async () => {
    if (D.phase !== 'lobby' && D.phase !== 'countdown') return
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
    document.getElementById('duelCountdownOverlay')!.style.display = 'none'
    resetDuelState()
    duelService.disconnect()
    await showAlert('Tu rival se desconectó.')
    mostrar('menuPrincipal')
  })

  // Ready button
  document.getElementById('btnLobbyReady')!.addEventListener('click', () => {
    duelService.ready()
    const btn = document.getElementById('btnLobbyReady') as HTMLButtonElement
    btn.disabled = true
    btn.textContent = '⌛ Esperando al rival...'
    const myReadyId = D.mySlot === 'A' ? 'lobbyReadyA' : 'lobbyReadyB'
    const el = document.getElementById(myReadyId)!
    el.textContent = '✅'
    el.classList.add('ready')
  })

  // Abandon
  document.getElementById('btnLobbyAbandon')!.addEventListener('click', () => {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
    resetDuelState()
    duelService.disconnect()
    mostrar('menuPrincipal')
  })
}
