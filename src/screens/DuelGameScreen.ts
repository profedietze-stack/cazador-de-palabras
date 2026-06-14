import { mostrar } from './ScreenManager'
import { D } from '../game/duelState'
import { duelService } from '../services/DuelService'
import { POWER_META } from '../types/duel'
import type { PowerId, DuelScores } from '../types/duel'

// Last duel end data — read by DuelResultScreen
export let lastDuelEnd: { winner: 'A' | 'B' | 'draw'; scores: DuelScores; reason: string } | null = null

function rivalSlot(): 'A' | 'B' { return D.mySlot === 'A' ? 'B' : 'A' }

// ── Timer ─────────────────────────────────────────────────────────────────────

let timerInterval: ReturnType<typeof setInterval> | null = null
let timerDuration = 0
let timerStartedAt = 0

function startTimer(seconds: number): void {
  stopTimer()
  timerDuration = seconds
  timerStartedAt = Date.now()
  updateTimerDisplay(seconds)
  timerInterval = setInterval(() => {
    const remaining = Math.max(0, timerDuration - Math.floor((Date.now() - timerStartedAt) / 1000))
    updateTimerDisplay(remaining)
    if (remaining <= 0) stopTimer()
  }, 500)
}

function stopTimer(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

function updateTimerDisplay(remaining: number): void {
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  document.getElementById('duelHudTimer')!.textContent = `${m}:${String(s).padStart(2, '0')}`
  const pct = timerDuration > 0 ? (remaining / timerDuration) * 100 : 0
  document.getElementById('duelTimerBarFill')!.style.width = `${pct}%`
}

// ── Board ─────────────────────────────────────────────────────────────────────

let frozen = false

function buildBoard(): void {
  const board = document.getElementById('duelBoard')!
  board.innerHTML = ''
  D.words.forEach(w => {
    const chip = document.createElement('button')
    chip.className = 'duel-chip free'
    chip.dataset.wordId = w.id
    chip.textContent = w.text
    chip.addEventListener('click', () => {
      if (frozen || D.phase !== 'playing') return
      if (!chip.classList.contains('free')) return
      duelService.catchWord(w.id)
    })
    board.appendChild(chip)
  })
}

function getChip(wordId: string): HTMLButtonElement | null {
  return document.querySelector(`.duel-board [data-word-id="${wordId}"]`) as HTMLButtonElement | null
}

// ── Scores ────────────────────────────────────────────────────────────────────

function updateScores(scores: DuelScores): void {
  D.scores = scores
  document.getElementById('duelHudScoreMe')!.textContent = String(scores[D.mySlot!])
  document.getElementById('duelHudScoreRival')!.textContent = String(scores[rivalSlot()])
}

// ── Power slots ───────────────────────────────────────────────────────────────

// Independent slot state (not tied to D.myPowers index order)
const slotPower: (PowerId | null)[] = [null, null]
const slotCdPower: (PowerId | null)[] = [null, null]
const slotCdEnd: number[]             = [0, 0]
const slotCdTimer: (ReturnType<typeof setInterval> | null)[] = [null, null]

function resetSlots(): void {
  for (let i = 0; i < 2; i++) {
    slotPower[i] = null
    slotCdPower[i] = null
    slotCdEnd[i] = 0
    if (slotCdTimer[i]) { clearInterval(slotCdTimer[i]!); slotCdTimer[i] = null }
  }
}

function renderSlot(i: number): void {
  const el = document.getElementById(`duelPowerSlot${i}`)!
  const onCd = slotCdTimer[i] !== null || (slotCdEnd[i] > Date.now())

  if (onCd) {
    const rem = Math.max(0, Math.ceil((slotCdEnd[i] - Date.now()) / 1000))
    const icon = slotCdPower[i] ? POWER_META[slotCdPower[i]!].icon : '⏳'
    el.className = 'duel-power-slot cooldown'
    el.innerHTML = `<span class="dps-icon">${icon}</span><span class="dps-cd">${rem}s</span>`
  } else if (slotPower[i]) {
    const meta = POWER_META[slotPower[i]!]
    el.className = 'duel-power-slot ready'
    el.innerHTML = `<span class="dps-icon">${meta.icon}</span><span class="dps-label">${meta.label}</span>`
  } else {
    el.className = 'duel-power-slot empty'
    el.innerHTML = ''
  }
}

function renderSlots(): void { renderSlot(0); renderSlot(1) }

function assignPower(powerId: PowerId): void {
  // Put in first non-occupied, non-cooldown slot
  for (let i = 0; i < 2; i++) {
    if (!slotPower[i] && !slotCdTimer[i] && slotCdEnd[i] <= Date.now()) {
      slotPower[i] = powerId
      renderSlot(i)
      return
    }
  }
  // Both slots occupied — replace oldest (slot 0)
  slotPower[0] = powerId
  renderSlot(0)
}

function consumePower(powerId: PowerId): void {
  const idx = slotPower.indexOf(powerId)
  if (idx === -1) return
  slotCdPower[idx] = powerId
  slotPower[idx] = null
  slotCdEnd[idx] = Date.now() + POWER_META[powerId].cooldownMs
  slotCdTimer[idx] = setInterval(() => {
    if (slotCdEnd[idx] <= Date.now()) {
      clearInterval(slotCdTimer[idx]!); slotCdTimer[idx] = null
      slotCdPower[idx] = null
    }
    renderSlot(idx)
  }, 500)
  renderSlot(idx)
}

function removePowerNoCD(powerId: PowerId): void {
  const idx = slotPower.indexOf(powerId)
  if (idx !== -1) { slotPower[idx] = null; renderSlot(idx) }
}

// ── Freeze ────────────────────────────────────────────────────────────────────

let freezeTimeout: ReturnType<typeof setTimeout> | null = null

function applyFreeze(): void {
  frozen = true
  document.getElementById('duelFreezeOverlay')!.style.display = 'flex'
  if (freezeTimeout) clearTimeout(freezeTimeout)
  freezeTimeout = setTimeout(() => {
    frozen = false
    document.getElementById('duelFreezeOverlay')!.style.display = 'none'
    freezeTimeout = null
  }, 3000)
}

// ── Decoy ─────────────────────────────────────────────────────────────────────

let decoyTimeout: ReturnType<typeof setTimeout> | null = null
const decoyChips: HTMLButtonElement[] = []

function showDecoy(words: string[]): void {
  const board = document.getElementById('duelBoard')!
  words.forEach(text => {
    const chip = document.createElement('button')
    chip.className = 'duel-chip free decoy'
    chip.dataset.wordId = `decoy_${text}`
    chip.textContent = text
    chip.addEventListener('click', () => {
      // Server ignores unknown IDs — no harm done
      duelService.catchWord(`decoy_${text}`)
    })
    board.appendChild(chip)
    decoyChips.push(chip)
  })

  document.getElementById('duelDecoyNotice')!.style.display = 'block'
  if (decoyTimeout) clearTimeout(decoyTimeout)
  decoyTimeout = setTimeout(() => {
    decoyChips.forEach(c => c.remove())
    decoyChips.length = 0
    document.getElementById('duelDecoyNotice')!.style.display = 'none'
    decoyTimeout = null
  }, 8000)
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function cleanupDuelGame(): void {
  stopTimer()
  resetSlots()
  frozen = false
  if (freezeTimeout) { clearTimeout(freezeTimeout); freezeTimeout = null }
  if (decoyTimeout) { clearTimeout(decoyTimeout); decoyTimeout = null }
  decoyChips.forEach(c => c.remove()); decoyChips.length = 0
  document.getElementById('duelFreezeOverlay')!.style.display = 'none'
  document.getElementById('duelDecoyNotice')!.style.display = 'none'
}

// ── Show ──────────────────────────────────────────────────────────────────────

export function mostrarDuelGame(): void {
  cleanupDuelGame()

  // HUD setup
  document.getElementById('duelHudNombreMe')!.textContent = D.myNombre
  document.getElementById('duelHudNombreRival')!.textContent = D.rivalNombre
  document.getElementById('duelHudCat')!.textContent = `${D.catNombre} · Nv ${D.nivel}`
  updateScores({ A: 0, B: 0 })

  // Board
  buildBoard()

  // Timer
  startTimer(D.duracion)

  mostrar('duelGameScreen')
}

// ── Init (called once from main.ts) ──────────────────────────────────────────

export function initDuelGameScreen(): void {

  // word_taken: update chip, scores
  duelService.on('word_taken', ({ wordId, bySlot, scores }) => {
    if (D.phase !== 'playing') return
    const chip = getChip(wordId)
    if (chip) {
      chip.classList.remove('free')
      chip.classList.add(bySlot === D.mySlot ? 'taken-me' : 'taken-rival')
    }
    updateScores(scores)
  })

  // word_already_taken: brief shake
  duelService.on('word_already_taken', (wordId) => {
    const chip = getChip(wordId)
    if (chip) {
      chip.style.opacity = '.4'
      setTimeout(() => { chip.style.opacity = '' }, 300)
    }
  })

  // power_earned
  duelService.on('power_earned', (powerId) => {
    if (D.phase !== 'playing') return
    assignPower(powerId)
  })

  // power_used: server confirmed — consume from slot, start cooldown
  duelService.on('power_used', (powerId) => {
    consumePower(powerId)
  })

  // power_effect: rival used a power ON ME
  duelService.on('power_effect', ({ powerId, decoyWords }) => {
    if (D.phase !== 'playing') return
    if (powerId === 'FREEZE') applyFreeze()
    if (powerId === 'DECOY') showDecoy(decoyWords ?? [])
    // STEAL: word_taken event will update chip and scores
  })

  // power_blocked: MY power was blocked by rival's SHIELD
  duelService.on('power_blocked', (powerId) => {
    removePowerNoCD(powerId)
  })

  // shield_consumed: server tells me my SHIELD just absorbed something
  // (already handled server-side; local slot was cleared when power_used fired)
  duelService.on('shield_consumed', (_powerId) => {})

  // power_failed
  duelService.on('power_failed', ({ powerId, reason }) => {
    console.warn(`power_failed [${powerId}]: ${reason}`)
  })

  // duel_end
  duelService.on('duel_end', ({ winner, scores, reason }) => {
    if (D.phase !== 'playing') return
    stopTimer()
    D.phase = 'ended'
    D.scores = scores
    lastDuelEnd = { winner, scores, reason }
    import('./DuelResultScreen').then(m => m.mostrarDuelResult())
  })

  // Power slot click handlers
  for (let i = 0; i < 2; i++) {
    document.getElementById(`duelPowerSlot${i}`)!.addEventListener('click', () => {
      if (D.phase !== 'playing') return
      const pow = slotPower[i]
      if (!pow) return
      if (slotCdTimer[i] !== null || slotCdEnd[i] > Date.now()) return
      duelService.usePower(pow)
    })
  }
}
