import { G } from './state'
import { CATS } from '../data/categories'
import { shuffleArr } from '../utils'
import { animarCaida } from './WordPhysics'
import { puntosPorAcierto } from './reglas'
import { distractoresParaNivel, textoVisible } from './distractores'
import { priorizarDistractores } from './sesionRepaso'

type OnClickFn = (el: HTMLElement) => void
let _onClick: OnClickFn = () => {}

export function setWordClickHandler(fn: OnClickFn): void {
  _onClick = fn
}

/**
 * Palabras que se pueden cazar ahora, de la más baja (la que está por salir) a la
 * más alta. Es el orden en que las recorre el teclado.
 */
export function palabrasActivas(): HTMLElement[] {
  const area = document.getElementById('gameArea')
  if (!area) return []
  return [...area.querySelectorAll<HTMLElement>('.palabra')]
    .filter(el => el.dataset.cazada !== '1')
    .sort((a, b) => parseFloat(b.style.top || '0') - parseFloat(a.style.top || '0'))
}

/** Foco a la palabra siguiente en ese orden (o a la más baja si no hay ninguna enfocada). */
export function enfocarPalabra(sentido: 1 | -1, desde?: HTMLElement | null): HTMLElement | null {
  const lista = palabrasActivas()
  if (lista.length === 0) return null
  const i = desde ? lista.indexOf(desde) : -1
  const destino = i === -1 ? (sentido === 1 ? lista[0]! : lista[lista.length - 1]!)
    : lista[Math.min(lista.length - 1, Math.max(0, i + sentido))]!
  destino.focus({ preventScroll: true })
  return destino
}

// La respuesta no viaja en el DOM (antes `data-ok`, legible desde el inspector):
// un bot de diez líneas ganaba el nivel 1 en 32 s leyéndolo.
const correctas = new WeakSet<HTMLElement>()
export function esPalabraCorrecta(el: HTMLElement): boolean {
  return correctas.has(el)
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
  const numMalPrevisto = cantidad - Math.round(cantidad * pcCorr)
  // Los que el alumno tocó mal antes vuelven primero (repaso espaciado).
  const malPool = priorizarDistractores(G.cat!, distractoresParaNivel(cat.mal, cat.malCerca, nivel), Math.max(1, Math.ceil(numMalPrevisto * 0.5)))
  shuffleArr(okPool)

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
  // Sin ¡ ni !: todas las interjecciones los llevaban y ninguna otra palabra,
  // así que se acertaba por la forma sin entender la categoría.
  el.textContent = textoVisible(texto)
  el.dataset.palabra = texto

  // Mínimo 18 px: las de 12-15 px giraban a 150°/s y eran ilegibles para baja
  // visión y dislexia; se castigaba un error de lectura como si fuera de gramática.
  const size = 18 + Math.random() * 14
  el.style.fontSize = size + 'px'

  const maxX = area.clientWidth - 160
  const startX = 20 + Math.random() * Math.max(0, maxX)
  el.style.left = startX + 'px'
  el.style.top = '-60px'

  if (esCorrecta) correctas.add(el)
  el.dataset.pts = String(puntosPorAcierto(G.nivel))
  el.dataset.size = String(size)

  // Teclado: cada palabra es un botón para los lectores de pantalla y se opera con
  // Enter o espacio. Las flechas (GameScreen) recorren las palabras de la más baja a
  // la más alta. Antes el juego solo se podía jugar con puntero.
  el.tabIndex = 0
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', textoVisible(texto))
  el.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    // El foco pasa a la siguiente (la de más arriba) antes de que ésta desaparezca.
    const lista = palabrasActivas()
    const i = lista.indexOf(el)
    const siguiente = lista[i + 1] ?? lista[i - 1] ?? null
    _onClick(el)
    siguiente?.focus({ preventScroll: true })
  })

  // touchend handles mobile; click handles desktop (pointer events don't fire touchend)
  el.addEventListener('touchend', e => { e.preventDefault(); _onClick(el) }, { passive: false })
  // Mouse y lápiz (pizarras digitales); el dedo lo atiende touchend.
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') _onClick(el) })

  area.appendChild(el)
  animarCaida(el, size)
}
