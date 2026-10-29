import { G } from './state'

let _alSalirSinTocar: ((el: HTMLElement) => void) | null = null
export function setAlSalirSinTocar(fn: typeof _alSalirSinTocar): void {
  _alSalirSinTocar = fn
}

export function animarCaida(el: HTMLElement, size: number): void {
  const area = document.getElementById('gameArea')!
  const areaHeight = area.clientHeight
  let y = -60
  const speed = (1.2 + Math.random() * 2) * G.velocidadBase
  const grande = size > 26
  const reducir = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  let osc = 0
  const startX = parseFloat(el.style.left)
  const amplitud = grande && !reducir ? 18 : 0

  const raf = (): void => {
    if (!G.activo || !el.parentElement) return
    if (G.pausado) { (el as any)._rafId = requestAnimationFrame(raf); return }

    y += speed
    osc += 2.5
    el.style.top = y + 'px'

    // Sin rotación: era ilegible y marea. La oscilación lateral se apaga con
    // prefers-reduced-motion.
    if (amplitud > 0) {
      el.style.left = (startX + Math.sin(osc * Math.PI / 180) * amplitud) + 'px'
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
