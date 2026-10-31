import type { Mundo } from '../data/mundos'
import type { Cielo } from './aplicarAjustes'

/** Escribe en <html> las variables CSS del mundo activo (la paleta de su cielo). */
export function aplicarMundo(mundo: Mundo, cielo: Cielo): void {
  const p = mundo[cielo]
  const s = document.documentElement.style
  s.setProperty('--cielo-alto', p.cieloAlto)
  s.setProperty('--cielo-bajo', p.cieloBajo)
  s.setProperty('--colina-1', p.colinas[0])
  s.setProperty('--colina-2', p.colinas[1])
  s.setProperty('--colina-3', p.colinas[2])
  s.setProperty('--acento', p.acento)
  s.setProperty('--agua', p.agua)
  s.setProperty('--astro', p.astro)
}
