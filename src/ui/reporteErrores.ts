// Reporte anónimo de errores del cliente (observabilidad mínima, ING-9).
//
// El banner de errores solo lo ve quien tiene el problema delante; el docente no
// puede depurar nada y nadie se entera de lo que falla en otras tablets. Esto manda
// al servidor SOLO: el mensaje del error (acotado), el archivo, la línea y si la
// pantalla es de celular o de escritorio. Nada del alumno: ni nombre, ni sala, ni
// código, ni identificadores. Máximo 3 reportes por sesión y nunca desde localhost.

const URL_REPORTE = 'https://aulaplay.duckdns.org/duel/report'
const MAX_POR_SESION = 3
let enviados = 0

export function limpiarMensaje(v: unknown): string {
  return String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/https?:\/\/\S+/g, '<url>').slice(0, 200)
}

export function reportarError(mensaje: unknown, archivo?: string, linea?: number): void {
  try {
    if (enviados >= MAX_POR_SESION) return
    if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return
    enviados++
    const cuerpo = JSON.stringify({
      m: limpiarMensaje(mensaje),
      f: (archivo ?? '').split('/').pop()?.split('?')[0]?.slice(0, 80) ?? '',
      l: Number.isFinite(linea) ? linea : 0,
      d: window.innerWidth < 600 ? 'm' : 'd',
    })
    // text/plain: no dispara el preflight de CORS y sendBeacon no espera respuesta.
    navigator.sendBeacon?.(URL_REPORTE, new Blob([cuerpo], { type: 'text/plain' }))
  } catch { /* reportar nunca puede romper el juego */ }
}
