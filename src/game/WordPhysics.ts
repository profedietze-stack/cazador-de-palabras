import { G } from './state'

export function animarCaida(el: HTMLElement, size: number): void {
  const area = document.getElementById('gameArea')!
  const areaHeight = area.clientHeight
  let y = -60
  const speed = (1.2 + Math.random() * 2) * G.velocidadBase
  const grande = size > 22
  let osc = 0
  const startX = parseFloat(el.style.left)
  const amplitud = grande ? 18 : 0
  const rotDir = Math.random() > 0.5 ? 1 : -1

  const raf = (): void => {
    if (!G.activo || !el.parentElement) return
    if (G.pausado) { (el as any)._rafId = requestAnimationFrame(raf); return }

    y += speed
    osc += 2.5
    el.style.top = y + 'px'

    if (grande) {
      el.style.left = (startX + Math.sin(osc * Math.PI / 180) * amplitud) + 'px'
    } else if (size < 15) {
      el.style.transform = `rotate(${osc * rotDir}deg)`
    }

    if (y > areaHeight + 20) { el.remove(); return }
    ;(el as any)._rafId = requestAnimationFrame(raf)
  }
  ;(el as any)._rafId = requestAnimationFrame(raf)
}
