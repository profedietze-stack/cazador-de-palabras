// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { codigoEmoji, urlEmoji, emojiNodo, emojiHtml, hidratarEmojis, iniciarHidratacion } from './emoji'

beforeEach(() => { document.body.innerHTML = '' })

describe('codigoEmoji / urlEmoji', () => {
  it('usa los puntos de código en minúscula y descarta la variación U+FE0F', () => {
    expect(codigoEmoji('🎯')).toBe('1f3af')
    expect(codigoEmoji('⚔️')).toBe('2694')
    expect(codigoEmoji('⚔')).toBe('2694')
  })
  it('la URL apunta a la carpeta propia public/emoji (nunca a otro sitio)', () => {
    expect(urlEmoji('🏆')).toMatch(/^\/emoji\/1f3c6\.webp$/)
  })
})

describe('emojiNodo', () => {
  it('es una imagen con el emoji como texto alternativo', () => {
    const n = emojiNodo('🏆')
    expect(n.tagName).toBe('IMG')
    expect(n.getAttribute('alt')).toBe('🏆')
    expect(n.classList.contains('emo')).toBe(true)
  })
  it('si el archivo no carga queda el emoji del sistema como texto, no un recuadro roto', () => {
    const cont = document.createElement('p')
    const n = emojiNodo('🏆')
    cont.appendChild(n)
    n.dispatchEvent(new Event('error'))
    expect(cont.querySelector('img')).toBeNull()
    expect(cont.textContent).toBe('🏆')
  })
  it('el respaldo de texto no vuelve a hidratarse (sin bucle)', () => {
    iniciarHidratacion()
    const cont = document.createElement('p')
    document.body.appendChild(cont)
    const n = emojiNodo('🏆')
    cont.appendChild(n)
    n.dispatchEvent(new Event('error'))
    expect(cont.querySelector('img')).toBeNull()
  })
})

describe('emojiHtml', () => {
  it('acepta solo emojis de verdad: texto o HTML lanza', () => {
    expect(() => emojiHtml('🏆')).not.toThrow()
    expect(() => emojiHtml('hola')).toThrow()
    expect(() => emojiHtml('<img src=x onerror=alert(1)>')).toThrow()
    expect(() => emojiHtml('🏆🏆')).toThrow()
  })
  it('devuelve una etiqueta img con alt', () => {
    expect(emojiHtml('🚀')).toMatch(/^<img class="emo" alt="🚀" src="\/emoji\/1f680\.webp"/)
  })
})

describe('hidratarEmojis', () => {
  it('reemplaza el emoji de un texto por una imagen y conserva el resto', () => {
    document.body.innerHTML = '<p id="p">🚀 Iniciar</p>'
    hidratarEmojis()
    const p = document.getElementById('p')!
    expect(p.querySelector('img')?.getAttribute('alt')).toBe('🚀')
    expect(p.textContent).toBe(' Iniciar')
  })
  it('no toca lo que está dentro de [data-sin-emoji]', () => {
    document.body.innerHTML = '<p id="p" data-sin-emoji>🚀 Ana</p>'
    hidratarEmojis()
    expect(document.getElementById('p')!.querySelector('img')).toBeNull()
    expect(document.getElementById('p')!.textContent).toBe('🚀 Ana')
  })
  it('nunca interpreta HTML: un nombre con etiquetas queda como texto', () => {
    const p = document.createElement('p')
    p.setAttribute('data-sin-emoji', '')
    p.textContent = '<img src=x onerror=alert(1)>🎯'
    document.body.appendChild(p)
    hidratarEmojis()
    expect(p.querySelector('img')).toBeNull()
    expect(p.textContent).toBe('<img src=x onerror=alert(1)>🎯')
  })
  it('un nombre con emoji fuera de una zona marcada sigue sin poder inyectar HTML', () => {
    const p = document.createElement('p')
    p.textContent = '<b onmouseover=x>🎯</b>'
    document.body.appendChild(p)
    hidratarEmojis()
    expect(p.querySelectorAll('b').length).toBe(0)
    expect(p.querySelectorAll('img').length).toBe(1)
    expect(p.textContent).toContain('<b onmouseover=x>')
  })
  it('no entra en script, style, textarea ni input', () => {
    document.body.innerHTML = '<textarea>🎯</textarea><style>/* 🎯 */</style>'
    hidratarEmojis()
    expect(document.querySelector('textarea')!.querySelector('img')).toBeNull()
    expect(document.querySelector('style')!.querySelector('img')).toBeNull()
  })
})

describe('iniciarHidratacion (lo que se agrega después también se hidrata)', () => {
  it('un nodo agregado al DOM con un emoji se reemplaza por la imagen', async () => {
    iniciarHidratacion()
    const d = document.createElement('div')
    d.innerHTML = '<h3>🏠 Sustantivos</h3>'
    document.body.appendChild(d)
    await new Promise(r => setTimeout(r, 0))
    expect(d.querySelector('img')?.getAttribute('alt')).toBe('🏠')
  })
})

describe('el texto de otros jugadores nunca se convierte en imágenes', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap(f => {
    const p = join(d, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
  const archivos = walk('src').map(f => f.replaceAll(sep, '/')).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))

  it('toda plantilla que pinta jugador, nombre o descripcion de otros lleva data-sin-emoji en la misma línea', () => {
    const sueltas: string[] = []
    for (const f of archivos) {
      readFileSync(f, 'utf8').split(String.fromCharCode(10)).forEach((l, i) => {
        if (/escapeHtml\(\s*\w+\.(jugador|nombre|descripcion)\s*\)/.test(l) && !l.includes('data-sin-emoji')) sueltas.push(`${f}:${i + 1}`)
      })
    }
    expect(sueltas).toEqual([])
  })

  it('los nombres de jugador del HTML estático están en zonas marcadas', () => {
    const html = readFileSync('index.html', 'utf8')
    for (const id of ['lobbyNombreA', 'lobbyNombreB', 'duelHudNombreMe', 'duelHudNombreRival', 'duelRsNombreMe', 'duelRsNombreRival', 'perfilNombre']) {
      expect(html, id).toMatch(new RegExp(`id="${id}" data-sin-emoji`))
    }
  })

  it('la hidratación arranca en main.ts antes de inicializar las pantallas', () => {
    const m = readFileSync('src/main.ts', 'utf8')
    expect(m.indexOf('iniciarHidratacion()')).toBeGreaterThan(-1)
    expect(m.indexOf('iniciarHidratacion()')).toBeLessThan(m.indexOf('initDialog()'))
  })
})
