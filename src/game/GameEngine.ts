import type { GameRecord, Medal } from '../types'
import { G } from './state'
import { CATS } from '../data/categories'
import { sonidoOk, sonidoMal, sonidoNivel, detenerMusica } from '../audio/AudioEngine'
import { addPartida, cargarDatos, guardarDatos } from '../storage/GameStorage'
import { COMBOS, actualizarCombo, resetCombo } from './ComboSystem'
import { programarPalabras, detenerWordSpawner, setWordClickHandler, esPalabraCorrecta } from './WordSpawner'
import { checkLogros } from './ScoreSystem'
import { showBanner } from '../ui/Banner'
import { calcularMedalla, calcularPrecision, restaPorError } from './reglas'
import { explicarError } from './porQue'
import { cargarRepasoJugador, guardarRepaso, falloEnRepaso, aciertoEnRepaso } from './sesionRepaso'
import { setAlSalirSinTocar } from './WordPhysics'

// callbacks set by screens
let _onGameEnd: ((record: GameRecord, logros: ReturnType<typeof checkLogros>) => void) | null = null

export function setOnGameEnd(fn: typeof _onGameEnd): void {
  _onGameEnd = fn
}

let _onPracticaEnd: (() => void) | null = null
export function setOnPracticaEnd(fn: typeof _onPracticaEnd): void {
  _onPracticaEnd = fn
}

let porQueTimer: ReturnType<typeof setTimeout> | null = null
/** Explicación no bloqueante de por qué la palabra tocada no era de la categoría. */
function mostrarPorQue(texto: string): void {
  const el = document.getElementById('porQue')
  if (!el) return
  el.textContent = texto
  el.classList.add('visible')
  if (porQueTimer) clearTimeout(porQueTimer)
  porQueTimer = setTimeout(() => el.classList.remove('visible'), 4500)
}

const EMOJIS_LITERARIOS = ['📖','✏️','📝','🖊️','📚','🔤','🅰️','💬','🗣️','📜','🖋️','🎭','📕','📗','📘','🔡','💡','🌟','⭐','✨']
const STICKERS_JUEGO    = ['📖','✏️','📝','🖊️','📚','🔤','📜','🖋️','🎭','📕','📗','📘','💡','🌟','⭐','🎓','🏅','🔡','💬','🗣️']

export function iniciarJuego(): void {
  const gameEl = document.getElementById('gameScreen')!
  gameEl.className = gameEl.className.replace(/\bcat-bg-\w+/g, '').trim()
  if (G.cat) gameEl.classList.add(`cat-bg-${G.cat}`)
  // Pantalla completa sobre TODO el documento, no sobre #gameScreen: el diálogo
  // de «Salir», los avisos y el banner de errores viven en <body>, y fuera del
  // elemento en pantalla completa el navegador no los dibuja (el alumno tocaba
  // «Salir» y no pasaba nada visible mientras el reloj seguía corriendo).
  const el = document.documentElement
  if (document.fullscreenEnabled && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {})
  } else if ((document as any).webkitFullscreenEnabled && (el as any).webkitRequestFullscreen) {
    (el as any).webkitRequestFullscreen()
  }

  G.pts = 0; G.tiempo = 180; G.tiempoExtra = false
  G.cazadas = 0; G.erradas = 0; G.activo = true; G.pausado = false
  G.racha = 0; G.comboNivel = 0; G.combosTotalesPartida = 0
  G.tiempoInicioNivel = Date.now()
  G.fallosPartida = {}
  // La velocidad se calcula acá y no solo al elegir el nivel: la práctica la
  // baja y al volver a una partida normal tiene que recuperarse sola.
  G.velocidadBase = G.practica ? 0.6 : 1 + (G.nivel - 1) * 0.5
  cargarRepasoJugador()
  setAlSalirSinTocar(el => {
    // Un distractor que cayó sin que lo tocaran es un acierto de repaso.
    if (G.activo && !esPalabraCorrecta(el) && el.dataset.palabra && G.cat) aciertoEnRepaso(G.cat, el.dataset.palabra)
  })
  document.getElementById('porQue')?.classList.remove('visible')

  const cat = CATS[G.cat!]
  document.getElementById('hudPts')!.textContent = '0'
  document.getElementById('hudObj')!.textContent = G.practica ? '—' : String(G.obj)
  document.getElementById('hudCat')!.textContent = cat.nombre + (G.practica ? ' · práctica' : '')
  document.getElementById('hudTime')!.textContent = G.practica ? '∞' : '3:00'
  document.getElementById('tiempoBarFill')!.style.width = '100%'

  document.getElementById('gameArea')!.querySelectorAll('.palabra').forEach(p => p.remove())

  setWordClickHandler(cazarPalabra)
  iniciarTimer()
  programarPalabras()
}

