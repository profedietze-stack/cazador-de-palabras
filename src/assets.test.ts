import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { emojisUsados, codigoDeArchivo } from '../tools/emoji-inventario.mjs'

// Los emojis y las tipografías son archivos propios (sin CDN): el juego tiene que
// arrancar sin internet y un CDN se entera de qué chico abrió qué juego.

const DIR_EMOJI = 'public/emoji'
const DIR_FUENTES = 'public/fonts'
const KB = 1024

const pesoDe = (dir: string): number =>
  existsSync(dir) ? readdirSync(dir).reduce((a, f) => a + statSync(join(dir, f)).size, 0) : 0

/** Ancho y alto de un webp (VP8X, VP8 o VP8L). */
function dimensionesWebp(b: Buffer): [number, number] {
  const tipo = b.toString('ascii', 12, 16)
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  const v = b.readUInt32LE(21)
  return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]
}

describe('assets propios', () => {
  const usados = emojisUsados()

  it('el juego usa emojis (el inventario no está vacío)', () => {
    expect(usados.length).toBeGreaterThan(50)
  })

  it('cada emoji usado tiene su archivo en public/emoji', () => {
    const faltan = usados.filter(e => !existsSync(join(DIR_EMOJI, codigoDeArchivo(e) + '.webp')))
    expect(faltan).toEqual([])
  })

  it('no hay archivos de emoji que el juego no use', () => {
    const esperados = new Set(usados.map(e => codigoDeArchivo(e) + '.webp'))
    const sobran = existsSync(DIR_EMOJI) ? readdirSync(DIR_EMOJI).filter(f => !esperados.has(f)) : []
    expect(sobran).toEqual([])
  })

  it('cada emoji es un webp de 144×144 como máximo', () => {
    if (!existsSync(DIR_EMOJI)) return expect(existsSync(DIR_EMOJI)).toBe(true)
    for (const f of readdirSync(DIR_EMOJI)) {
      const b = readFileSync(join(DIR_EMOJI, f))
      expect(b.toString('ascii', 0, 4), f).toBe('RIFF')
      expect(b.toString('ascii', 8, 12), f).toBe('WEBP')
      const [w, h] = dimensionesWebp(b)
      expect(Math.max(w, h), f).toBeLessThanOrEqual(144)
    }
  })

  it('los emojis pesan 250 kB o menos', () => {
    expect(pesoDe(DIR_EMOJI)).toBeLessThanOrEqual(250 * KB)
    expect(pesoDe(DIR_EMOJI)).toBeGreaterThan(0)
  })

  it('las tres tipografías existen y pesan 90 kB o menos entre todas', () => {
    expect(existsSync(join(DIR_FUENTES, 'lilita-one-latin.woff2'))).toBe(true)
    expect(existsSync(join(DIR_FUENTES, 'baloo-2-latin.woff2'))).toBe(true)
    expect(existsSync(join(DIR_FUENTES, 'almendra-sc-latin.woff2'))).toBe(true)
    expect(pesoDe(DIR_FUENTES)).toBeLessThanOrEqual(90 * KB)
  })
})
