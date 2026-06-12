import { G } from './state'
import { CATS } from '../data/categories'
import { shuffleArr } from '../utils'
import { animarCaida } from './WordPhysics'

type OnClickFn = (el: HTMLElement) => void
let _onClick: OnClickFn = () => {}

export function setWordClickHandler(fn: OnClickFn): void {
  _onClick = fn
}

const CAT_COLORS: Record<string, string> = {
  sustantivos:  '#3b82f6',
  adjetivos:    '#ef4444',
  verbos:       '#10b981',
  adverbios:    '#f59e0b',
  articulos:    '#8b5cf6',
  pronombres:   '#ec4899',
  preposiciones:'#06b6d4',
  conjunciones: '#84cc16',
  interjecciones:'#fb923c',
}

let generadorTimeout: ReturnType<typeof setTimeout> | null = null
let generadorCiclo = 0

export function programarPalabras(): void {
  if (!G.activo) return
  generadorCiclo = 0
  generarOlaPalabras()
}

export function detenerWordSpawner(): void {
  if (generadorTimeout) { clearTimeout(generadorTimeout); generadorTimeout = null }
}

function generarOlaPalabras(): void {
  if (!G.activo) return
  const cat = CATS[G.cat!]
  const nivel = G.nivel
  const pcCorr = nivel === 1 ? 0.70 : nivel === 2 ? 0.50 : 0.30
  const cantidad = nivel === 1 ? 3 : nivel === 2 ? 5 : 7

  const okPool = cat.ok.slice()
  const malPool = cat.mal.slice()
  shuffleArr(okPool); shuffleArr(malPool)

  const numCorr = Math.round(cantidad * pcCorr)
  const numMal = cantidad - numCorr

  const palabras: { w: string; ok: boolean }[] = []
  okPool.slice(0, numCorr).forEach(w => palabras.push({ w, ok: true }))
  malPool.slice(0, numMal).forEach(w => palabras.push({ w, ok: false }))
  shuffleArr(palabras)

  palabras.forEach((pw, i) => {
    setTimeout(() => {
      if (G.activo && !G.pausado) crearPalabra(pw.w, pw.ok)
    }, i * 500)
  })

  generadorCiclo++
  const baseMs = nivel === 1 ? 3200 : nivel === 2 ? 2600 : 2000
  const ms = Math.max(nivel === 1 ? 1400 : nivel === 2 ? 1000 : 700, baseMs - generadorCiclo * 60)
  generadorTimeout = setTimeout(generarOlaPalabras, ms)
}

function crearPalabra(texto: string, esCorrecta: boolean): void {
  const area = document.getElementById('gameArea')!
  const el = document.createElement('div')
  el.className = 'palabra'
  el.textContent = texto

  const size = 12 + Math.random() * 20
  el.style.fontSize = size + 'px'

  const maxX = area.clientWidth - 160
  const startX = 20 + Math.random() * Math.max(0, maxX)
  el.style.left = startX + 'px'
  el.style.top = '-60px'

  if (esCorrecta && Math.random() < 0.3) {
    el.style.setProperty('--glow-color', CAT_COLORS[G.cat!] || '#fff')
    el.classList.add('glow-anim')
    const glowTimer = setTimeout(() => el.classList.remove('glow-anim'), 2500 + Math.random() * 1500)
    ;(el as any)._glowTimer = glowTimer
  }

  el.dataset.ok = esCorrecta ? '1' : '0'
  el.dataset.pts = String(Math.round(texto.replace(/[¡!¿?]/g, '').length * (1 + (G.nivel - 1) * 0.5)))
  el.dataset.size = String(size)

  // touchend handles mobile; click handles desktop (pointer events don't fire touchend)
  el.addEventListener('touchend', e => { e.preventDefault(); _onClick(el) }, { passive: false })
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') _onClick(el) })

  area.appendChild(el)
  animarCaida(el, size)
}
