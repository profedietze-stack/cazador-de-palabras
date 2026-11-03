import { G } from './state'
import { reducirMovimientoActivo } from '../utils/movimiento'
import { avanzar, balanceo, entrada, aplicarPosicion, lanzarAterrizaje, aterrizajeDe, lineaDeAterrizaje, debeHundirse, yDelChapuzon, DT_MAX_MS } from './caida'

/** Cada cuántos ms se vuelve a medir el área de juego y la escena. */
export const REMEDIR_MS = 400

let _alSalirSinTocar: ((el: HTMLElement) => void) | null = null
export function setAlSalirSinTocar(fn: typeof _alSalirSinTocar): void {
  _alSalirSinTocar = fn
}

/** Línea de aterrizaje (en px desde arriba del área de juego): la orilla del agua o el suelo de la escena, donde se pierde la palabra que se escapa. */
function lineaDelAgua(area: HTMLElement): number {
  const top = lineaDeAterrizaje('#gameScreen')
  const alto = area.clientHeight
  if (top === null) return alto * 0.78
  const y = top - area.getBoundingClientRect().top
  return Math.min(alto, Math.max(alto * 0.6, y))
}

export function animarCaida(el: HTMLElement, size: number): void {
  const area = document.getElementById('gameArea')!
  // Alto del área, línea de aterrizaje y tipo de escena se vuelven a medir cada tanto: la primera
  // palabra nace mientras el juego pasa a pantalla completa y se monta el fondo, y con lo que se
  // veía en ese instante se hundía «en el agua» casi arriba de todo, sin hojas ni escena.
  let areaHeight = area.clientHeight
  let agua = lineaDelAgua(area)
  let aterrizaje = aterrizajeDe('#gameScreen')
  let medidoEn = 0
  const remedir = (): void => {
    areaHeight = area.clientHeight
    agua = lineaDelAgua(area)
    aterrizaje = aterrizajeDe('#gameScreen')
  }
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
    if (ahora - medidoEn >= REMEDIR_MS) { medidoEn = ahora; remedir() }
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
    if (!hundida && debeHundirse(y, agua) && el.dataset.cazada !== '1') {
      // Medida fresca justo antes de decidir: si el área todavía se estaba acomodando, no se hunde.
      remedir()
      if (!debeHundirse(y, agua)) { (el as any)._rafId = requestAnimationFrame(raf); return }
      hundida = true
      el.classList.add('se-hunde')
      lanzarAterrizaje(area, (parseFloat(el.style.left) || 0) + dx + el.offsetWidth / 2, yDelChapuzon(y, el.offsetHeight), aterrizaje)
    }

    if (areaHeight > 0 && y > areaHeight + 20) {
      if (el.dataset.cazada !== '1') _alSalirSinTocar?.(el)
      el.remove()
      return
    }
    ;(el as any)._rafId = requestAnimationFrame(raf)
  }
  ;(el as any)._rafId = requestAnimationFrame(raf)
}