export function terminarJuego(): void {
  G.activo = false
  resetCombo()
  detenerMusica()
  if (G.intervaloTiempo) clearInterval(G.intervaloTiempo)
  detenerWordSpawner()
  document.getElementById('gameArea')!.querySelectorAll('.palabra').forEach(p => p.remove())
  guardarRepaso()

  const precision = calcularPrecision(G.cazadas, G.erradas)
  const tiempoUsado = Math.round((Date.now() - G.tiempoInicioNivel!) / 1000)

  const medalla: Medal | null = calcularMedalla(G.pts, G.obj, precision, G.tiempoExtra)

  const partida: GameRecord = {
    cat: G.cat!,
    catNombre: CATS[G.cat!].nombre,
    nivel: G.nivel,
    pts: G.pts,
    medalla,
    precision,
    cazadas: G.cazadas,
    erradas: G.erradas,
    tiempoUsado,
    combosHechos: G.combosTotalesPartida || 0,
    fecha: new Date().toISOString(),
  }

  if (document.fullscreenElement) document.exitFullscreen()

  addPartida(partida)
  const logrosNuevos = checkLogros(partida)
  sonidoNivel()
  _onGameEnd?.(partida, logrosNuevos)
}

export function detenerJuego(): void {
  G.activo = false
  resetCombo()
  detenerMusica()
  if (G.intervaloTiempo) clearInterval(G.intervaloTiempo)
  detenerWordSpawner()
  document.getElementById('gameArea')!.querySelectorAll('.palabra').forEach(p => p.remove())
  // Se guarda también al salir a mitad de partida: en el aula cerrar antes de la
  // meta es lo normal, no lo raro.
  guardarRepaso()
  if (document.fullscreenElement) document.exitFullscreen()
}

/** Fin de una práctica: no hay medalla ni ranking, solo el resumen de lo que hay que repasar. */
export function terminarPractica(): void {
  detenerJuego()
  _onPracticaEnd?.()
}

function iniciarTimer(): void {
  if (G.intervaloTiempo) clearInterval(G.intervaloTiempo)
  if (G.practica) return   // sin reloj: sin presión para quien lee despacio
  const totalInicial = 180
  G.intervaloTiempo = setInterval(() => {
    if (G.pausado || !G.activo) return
    G.tiempo--
    const m = Math.floor(G.tiempo / 60), s = G.tiempo % 60
    document.getElementById('hudTime')!.textContent = `${m}:${s.toString().padStart(2, '0')}`
    const pct = Math.max(0, (G.tiempo / totalInicial) * 100)
    document.getElementById('tiempoBarFill')!.style.width = pct + '%'
    if (G.tiempo <= 0) {
      if (!G.tiempoExtra) {
        G.tiempoExtra = true
        G.tiempo = 180
        showBanner('⚠️ ¡Tiempo extra! La medalla máxima ahora es Plata.')
      } else {
        clearInterval(G.intervaloTiempo!)
        terminarJuego()
      }
    }
  }, 1000)
}

