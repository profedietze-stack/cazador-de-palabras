import { cargarLayoutStickers, guardarLayoutStickers } from '../storage/GameStorage'

const STICKERS_LIT = ['📖','✏️','📝','🖊️','📚','🔤','📜','🖋️','🎭','📕','📗','📘','💡','🌟','⭐','🎓','🏅','🔡','💬','🗣️','🖍️','🔖','📃','🃏','🎪']
const FRASES_MOTIVADORAS = [
  '¡Sos un crack!','¡Sigue así!','¡Imparable!','¡Gran cazador!',
  '¡Maestro en acción!','¡Lingüista nato!','¡Combo poder!','¡Palabras al poder!',
  '¡Leyenda viva!','¡100% cazador!','¡Sin parar!','¡El mejor!',
  '¡Imbatible!','¡Top cazador!','¡Genio gramatical!',
]
const MAX_STICKERS_LOGROS = 12
const MAX_STICKERS_MENU   = 8
const COMBOS_POR_STICKER_LOGROS = 5
const COMBOS_POR_STICKER_MENU   = 8

interface StickerItem {
  xPct?: number; yPct?: number
  x?: number; y?: number
  rot: number; emoji: string; size: number; frase?: string | null
}

function generarLayoutLogros(): StickerItem[] {
  const items: StickerItem[] = []
  const margenPct = 0.10
  for (let i = 0; i < MAX_STICKERS_LOGROS; i++) {
    const lado = i % 2
    const xPct = lado === 0
      ? Math.random() * margenPct
      : (1 - margenPct) + Math.random() * margenPct
    const yPct = (i / MAX_STICKERS_LOGROS) + Math.random() * (1 / MAX_STICKERS_LOGROS)
    const rot = (Math.random() - 0.5) * 32
    const emoji = STICKERS_LIT[Math.floor(Math.random() * STICKERS_LIT.length)]!
    const size = 1.7 + Math.random() * 1.1
    const frase = (i % 3 === 0) ? FRASES_MOTIVADORAS[Math.floor(Math.random() * FRASES_MOTIVADORAS.length)] : null
    items.push({ xPct, yPct, rot, emoji, size, frase })
  }
  return items
}

function generarLayoutMenu(): StickerItem[] {
  const W = window.innerWidth, H = window.innerHeight
  const items: StickerItem[] = []
  const zonas = [
    () => ({ x: 4 + Math.random() * (W * 0.10),      y: 60 + Math.random() * (H - 120) }),
    () => ({ x: W * 0.90 + Math.random() * (W * 0.10), y: 60 + Math.random() * (H - 120) }),
    () => ({ x: 60 + Math.random() * (W - 120),       y: 4 + Math.random() * 50 }),
    () => ({ x: 60 + Math.random() * (W - 120),       y: H - 80 + Math.random() * 50 }),
  ]
  for (let i = 0; i < MAX_STICKERS_MENU; i++) {
    const pos = zonas[i % 4]!()
    const rot = (Math.random() - 0.5) * 40
    const emoji = STICKERS_LIT[Math.floor(Math.random() * STICKERS_LIT.length)]!
    const size = 1.5 + Math.random() * 1.2
    items.push({ x: pos.x, y: pos.y, rot, emoji, size })
  }
  return items
}

export function iniciarStickersLogros(totalCombos: number): void {
  let layout = cargarLayoutStickers('logros')
  if (!layout) { layout = generarLayoutLogros(); guardarLayoutStickers('logros', layout) }
  requestAnimationFrame(() => requestAnimationFrame(() => renderStickersLogros(layout!, totalCombos)))
}

export function iniciarStickersMenu(totalCombos: number): void {
  let layout = cargarLayoutStickers('menu')
  if (!layout) { layout = generarLayoutMenu(); guardarLayoutStickers('menu', layout) }
  renderStickersMenu(layout, totalCombos)
}

export function limpiarStickersLogros(): void {
  const layer = document.getElementById('stickerLayerLogros')
  if (layer) layer.innerHTML = ''
  document.querySelectorAll('.logro-sticker,.logro-sticker-frase').forEach(e => e.remove())
}

export function limpiarStickersMenu(): void {
  const bg = document.getElementById('menuBg')
  if (bg) bg.querySelectorAll('.menu-sticker').forEach(e => e.remove())
}

function renderStickersLogros(layout: StickerItem[], totalCombos: number): void {
  const layer = document.getElementById('stickerLayerLogros')
  if (!layer) return
  layer.innerHTML = ''
  const visibles = Math.min(MAX_STICKERS_LOGROS, Math.floor(totalCombos / COMBOS_POR_STICKER_LOGROS))
  const screen = document.getElementById('medallasScrollWrap')!
  const scrollH = Math.max(screen.scrollHeight, screen.clientHeight, 900)
  const W = screen.clientWidth || window.innerWidth

  layout.forEach((item, i) => {
    const px = item.xPct !== undefined ? item.xPct * W      : item.x!
    const py = item.yPct !== undefined ? item.yPct * scrollH : item.y!
    const s = document.createElement('div')
    s.className = 'logro-sticker'
    s.textContent = item.emoji
    s.style.left = px + 'px'; s.style.top = py + 'px'
    s.style.fontSize = item.size + 'rem'
    s.style.setProperty('--rot', item.rot + 'deg')
    layer.appendChild(s)
    if (i < visibles) {
      const delay = i * 120
      setTimeout(() => {
        s.classList.add('revelando')
        setTimeout(() => { s.classList.remove('revelando'); s.classList.add('visible') }, 400)
      }, delay)
    }
    if (item.frase && totalCombos >= 10) {
      const f = document.createElement('div')
      f.className = 'logro-sticker-frase'
      f.textContent = item.frase
      f.style.left = (px - 10) + 'px'
      f.style.top = (py + item.size * 14 + 4) + 'px'
      f.style.setProperty('--rot', (item.rot * 0.4) + 'deg')
      layer.appendChild(f)
      if (i < visibles) setTimeout(() => f.classList.add('visible'), i * 120 + 300)
    }
  })
}

function renderStickersMenu(layout: StickerItem[], totalCombos: number): void {
  const bg = document.getElementById('menuBg')
  if (!bg) return
  bg.querySelectorAll('.menu-sticker').forEach(e => e.remove())
  const visibles = Math.min(MAX_STICKERS_MENU, Math.floor(totalCombos / COMBOS_POR_STICKER_MENU))
  layout.forEach((item, i) => {
    const s = document.createElement('div')
    s.className = 'menu-sticker'
    s.textContent = item.emoji
    s.style.left = item.x + 'px'; s.style.top = item.y + 'px'
    s.style.fontSize = item.size + 'rem'
    s.style.setProperty('--rot', item.rot + 'deg')
    bg.appendChild(s)
    if (i < visibles) setTimeout(() => s.classList.add('visible'), i * 160 + 400)
  })
}
