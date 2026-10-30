import type { Mundo } from '../data/mundos'
import type { Ajustes } from '../storage/ajustes'
import type { Cielo } from './aplicarAjustes'

// Dibuja el paisaje de un mundo: astro, tres capas de colinas (SVG) y partículas. Los colores
// no están acá: salen de las variables CSS que escribe `aplicarMundo`, así cambiar de mundo o
// de cielo no obliga a volver a dibujar.

export interface OpcionesPaisaje {
  /** Las capas se desplazan y las partículas se mueven. Apagado: paisaje quieto. */
  animado: boolean
  /** Luciérnagas (noche) o destellos (día). Solo se dibujan si además está animado. */
  particulas: boolean
  cielo: Cielo
  /** Alto contraste: sin paisaje, fondo liso. */
  apagarTodo?: boolean
}

/** Qué opciones pide el alumno en Ajustes (o el sistema con «reducir movimiento»). */
export function opcionesDesdeAjustes(a: Readonly<Ajustes>, sistemaReduce: boolean, cielo: Cielo): OpcionesPaisaje {
  const animado = !a.reducirMovimiento && !sistemaReduce && a.fondoDecorativo
  return { animado, particulas: animado, cielo, apagarTodo: a.altoContraste }
}

const NS = 'http://www.w3.org/2000/svg'
const N_LUCIERNAGAS = 12
const N_DESTELLOS = 8

/** Contorno de una colina: ondas suaves entre las alturas `a` (cresta) y `b` (valle). */
export function ondas(a: number, b: number): string {
  let d = `M0 200 L0 ${a}`
  for (let i = 0; i <= 10; i++) d += ` Q ${i * 100 + 50} ${i % 2 ? b : a - 60} ${i * 100 + 100} ${a}`
  return d + ' L1000 200 Z'
}

// [altura de la capa en %, segundos por vuelta, cresta, valle]; de la más lejana a la más cercana.
const CAPAS: [number, number, number, number][] = [[46, 60, 110, 40], [36, 38, 120, 60], [24, 24, 130, 80]]

function capa(i: number, animado: boolean): HTMLElement {
  const [alto, seg, a, b] = CAPAS[i]!
  const d = document.createElement('div')
  d.className = `pa-colina pa-c${i + 1}` + (animado ? '' : ' quieto')
  d.style.height = alto + '%'
  d.style.setProperty('--t', seg + 's')
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 1000 200')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS(NS, 'path')
  p.setAttribute('d', ondas(a, b))
  svg.appendChild(p)
  d.appendChild(svg)
  return d
}

function particula(clase: string, i: number, n: number): HTMLElement {
  const d = document.createElement('div')
  d.className = clase
  // Posiciones fijas por índice (sin azar): el paisaje se ve igual cada vez y es comprobable.
  d.style.left = `${(i * 41) % 96}%`
  d.style.top = `${35 + ((i * 29) % 55)}%`
  d.style.setProperty('--d', `${3 + (i % 5)}s`)
  d.style.animationDelay = `${-(i * 0.7).toFixed(1)}s`
  d.dataset['n'] = String(n)
  return d
}

/** Monta el paisaje del `mundo` en `el`. Devuelve la función que lo desmonta. */
export function montarPaisaje(el: HTMLElement, mundo: Mundo, op: OpcionesPaisaje): () => void {
  el.replaceChildren()
  el.classList.remove('liso')
  el.classList.add('paisaje')
  el.dataset['mundo'] = mundo.id
  el.dataset['cielo'] = op.cielo

  if (op.apagarTodo) {
    el.classList.add('liso')
  } else {
    const astro = document.createElement('div')
    astro.className = 'pa-astro ' + (op.cielo === 'dia' ? 'pa-sol' : 'pa-luna')
    el.appendChild(astro)
    for (let i = 0; i < CAPAS.length; i++) el.appendChild(capa(i, op.animado))
    if (op.animado && op.particulas) {
      const [clase, n] = op.cielo === 'dia' ? ['pa-destello', N_DESTELLOS] as const : ['pa-luci', N_LUCIERNAGAS] as const
      for (let i = 0; i < n; i++) el.appendChild(particula(clase, i, n))
    }
  }

  return () => {
    el.replaceChildren()
    el.classList.remove('paisaje', 'liso')
    delete el.dataset['mundo']
    delete el.dataset['cielo']
  }
}

/** Con la pestaña oculta las animaciones del fondo se pausan (batería y CPU en tablets de escuela). */
export function iniciarPausaPorVisibilidad(): void {
  const aplicar = (): void => { document.documentElement.classList.toggle('pestana-oculta', document.hidden) }
  document.addEventListener('visibilitychange', aplicar)
  aplicar()
}
