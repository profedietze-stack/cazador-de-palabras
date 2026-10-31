import { G } from './state'
import { reducirMovimientoActivo } from '../utils/movimiento'
import { avanzar, balanceo, entrada, aplicarPosicion, lanzarChapuzon, DT_MAX_MS } from './caida'

let _alSalirSinTocar: ((el: HTMLElement) => void) | null = null
export function setAlSalirSinTocar(fn: typeof _alSalirSinTocar): void {
  _alSalirSinTocar = fn
}

/** Línea del agua (en px desde arriba del área de juego): ahí se hunde la palabra que se escapa. */
function lineaDelAgua(area: HTMLElement): number {
  const agua = document.querySelector('#gameScreen .pa-agua')
  const alto = area.clientHeight
  if (!agua) return alto * 0.86
  const y = agua.getBoundingClientRect().top - area.getBoundingClientRect().top
  return Math.min(alto, Math.max(alto * 0.7, y))
}

export function animarCaida(el: HTMLElement, size: number): void {
  const area = document.getElementById('gameArea')!
  const areaHeight = area.clientHeight
  const agua = lineaDelAgua(area)
  let y = -60
  // Misma velocidad de siempre: antes era «px por fotograma», ahora «px por segundo» (× 60), para
  // que caiga igual en pantallas de 60, 120 o 144 Hz.
  const pxPorSeg = (1.2 + Math.random() * 2) * G.velocidadBase * 60
  const reducir = reducirMovimientoActivo()
  // Todas se balancean un poco (las más grandes, más); sin giros: ±3° como máximo.
  const amplitud = reducir ? 0 : Math.min(16, 6 + Math.max(0, size - 18) * 0.35)
  const inclinacion = reducir ? 0 : 3
  const frecuencia = 1.1 + Math.random() * 0.9   // radianes por segundo
  let fase = Math.random() * Math.PI * 2
  let ultimo: number | null = null
  let entrando = true
  let hundida = false

  // Antes del primer fotograma, para que no se vea un instante en (0, 0).
  aplicarPosicion(el, { y, escala: entrada(y).escala })
  el.style.opacity = '0'

  const raf = (ahora: number): void => {
    if (!G.activo || !el.parentElement) return
    if (G.pausado) { ultimo = null; (el as any)._rafId = requestAnimationFrame(raf); return }

    const dt = ultimo === null ? 1000 / 60 : ahora - ultimo
    ultimo = ahora
    y = avanzar(y, pxPorSeg, dt)
    fase += Math.min(Math.max(dt, 0), DT_MAX_MS) / 1000 * frecuencia

    const { dx, rot } = balanceo(fase, amplitud, inclinacion)
    const e = entrada(y)
    aplicarPosicion(el, { x: dx, y, rot, escala: e.escala })
    if (entrando) {
      el.style.opacity = String(e.opacidad)
      if (e.opacidad >= 1) { entrando = false; el.style.opacity = '' }
    }

    // Cae en la laguna: se hunde con una onda. La lógica del juego no cambia: sigue contando como
    // «se escapó» recién al salir por abajo, como siempre.
    if (!hundida && y >= agua - 30 && el.dataset.cazada !== '1') {
      hundida = true
      el.classList.add('se-hunde')
      lanzarChapuzon(area, (parseFloat(el.style.left) || 0) + dx + el.offsetWidth / 2, agua)
    }

    if (y > areaHeight + 20) {
      if (el.dataset.cazada !== '1') _alSalirSinTocar?.(el)
      el.remove()
      return
    }
    ;(el as any)._rafId = requestAnimationFrame(raf)
  }
  ;(el as any)._rafId = requestAnimationFrame(raf)
}
