import { reducirMovimientoActivo } from '../utils/movimiento'

/**
 * La flecha que vuela desde abajo hasta la palabra que el alumno tocó. Es solo un efecto: el
 * puntaje, el combo y el resto de la lógica no esperan a que llegue (GameEngine.cazarPalabra).
 */

export interface PlanFlecha {
  /** Desde dónde sale (fuera del área, abajo) y a dónde llega, en px del área de juego. */
  ox: number; oy: number; tx: number; ty: number
  /** Grados respecto de la vertical, positivo hacia la derecha: es la dirección del vuelo. */
  angulo: number
  /** Inclinación extra, en grados, con que queda temblando al clavarse. */
  ladeo: number
  /** Duración del vuelo en ms. */
  ms: number
}

export interface CajaPalabra { x: number; y: number; w: number; h: number }

export const MS_VUELO_MIN = 170
export const MS_VUELO_MAX = 260
/** Inclinación máxima del vuelo respecto de la vertical, en grados. */
export const MAX_ANGULO = 24

/**
 * Trayectoria de una flecha. El punto de salida y la inclinación con que queda cambian cada vez,
 * así que dos flechas seguidas no se clavan igual. `azar` se pasa para poder probarla sin azar.
 */
export function planearFlecha(
  ancho: number, alto: number, palabra: CajaPalabra, azar: () => number = Math.random,
): PlanFlecha {
  // Apunta al cuerpo de la palabra, no siempre al centro exacto.
  const tx = palabra.x + palabra.w * (0.35 + azar() * 0.3)
  const ty = palabra.y + palabra.h * (0.4 + azar() * 0.2)
  // Sale de abajo, un poco hacia el lado de la palabra, con algo de desvío.
  const oy = alto + 30
  let ox = Math.min(ancho + 20, Math.max(-20, ancho / 2 + (tx - ancho / 2) * 0.4 + (azar() - 0.5) * 90))
  // Una palabra baja y lejos del centro no se alcanza desde muy de costado: la flecha sube casi derecha.
  const maxDx = Math.tan(MAX_ANGULO * Math.PI / 180) * (oy - ty)
  ox = Math.min(tx + maxDx, Math.max(tx - maxDx, ox))
  const angulo = Math.atan2(tx - ox, oy - ty) * 180 / Math.PI
  const ladeo = (azar() - 0.5) * 8
  const dist = Math.hypot(tx - ox, oy - ty)
  const ms = Math.round(Math.min(MS_VUELO_MAX, Math.max(MS_VUELO_MIN, 150 + dist * 0.12)))
  return { ox, oy, tx, ty, angulo, ladeo, ms }
}

// Punta hacia arriba en (6, 0): el punto de la palabra al que apunta.
const FLECHA_SVG =
  '<svg viewBox="0 0 12 64" width="15" height="80" focusable="false" aria-hidden="true">' +
  '<polygon points="6,0 10.2,13 6,10.6 1.8,13" fill="#e3eaee" stroke="#37474f" stroke-width=".8" stroke-linejoin="round"/>' +
  '<rect x="5.1" y="10" width="1.8" height="43" rx=".6" fill="#b08968" stroke="#4e342e" stroke-width=".5"/>' +
  '<polygon points="5.1,45 .8,55 .8,62 5.1,54" fill="#ef5350" stroke="#7f1d1d" stroke-width=".5" stroke-linejoin="round"/>' +
  '<polygon points="6.9,45 11.2,55 11.2,62 6.9,54" fill="#ef5350" stroke="#7f1d1d" stroke-width=".5" stroke-linejoin="round"/>' +
  '</svg>'

function giro(x: number, y: number, grados: number): string {
  return `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${grados.toFixed(1)}deg)`
}

/**
 * Lanza la flecha hacia la palabra `el` (hija suya: sigue a la palabra cuando ésta sube y se
 * desvanece, y se borra con ella). Si es de un acierto se clava y tiembla; si es un error,
 * rebota y cae. Devuelve cuántos ms tarda en llegar (0 si no hay vuelo: menos movimiento).
 */
export function lanzarFlecha(el: HTMLElement, area: HTMLElement, esOk: boolean): number {
  const a = area.getBoundingClientRect(), r = el.getBoundingClientRect()
  const px = r.left - a.left, py = r.top - a.top
  const plan = planearFlecha(
    area.clientWidth || a.width, area.clientHeight || a.height,
    { x: px, y: py, w: r.width, h: r.height },
  )
  // La palabra puede estar achicada al entrar; la flecha vive en su espacio sin escalar.
  const s = el.offsetWidth > 0 && r.width > 0 ? r.width / el.offsetWidth : 1

  const f = document.createElement('div')
  f.className = 'flecha'
  f.setAttribute('aria-hidden', 'true')
  f.innerHTML = FLECHA_SVG   // constante propia, sin texto de nadie
  f.style.left = ((plan.tx - px) / s) + 'px'
  f.style.top = ((plan.ty - py) / s) + 'px'
  el.appendChild(f)

  const ang = plan.angulo
  if (reducirMovimientoActivo() || typeof f.animate !== 'function') {
    // Sin vuelo: queda clavada (o caída, si fue un error) de una vez.
    f.style.transform = esOk ? giro(0, 0, ang + plan.ladeo) : giro(-10, 18, ang - 60)
    if (!esOk) f.style.opacity = '.5'
    return 0
  }

  const dx = (plan.ox - plan.tx) / s, dy = (plan.oy - plan.ty) / s
  const post = esOk ? 220 : 300
  const total = plan.ms + post
  const f1 = plan.ms / total
  const en = (p: number): number => f1 + (1 - f1) * p
  const frames: Keyframe[] = esOk
    ? [
        { offset: 0, transform: giro(dx, dy, ang), opacity: 1, easing: 'cubic-bezier(.35,0,.85,.65)' },
        { offset: f1, transform: giro(0, 0, ang), opacity: 1, easing: 'ease-out' },
        { offset: en(0.25), transform: giro(0, 0, ang + plan.ladeo * 1.6), opacity: 1, easing: 'ease-in-out' },
        { offset: en(0.55), transform: giro(0, 0, ang + plan.ladeo * 0.3), opacity: 1, easing: 'ease-in-out' },
        { offset: 1, transform: giro(0, 0, ang + plan.ladeo), opacity: 1 },
      ]
    : [
        { offset: 0, transform: giro(dx, dy, ang), opacity: 1, easing: 'cubic-bezier(.35,0,.85,.65)' },
        { offset: f1, transform: giro(0, 0, ang), opacity: 1, easing: 'ease-out' },
        { offset: en(0.3), transform: giro(-8, -10, ang - 28), opacity: 1, easing: 'ease-in' },
        { offset: 1, transform: giro(-20, 34, ang - 80), opacity: 0 },
      ]
  f.animate(frames, { duration: total, fill: 'forwards' })
  return plan.ms
}