function cazarPalabra(el: HTMLElement): void {
  if (!G.activo || el.dataset.cazada === '1') return
  el.dataset.cazada = '1'
  if ((el as any)._rafId) cancelAnimationFrame((el as any)._rafId)

  const esOk = esPalabraCorrecta(el)
  const ptsBase = parseInt(el.dataset.pts || '1') || 1
  const rect = el.getBoundingClientRect()
  const area = document.getElementById('gameArea')!
  const aRect = area.getBoundingClientRect()
  const cx = rect.left - aRect.left + rect.width / 2
  const cy = rect.top - aRect.top

  if (esOk) {
    const mult = G.comboNivel > 0 ? COMBOS[G.comboNivel]!.mult : 1
    const pts = Math.round(ptsBase * mult)
    G.pts += pts; G.cazadas++
    sonidoOk()
    el.classList.add('hit-ok')
    actualizarCombo(true)
    const label = G.comboNivel > 0 ? `+${pts} ×${COMBOS[G.comboNivel]!.mult}` : `+${pts}`
    mostrarPuntosFlotantes(label, cx, cy, G.comboNivel >= 4 ? '#f59e0b' : G.comboNivel >= 2 ? '#a855f7' : '#10b981')
    if (G.comboNivel >= 1) {
      soltarEmojisLiterarios(cx, cy, G.comboNivel + 1)
      mostrarStickersJuego(cx, cy, G.comboNivel)
    }
    document.getElementById('hudPts')!.textContent = String(G.pts)
    if (!G.practica && G.pts >= G.obj) terminarJuego()
  } else {
    const resta = restaPorError(G.nivel)
    G.pts = Math.max(0, G.pts - resta); G.erradas++
    sonidoMal()
    el.classList.add('hit-mal')
    mostrarPuntosFlotantes('-' + resta, cx, cy, '#ef4444')
    const palabra = el.dataset.palabra
    if (palabra && G.cat) {
      G.fallosPartida[palabra] = (G.fallosPartida[palabra] ?? 0) + 1
      falloEnRepaso(G.cat, palabra)
      mostrarPorQue(explicarError(palabra, G.cat))
    }
    actualizarCombo(false)
    document.getElementById('hudPts')!.textContent = String(G.pts)
  }

  setTimeout(() => el.remove(), 450)
}

function mostrarPuntosFlotantes(txt: string, x: number, y: number, color: string): void {
  const area = document.getElementById('gameArea')!
  const d = document.createElement('div')
  d.className = 'punto-flotante'
  d.textContent = txt
  d.style.left = x + 'px'
  d.style.top = y + 'px'
  d.style.color = color
  d.style.fontSize = G.comboNivel >= 3 ? '1.3rem' : G.comboNivel >= 1 ? '1.1rem' : '1rem'
  area.appendChild(d)
  setTimeout(() => d.remove(), 900)
}

function soltarEmojisLiterarios(x: number, y: number, cantidad: number): void {
  const area = document.getElementById('gameArea')!
  for (let i = 0; i < cantidad; i++) {
    const e = document.createElement('div')
    e.className = 'emoji-literario'
    e.textContent = EMOJIS_LITERARIOS[Math.floor(Math.random() * EMOJIS_LITERARIOS.length)]!
    const offsetX = (Math.random() - 0.5) * 50
    e.style.left = (x - 12 + offsetX) + 'px'
    e.style.top = y + 'px'
    const saltoH = -(55 + Math.random() * 60)
    const caida = 15 + Math.random() * 25
    const rotDir = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 18)
    e.style.setProperty('--saltoY', saltoH + 'px')
    e.style.setProperty('--caerY', caida + 'px')
    e.style.setProperty('--caerY2', (-caida / 2) + 'px')
    e.style.setProperty('--finalY', (caida * 0.4) + 'px')
    e.style.setProperty('--rotDir', rotDir + 'deg')
    e.style.animationDelay = (i * 70) + 'ms'
    e.style.fontSize = (1.4 + Math.random() * 0.6) + 'rem'
    area.appendChild(e)
    setTimeout(() => e.remove(), 1200 + i * 70)
  }
}

function mostrarStickersJuego(cx: number, cy: number, nivel: number): void {
  const area = document.getElementById('gameArea')!
  const cantidad = nivel + 1
  for (let i = 0; i < cantidad; i++) {
    setTimeout(() => {
      if (!G.activo) return
      const s = document.createElement('div')
      s.className = 'sticker-literario'
      s.textContent = STICKERS_JUEGO[Math.floor(Math.random() * STICKERS_JUEGO.length)]!
      const ang = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 120
      const sx = Math.max(10, Math.min(area.clientWidth - 50, cx + Math.cos(ang) * dist))
      const sy = Math.max(10, Math.min(area.clientHeight - 50, cy + Math.sin(ang) * dist))
      s.style.left = sx + 'px'
      s.style.top = sy + 'px'
      s.style.fontSize = (1.6 + Math.random() * 1.2) + 'rem'
      area.appendChild(s)
      setTimeout(() => { s.classList.add('saliendo'); setTimeout(() => s.remove(), 500) }, 1100 + Math.random() * 400)
    }, i * 120)
  }
}
