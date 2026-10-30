// Inventario de los emojis que usa el juego (código, estilos e index.html, sin tests).
//
// Sirve para dos cosas: preparar los archivos de public/emoji (tools/preparar-assets.mjs)
// y comprobar en un test que ninguno falte ni sobre (src/assets.test.ts).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const RE_EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*/gu

/** Código de archivo: puntos de código en minúscula unidos por «-», sin la variación U+FE0F. */
export function codigoDeArchivo(emoji) {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(c => c !== 'fe0f')
    .join('-')
}

function archivos(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) archivos(p, acc)
    else acc.push(p.split(sep).join('/'))
  }
  return acc
}

/** Cada emoji distinto (por su archivo) que aparece en el juego, en orden de aparición. */
export function emojisUsados(raiz = '.') {
  const fuentes = [
    ...archivos(join(raiz, 'src')).filter(f => /\.(ts|css)$/.test(f) && !/\.test\.ts$/.test(f)),
    join(raiz, 'index.html').split(sep).join('/'),
  ]
  const vistos = new Map()
  for (const f of fuentes) {
    for (const m of readFileSync(f, 'utf8').matchAll(RE_EMOJI)) {
      const e = m[0]
      if (e.codePointAt(0) <= 0xff) continue   // © ® ™ no son emojis del juego
      const codigo = codigoDeArchivo(e)
      if (!vistos.has(codigo)) vistos.set(codigo, e)
    }
  }
  return [...vistos.values()]
}
