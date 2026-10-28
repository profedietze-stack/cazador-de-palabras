import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Sin CSP, el XSS de «Mis salas» corria sin freno y podia mandar la clave del
// docente a cualquier dominio. Las cabeceras viven en vercel.json.
const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
}
const h = Object.fromEntries(cfg.headers.flatMap(x => x.headers).map(x => [x.key.toLowerCase(), x.value]))

describe('cabeceras de seguridad de Vercel', () => {
  it('define CSP, nosniff, Referrer-Policy y Permissions-Policy', () => {
    for (const k of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
      expect(h[k], k).toBeTruthy()
    }
  })

  it('la CSP no permite scripts inline ni externos y prohíbe el enmarcado', () => {
    const csp = h['content-security-policy']!
    expect(csp).toMatch(/script-src 'self'(;|$)/)
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
  })

  it('solo se conecta al propio sitio y al backend conocido', () => {
    const connect = h['content-security-policy']!.match(/connect-src ([^;]+)/)![1]!
    expect(connect.split(' ').sort()).toEqual(
      ["'self'", 'https://aulaplay.duckdns.org', 'wss://aulaplay.duckdns.org'].sort(),
    )
  })

  it('index.html no tiene scripts inline ni manejadores on*', () => {
    const html = readFileSync('index.html', 'utf8')
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>/g)]
    expect(inline).toHaveLength(0)
    expect(html).not.toMatch(/\son[a-z]+\s*=/i)
  })
})
