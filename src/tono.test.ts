import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// El juego habla en voseo (escuela argentina). La auditoría del 28-oct-2026
// encontró tuteo en las pantallas que más se leen («Elige una categoría») y
// textos del docente sin tildes. Este barrido recorre TODO src y index.html con
// recorrido de directorios, no con una lista de archivos anotada a mano: un
// archivo nuevo entra solo.

function archivos(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) archivos(p, acc)
    else if (/\.ts$/.test(n) && !/\.test\.ts$/.test(n)) acc.push(p)
  }
  return acc
}

/**
 * Texto que ve el alumno. De los .ts, las líneas de código que llevan comillas
 * (se saltean comentarios de línea y de bloque): no se parsean los literales,
 * porque una comilla suelta desincroniza el parser y hace pasar el test sin
 * mirar nada. De index.html, el texto entre etiquetas.
 */
function textosVisibles(): Array<{ fuente: string; texto: string }> {
  const out: Array<{ fuente: string; texto: string }> = []
  for (const f of archivos('src')) {
    if (/(categories|decoWords)\.ts$/.test(f)) continue // palabras del banco, no prosa
    let enBloque = false
    for (const linea of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const t = linea.trim()
      if (enBloque) { if (t.includes('*/')) enBloque = false; continue }
      if (t.startsWith('/*')) { if (!t.includes('*/')) enBloque = true; continue }
      if (t.startsWith('//') || t.startsWith('*')) continue
      if (/['"`]/.test(t)) out.push({ fuente: f, texto: t.replace(/\s\/\/.*$/, '') })
    }
  }
  const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  for (const m of html.matchAll(/>([^<>]{6,})</g)) out.push({ fuente: 'index.html', texto: m[1]!.trim() })
  return out
}

const TUTEO = /\b(tú|tienes|puedes|quieres|eres|debes|sabes|haz|elige|selecciona|verifica|sigue|usa|lee|ingresa|presiona|escribe|pulsa|prueba|intenta|pierdes|perderás|cazas|cuéntame)\b/i
const SIN_TILDE = /\b(codigo|boton|queres|tenes|conexion|ATENCION|Proba|incognito|Verifica)\b/

describe('tono: voseo argentino y ortografía en los textos que ve el alumno', () => {
  const textos = textosVisibles()

  it('hay textos que revisar', () => {
    expect(textos.length).toBeGreaterThan(300)
  })

  it('no hay tuteo', () => {
    const malos = textos
      .filter(t => TUTEO.test(t.texto))
      // ejemplos de teoría de pronombres: «yo, tú, él, nosotros»
      .filter(t => !/\byo\b.*\btú\b.*\bél\b/i.test(t.texto))
    expect(malos.map(t => `${t.fuente}: ${t.texto.slice(0, 90)}`)).toEqual([])
  })

  it('no hay palabras sin tilde en los textos', () => {
    const malos = textos.filter(t => SIN_TILDE.test(t.texto))
    expect(malos.map(t => `${t.fuente}: ${t.texto.slice(0, 90)}`)).toEqual([])
  })
})
