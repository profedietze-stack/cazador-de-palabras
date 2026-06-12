import { DECO_PALABRAS, DECO_COLORES } from '../data/decoWords'
import { G } from '../game/state'
import { iniciarStickersMenu, limpiarStickersMenu } from './StickerSystem'
import { getTotalCombosJugador } from '../storage/GameStorage'

let decoActivo = false
let decoRAFs: number[] = []

export function iniciarDecoMenu(): void {
  decoActivo = true
  const bg = document.getElementById('menuBg')!
  bg.innerHTML = ''
  decoRAFs = []

  if (G.jugador) {
    const tc = getTotalCombosJugador()
    setTimeout(() => iniciarStickersMenu(tc), 600)
  }

  const totalIniciales = 18
  for (let i = 0; i < totalIniciales; i++) {
    const delay = i * 260
    setTimeout(() => { if (decoActivo) lanzarDecoWord(bg, true, i / totalIniciales) }, delay)
  }

  function bucle(): void {
    if (!decoActivo) return
    lanzarDecoWord(bg, false, 0)
    const ms = 900 + Math.random() * 1200
    setTimeout(bucle, ms)
  }
  setTimeout(bucle, totalIniciales * 260 + 200)
}

export function detenerDecoMenu(): void {
  decoActivo = false
  decoRAFs.forEach(id => cancelAnimationFrame(id))
  decoRAFs = []
  const bg = document.getElementById('menuBg')
  if (bg) bg.innerHTML = ''
  limpiarStickersMenu()
}

function lanzarDecoWord(bg: HTMLElement, inicial: boolean, progreso: number): void {
  const el = document.createElement('div')
  el.className = 'deco-palabra'
  el.textContent = DECO_PALABRAS[Math.floor(Math.random() * DECO_PALABRAS.length)]

  const size = 11 + Math.random() * 23
  el.style.fontSize = size + 'px'
  el.style.color = DECO_COLORES[Math.floor(Math.random() * DECO_COLORES.length)]

  const W = window.innerWidth
  const x = Math.random() * (W - 120)
  el.style.left = x + 'px'

  const H = window.innerHeight
  const startY = inicial ? Math.random() * H * progreso * 1.4 - 60 : -55
  el.style.top = startY + 'px'

  const speed = 0.35 + (size / 34) * 0.65 + Math.random() * 0.4
  const oscila = size > 20
  const rota = size < 15
  const ampX = 10 + Math.random() * 20
  const freqX = 0.4 + Math.random() * 0.6
  const rotDir = Math.random() < 0.5 ? 1 : -1
  const startX = x
  let t = 0
  let posY = startY

  bg.appendChild(el)

  const animar = (): void => {
    if (!decoActivo) { el.remove(); return }
    posY += speed
    t += 0.03
    el.style.top = posY + 'px'
    if (oscila) {
      el.style.left = (startX + Math.sin(t * freqX * Math.PI * 2) * ampX) + 'px'
    } else if (rota) {
      el.style.transform = `rotate(${t * 60 * rotDir}deg)`
    }
    if (posY > H + 40) { el.remove(); return }
    const rafId = requestAnimationFrame(animar)
    decoRAFs.push(rafId)
  }
  requestAnimationFrame(animar)
}
