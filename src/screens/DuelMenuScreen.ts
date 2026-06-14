import { mostrar } from './ScreenManager'
import { CATS } from '../data/categories'
import type { CategoryKey } from '../types'
import { G } from '../game/state'
import { D, resetDuelState } from '../game/duelState'
import { duelService } from '../services/DuelService'
import { showAlert } from '../ui/Dialog'
import { mostrarDuelLobby } from './DuelLobbyScreen'

export function mostrarDuelMenu(): void {
  mostrar('duelMenuScreen')
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - .5)
}

function buildDuelWords(cat: CategoryKey, nivel: number) {
  const data = CATS[cat]
  const nOk = nivel === 1 ? 12 : nivel === 2 ? 15 : 18
  const nMal = nivel === 1 ? 8 : nivel === 2 ? 9 : 10
  const ok = shuffle(data.ok).slice(0, nOk)
  const mal = shuffle(data.mal).slice(0, nMal)
  return shuffle([
    ...ok.map((text, i) => ({ id: `ok${i}`, text, isCorrect: true })),
    ...mal.map((text, i) => ({ id: `mal${i}`, text, isCorrect: false })),
  ])
}

export function initDuelMenuScreen(): void {
  // Populate category buttons
  const catsWrap = document.getElementById('duelCatsWrap')!
  Object.entries(CATS).forEach(([key, cat]) => {
    const btn = document.createElement('button')
    btn.className = 'duel-cat-btn'
    btn.dataset.cat = key
    btn.textContent = `${cat.icon} ${cat.nombre}`
    btn.addEventListener('click', () => {
      catsWrap.querySelectorAll('.duel-cat-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      D.cat = key as CategoryKey
      D.catNombre = cat.nombre
    })
    catsWrap.appendChild(btn)
  })
  ;(catsWrap.firstElementChild as HTMLButtonElement)?.click()

  // Nivel group
  document.getElementById('duelNivelGroup')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.duel-opt-btn') as HTMLButtonElement | null
    if (!b) return
    document.querySelectorAll('#duelNivelGroup .duel-opt-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    D.nivel = parseInt(b.dataset.val!)
  })

  // Duration group
  document.getElementById('duelDurGroup')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.duel-opt-btn') as HTMLButtonElement | null
    if (!b) return
    document.querySelectorAll('#duelDurGroup .duel-opt-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    D.duracion = parseInt(b.dataset.val!)
  })

  // Tab switching
  const tabCrear  = document.getElementById('duelTabCrear')!
  const tabUnirse = document.getElementById('duelTabUnirse')!
  const secCrear  = document.getElementById('duelCreateSection')!
  const secUnirse = document.getElementById('duelJoinSection')!

  tabCrear.addEventListener('click', () => {
    tabCrear.classList.add('active'); tabUnirse.classList.remove('active')
    secCrear.style.display = ''; secUnirse.style.display = 'none'
  })
  tabUnirse.addEventListener('click', () => {
    tabUnirse.classList.add('active'); tabCrear.classList.remove('active')
    secUnirse.style.display = ''; secCrear.style.display = 'none'
  })

  // Helpers
  const crearBtn  = () => document.getElementById('btnCrearDuelo') as HTMLButtonElement
  const unirseBtn = () => document.getElementById('btnUnirseDuelo') as HTMLButtonElement

  function resetCrearBtn(): void {
    crearBtn().disabled = false
    crearBtn().textContent = '⚔️ Crear Sala'
  }
  function resetJoinBtn(): void {
    unirseBtn().disabled = false
    unirseBtn().textContent = '🔑 Unirse'
  }

  // Server event handlers — registered once at init
  duelService.on('duel_created', ({ code, slot }) => {
    if (D.phase !== 'creating') return
    D.roomCode = code
    D.mySlot = slot
    D.phase = 'lobby'
    resetCrearBtn()
    mostrarDuelLobby()
  })

  duelService.on('duel_joined', ({ slot, rivalNombre }) => {
    if (D.phase !== 'joining') return
    D.mySlot = slot
    D.rivalNombre = rivalNombre
    D.phase = 'lobby'
    resetJoinBtn()
    mostrarDuelLobby()
  })

  duelService.on('error', async (msg) => {
    if (D.phase !== 'creating' && D.phase !== 'joining') return
    resetDuelState()
    duelService.disconnect()
    resetCrearBtn()
    resetJoinBtn()
    await showAlert(`Error: ${msg}`)
  })

  // Crear
  document.getElementById('btnCrearDuelo')!.addEventListener('click', async () => {
    if (!G.jugador) { await showAlert('Ingresá tu nombre primero en el Menú principal.'); return }
    crearBtn().disabled = true
    crearBtn().textContent = '⏳ Conectando...'
    D.myNombre = G.jugador
    D.phase = 'creating'
    const words = buildDuelWords(D.cat, D.nivel)
    duelService.connect()
    duelService.createDuel({ nombre: G.jugador, cat: D.cat, nivel: D.nivel, duracion: D.duracion, words })
  })

  // Unirse
  document.getElementById('btnUnirseDuelo')!.addEventListener('click', async () => {
    if (!G.jugador) { await showAlert('Ingresá tu nombre primero en el Menú principal.'); return }
    const codeInput = document.getElementById('duelCodeInput') as HTMLInputElement
    const code = codeInput.value.trim().toUpperCase()
    if (code.length !== 4) { await showAlert('El código debe tener 4 caracteres.'); return }
    unirseBtn().disabled = true
    unirseBtn().textContent = '⏳ Conectando...'
    D.myNombre = G.jugador
    D.roomCode = code
    D.phase = 'joining'
    duelService.connect()
    duelService.joinDuel(code, G.jugador)
  })

  // Back
  document.getElementById('backFromDuelMenu')!.addEventListener('click', () => {
    resetDuelState()
    duelService.disconnect()
    mostrar('menuPrincipal')
  })
}
