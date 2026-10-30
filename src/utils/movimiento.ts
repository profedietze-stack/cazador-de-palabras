import { ajustes } from '../storage/ajustes'

/**
 * Menos movimiento: lo pide el sistema (prefers-reduced-motion) o el alumno en
 * Ajustes. El sistema siempre se respeta; el ajuste solo puede sumar.
 */
export function reducirMovimientoActivo(): boolean {
  if (ajustes().reducirMovimiento) return true
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
