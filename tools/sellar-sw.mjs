// Sella el service worker con lo que el build realmente produjo (ver public/sw.js).
//
//  - __PRECACHE__   -> lista de los archivos de dist/ (rutas relativas al scope);
//  - __CACHE_NAME__ -> `cdp-` + huella SHA-256 del contenido de esos archivos.
//
// Si cambia cualquier archivo cambia el nombre de la caché, y el service worker
// nuevo borra la vieja al activarse: el arreglo le llega a las tablets que ya
// tienen el juego instalado sin que nadie tenga que acordarse de nada.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Archivos que NO se precachean: el propio sw y los mapas de fuente. */
const excluir = (ruta) => ruta === 'sw.js' || ruta.endsWith('.map')

export function listarArchivos(dir, base = dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) listarArchivos(p, base, acc)
    else {
      const ruta = relative(base, p).split(sep).join('/')
      if (!excluir(ruta)) acc.push({ ruta, contenido: readFileSync(p) })
    }
  }
  return acc.sort((a, b) => (a.ruta < b.ruta ? -1 : 1))
}

export function huella(archivos) {
  const h = createHash('sha256')
  for (const a of archivos) {
    h.update(a.ruta)
    h.update('\0')
    h.update(a.contenido)
    h.update('\0')
  }
  return h.digest('hex').slice(0, 10)
}

export function sellar(textoSw, archivos) {
  if (!textoSw.includes('__CACHE_NAME__') || !textoSw.includes('__PRECACHE__')) {
    throw new Error('sw.js no tiene los marcadores __CACHE_NAME__ y __PRECACHE__')
  }
  const lista = ['./', ...archivos.map((a) => './' + a.ruta)]
  return textoSw
    .replace("'__CACHE_NAME__'", JSON.stringify('cdp-' + huella(archivos)))
    .replace('__PRECACHE__', JSON.stringify(lista))
}

/** Plugin de Vite: corre al terminar el build y reescribe dist/sw.js. */
export function sellarServiceWorker() {
  let outDir = 'dist'
  return {
    name: 'sellar-service-worker',
    apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir },
    closeBundle() {
      const ruta = join(outDir, 'sw.js')
      const sellado = sellar(readFileSync(ruta, 'utf8'), listarArchivos(outDir))
      writeFileSync(ruta, sellado)
    },
  }
}
