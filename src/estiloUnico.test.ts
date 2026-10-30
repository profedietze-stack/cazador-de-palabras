import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { razonContraste } from './ui/contraste'

// Que no quede un estilo viejo mezclado con el nuevo (rediseño «Aventura»): barrido de todo
// src/styles y de todas las pantallas del HTML, sin lista a mano de archivos.

const html = readFileSync('index.html', 'utf8')
const estilos = readdirSync('src/styles').filter(f => f.endsWith('.css')).map(f => ({ f, t: readFileSync(`src/styles/${f}`, 'utf8') }))
const todo = estilos.map(e => e.t).join('\n')
const base = readFileSync('src/styles/base.css', 'utf8')
const hex = (re: RegExp, s = base): string => re.exec(s)?.[1] ?? ''
const v = (nombre: string): string => hex(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`))

describe('ninguna pantalla conserva el aspecto anterior', () => {
  it('todas las pantallas del HTML tienen su contenedor de paisaje', () => {
    const pantallas = [...html.matchAll(/<div id="(\w+)" class="screen[^"]*">/g)]
    expect(pantallas.length).toBe(15)
    const sin: string[] = []
    pantallas.forEach((m, i) => {
      const ini = m.index!
      const fin = i + 1 < pantallas.length ? pantallas[i + 1]!.index! : html.length
      if (!html.slice(ini, fin).includes('class="fondo-mundo"')) sin.push(m[1]!)
    })
    expect(sin).toEqual([])
  })

  it('el degradado violeta ya no se usa en ningún estilo', () => {
    expect(todo).not.toMatch(/var\(--bg1\)|var\(--bg2\)/)
    expect(todo).not.toMatch(/#4f5fd1|#764ba2/i)
  })

  it('la tipografía del sistema solo queda como último respaldo en tokens.css', () => {
    for (const { f, t } of estilos) {
      if (f === 'tokens.css') continue
      expect(t, f).not.toMatch(/Segoe UI/)
    }
  })

  it('botones, campos y áreas de texto heredan la tipografía del juego (si no, salen en Arial)', () => {
    expect(base).toMatch(/button,input,textarea,select\{font-family:inherit\}/)
  })

  it('el fondo de cada pantalla sale del cielo del mundo, no de un degradado fijo', () => {
    expect(base).toMatch(/\.screen\{[^}]*background:linear-gradient\(var\(--cielo-alto/)
  })
})

describe('las superficies son siempre crema con letra marrón (también de noche)', () => {
  it('el tema oscuro ya no oscurece los paneles', () => {
    const oscuro = /html\[data-theme="dark"\]\{([^}]*)\}/.exec(base)?.[1] ?? ''
    expect(oscuro).not.toMatch(/--panel-bg|--text:|--text-soft|--panel-alt/)
  })

  it('los colores de texto de las variables dan ≥ 4,5:1 sobre cada panel', () => {
    for (const panel of ['--panel-bg', '--panel-alt', '--panel-acc']) {
      for (const texto of ['--text', '--text-soft', '--text-muted', '--text-faint', '--acento-ui']) {
        const t = v(texto) || hex(new RegExp(`${texto}:\\s*(#[0-9a-fA-F]{6})`), readFileSync('src/styles/tokens.css', 'utf8'))
        expect(razonContraste(t, v(panel)), `${texto} sobre ${panel}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('la tarjeta (.card) y el modal son placas crema con borde inferior', () => {
    expect(todo).toMatch(/\.card\{[^}]*background:var\(--panel-bg\)/)
    expect(todo).toMatch(/\.card\{[^}]*border-bottom:\s*6px solid/)
    expect(todo).toMatch(/\.modal-box\{[^}]*border-bottom:\s*6px solid/)
  })
})

describe('los botones heredados toman el aspecto 3D', () => {
  it('.btn tiene borde inferior grueso y alto táctil', () => {
    expect(todo).toMatch(/\.btn\{[^}]*border-bottom:\s*var\(--borde-3d\) solid/)
    expect(todo).toMatch(/\.btn\{[^}]*min-height:\s*44px/)
  })
  it('primario, secundario, confirmar y peligro usan los pares de color medidos', () => {
    expect(todo).toMatch(/\.btn-primary\{[^}]*background:var\(--btn-pri-bg\)[^}]*color:var\(--btn-pri-fg\)/)
    expect(todo).toMatch(/\.btn-outline\{[^}]*background:var\(--btn-sec-bg\)[^}]*color:var\(--btn-sec-fg\)/)
    expect(todo).toMatch(/\.btn-ok\{[^}]*background:var\(--btn-ok-bg\)[^}]*color:var\(--btn-ok-fg\)/)
    expect(todo).toMatch(/\.btn-danger\{[^}]*background:var\(--btn-peligro-bg\)[^}]*color:var\(--btn-peligro-fg\)/)
  })
  it('«Volver» es un botón 3D', () => {
    expect(todo).toMatch(/\.back-btn\{[^}]*border-bottom:\s*var\(--borde-3d\) solid/)
  })
})

describe('el texto de ayuda no contradice las reglas', () => {
  it('Info ya no dice que los puntos son «por letra» (son fijos por nivel desde la auditoría)', () => {
    expect(html).not.toContain('por letra')
    expect(html).toMatch(/Nivel 1:<\/strong> 250 puntos/)
  })
})

describe('detalles de las superficies', () => {
  it('las tarjetas transparentes del menú y del resultado no dejan una línea de borde suelta', () => {
    expect(todo).toMatch(/#menuPrincipal>\.card,#resultadoScreen>\.card\{[^}]*border-bottom:\s*0/)
  })
  it('el aviso de logro es una placa crema, no un cuadro blanco', () => {
    expect(todo).toMatch(/\.alert-banner\{[^}]*background:\s*var\(--panel-bg\)/)
    expect(todo).toMatch(/\.alert-banner\{[^}]*border-bottom:\s*5px solid/)
  })
})
