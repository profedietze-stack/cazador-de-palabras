import { ajustes, patronVibracion, type EventoVibracion } from '../storage/ajustes'

// Vibración del dispositivo (Vibration API). Safari en iPhone y iPad no la tiene:
// ahí `vibrar` no hace nada y el panel de ajustes lo avisa.

export function vibracionDisponible(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrar(evento: EventoVibracion): void {
  if (!vibracionDisponible() || document.hidden) return
  const patron = patronVibracion(ajustes(), evento)
  if (!patron) return
  try { navigator.vibrate(patron) } catch { /* algunos navegadores la bloquean sin gesto previo */ }
}

/** Para el botón «Probar»: ignora los interruptores por evento, respeta intensidad. */
export function probarVibracion(): void {
  if (!vibracionDisponible()) return
  const patron = patronVibracion({ ...ajustes(), vibracion: true, vibCombo: true }, 'combo')
  try { if (patron) navigator.vibrate(patron) } catch { /* ver arriba */ }
}
