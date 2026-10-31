// Preparación ÚNICA de los assets propios del juego (ejecutar a mano, no forma parte del build):
//
//   node tools/preparar-assets.mjs
//
// - Emojis: Fluent 3D de Microsoft (licencia MIT), paquete npm @lobehub/fluent-emoji-3d@1.1.0.
//   Se baja solo el subconjunto que el juego usa (tools/emoji-inventario.mjs), se reduce a
//   128×128 y se guarda en public/emoji/. «sharp» se instala en una carpeta temporal fuera
//   del repo: no es una dependencia del juego.
// - Tipografías: Lilita One (títulos), Baloo 2 (texto) y Almendra SC (título del juego), licencia OFL, subconjunto «latin»
//   de Google Fonts, guardadas como woff2 en public/fonts/.
//
// Nada de esto se pide en tiempo de ejecución: el juego usa los archivos copiados.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { codigoDeArchivo, emojisUsados } from './emoji-inventario.mjs'

const PAQUETE = 'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/'
const LADO = 128
const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const temporal = mkdtempSync(join(tmpdir(), 'cdp-assets-'))
try {
  // 1 · sharp, fuera del repo
  execFileSync('npm', ['install', '--prefix', temporal, 'sharp', '--no-audit', '--no-fund', '--loglevel=error'], { stdio: 'inherit', shell: true })
  const sharp = createRequire(join(temporal, 'x.js'))('sharp')

  // 2 · emojis
  const destino = 'public/emoji'
  mkdirSync(destino, { recursive: true })
  for (const f of readdirSync(destino)) rmSync(join(destino, f))
  const faltan = []
  for (const e of emojisUsados()) {
    const c = codigoDeArchivo(e)
    let datos = null
    for (const nombre of [c, c + '-fe0f']) {
      const r = await fetch(`${PAQUETE}${nombre}.webp`)
      if (r.ok) { datos = Buffer.from(await r.arrayBuffer()); break }
    }
    if (!datos) { faltan.push(e + ' ' + c); continue }
    const out = await sharp(datos).resize(LADO, LADO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 80, effort: 6 }).toBuffer()
    writeFileSync(join(destino, c + '.webp'), out)
  }
  if (faltan.length) { console.error('SIN ARCHIVO EN FLUENT 3D:\n' + faltan.join('\n')); process.exitCode = 1 }

  // 3 · tipografías (subconjunto latin)
  mkdirSync('public/fonts', { recursive: true })
  const fuentes = [
    ['Lilita+One', 'lilita-one-latin.woff2'],
    ['Baloo+2:wght@400..800', 'baloo-2-latin.woff2'],
    ['Almendra+SC', 'almendra-sc-latin.woff2'],
  ]
  for (const [familia, archivo] of fuentes) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}&display=swap`, { headers: { 'User-Agent': UA_CHROME } })).text()
    const bloque = css.split('/* latin */')[1]
    const url = bloque && /url\((https:[^)]+\.woff2)\)/.exec(bloque)?.[1]
    if (!url) throw new Error('no encontré el subconjunto latin de ' + familia)
    writeFileSync(join('public/fonts', archivo), Buffer.from(await (await fetch(url)).arrayBuffer()))
  }
  console.log('listo:', readdirSync('public/emoji').length, 'emojis,', readdirSync('public/fonts').length, 'fuentes')
} finally {
  // En Windows la DLL de sharp sigue cargada hasta que termina el proceso: si no se puede
  // borrar ahora, se avisa y queda para borrar a mano (está fuera del repo).
  try { rmSync(temporal, { recursive: true, force: true }) } catch { console.warn('borrar a mano:', temporal) }
}
