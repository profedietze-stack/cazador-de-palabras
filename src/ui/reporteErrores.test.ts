import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { limpiarMensaje } from './reporteErrores'

describe('reporte anónimo de errores', () => {
  it('acota el mensaje y esconde las URL (pueden llevar parámetros)', () => {
    expect(limpiarMensaje('falló https://x.test/a?sala=ABC123&n=Ana al cargar')).toBe('falló <url> al cargar')
    expect(limpiarMensaje('x'.repeat(900))).toHaveLength(200)
    expect(limpiarMensaje('a\nb')).toBe('a b')
  })

  it('el cuerpo no lleva nombre, sala, código ni identificadores', () => {
    const src = readFileSync('src/ui/reporteErrores.ts', 'utf8')
    const cuerpo = src.slice(src.indexOf('const cuerpo = JSON.stringify'), src.indexOf('// text/plain'))
    expect(cuerpo).not.toMatch(/jugador|nombre|sala|code|G\./i)
    expect(Object.keys({ m: 1, f: 1, l: 1, d: 1 })).toEqual(['m', 'f', 'l', 'd'])
  })

  it('tope por sesión y nunca desde localhost', () => {
    const src = readFileSync('src/ui/reporteErrores.ts', 'utf8')
    expect(src).toContain('MAX_POR_SESION = 3')
    expect(src).toMatch(/localhost/)
  })

  it('el banner de errores lo usa', () => {
    expect(readFileSync('src/ui/ErrorBanner.ts', 'utf8')).toContain('reportarError(')
  })

  it('la CSP deja conectar al servidor de duelos (donde va el reporte)', () => {
    expect(readFileSync('vercel.json', 'utf8')).toContain('connect-src')
    expect(readFileSync('vercel.json', 'utf8')).toContain('https://aulaplay.duckdns.org')
  })
})
