// Observabilidad mínima del servidor de duelos, sin datos personales.
//
// Antes no había forma de saber en producción qué fallaba: `/duel/health` colgaba
// (el servidor HTTP no tenía ningún manejador), había seis `console.*` en todo el
// servidor y los errores del cliente solo los veía quien tenía la consola abierta.
// Nadie se hubiera enterado de que nadie podía unirse a un duelo (UX-1).
//
// Qué NO se registra: nombres de alumnos, IPs, tokens ni códigos de aula. Solo
// contadores y la razón de cada fin de duelo.

import type { IncomingMessage, ServerResponse } from 'http'

const arranque = Date.now()

export const contadores: Record<string, number> = {}

/** Suma 1 al contador y, si `datos`, escribe una línea JSON (fácil de grepear en `docker logs`). */
export function contar(evento: string, datos?: Record<string, string | number>): void {
  contadores[evento] = (contadores[evento] ?? 0) + 1
  if (datos) console.log(JSON.stringify({ t: new Date().toISOString(), ev: evento, ...datos }))
}

/** Limita lo que se acepta del cliente: texto corto, sin saltos de línea ni comillas raras. */
export function limpiarTexto(v: unknown, max: number): string {
  return String(typeof v === 'string' ? v : '').replace(/[\r\n\t]+/g, ' ').replace(/[<>"`]/g, '').slice(0, max)
}

const MAX_BODY = 1024
const MAX_REPORTES_POR_MINUTO = 20

export interface EstadoServidor {
  salas: () => number
  sockets: () => number
}

export function crearManejadorHttp(estado: EstadoServidor, ipDe: (req: IncomingMessage) => string) {
  const ventanas = new Map<string, { desde: number; n: number }>()

  const json = (res: ServerResponse, codigo: number, cuerpo: unknown): void => {
    res.writeHead(codigo, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(cuerpo))
  }

  return (req: IncomingMessage, res: ServerResponse): void => {
    const ruta = (req.url ?? '').split('?')[0]

    if (req.method === 'GET' && ruta === '/health') {
      json(res, 200, {
        ok: true,
        uptimeSeg: Math.round((Date.now() - arranque) / 1000),
        salas: estado.salas(),
        sockets: estado.sockets(),
        contadores,
      })
      return
    }

    if (req.method === 'POST' && ruta === '/report') {
      const ip = ipDe(req)
      const ahora = Date.now()
      const v = ventanas.get(ip)
      if (!v || ahora - v.desde > 60_000) ventanas.set(ip, { desde: ahora, n: 1 })
      else if (++v.n > MAX_REPORTES_POR_MINUTO) { json(res, 429, { ok: false }); return }
      if (ventanas.size > 5000) ventanas.clear()   // memoria acotada

      let cuerpo = ''
      let abortado = false
      req.on('data', (c: Buffer) => {
        cuerpo += c.toString('utf8')
        if (cuerpo.length > MAX_BODY && !abortado) { abortado = true; json(res, 413, { ok: false }); req.destroy() }
      })
      req.on('end', () => {
        if (abortado) return
        try {
          const d = JSON.parse(cuerpo) as Record<string, unknown>
          contar('error_cliente', {
            m: limpiarTexto(d['m'], 200),
            f: limpiarTexto(d['f'], 80),
            l: Number.isFinite(Number(d['l'])) ? Number(d['l']) : 0,
            d: d['d'] === 'm' ? 'm' : 'd',
          })
        } catch { contar('error_cliente_ilegible') }
        res.writeHead(204)
        res.end()
      })
      return
    }

    json(res, 404, { ok: false })
  }
}
