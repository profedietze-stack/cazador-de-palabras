import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// El paisaje tiene que quedarse quieto detrás del contenido cuando una pantalla se scrollea. Se
// escapaba porque `.paisaje` (position:absolute) se cargaba DESPUÉS de `.fondo-mundo`
// (position:fixed) y la pisaba: al bajar por el menú el paisaje subía con el contenido y abajo
// asomaba el color liso de la pantalla (un bloque verde).

const regla = (css: string, selector: string): string => {
  const esc = selector.replace(/[.#]/g, m => '\\' + m)
  return new RegExp(`${esc}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
}

describe('el fondo de mundo es fijo respecto de la ventana', () => {
  const paisaje = readFileSync('src/styles/paisaje.css', 'utf8')
  const comp = readFileSync('src/styles/componentes.css', 'utf8')

  it('.fondo-mundo es position:fixed', () => {
    expect(regla(comp, '.fondo-mundo')).toMatch(/position:\s*fixed/)
  })

  it('.paisaje (la misma etiqueta, cargada después) no lo vuelve absolute', () => {
    const r = regla(paisaje, '.paisaje')
    expect(r).not.toMatch(/position:\s*absolute/)
    expect(r).toMatch(/position:\s*fixed/)
  })

  it('el paisaje cubre toda la ventana (inset 0)', () => {
    expect(regla(paisaje, '.paisaje')).toMatch(/inset:\s*0/)
  })
})
