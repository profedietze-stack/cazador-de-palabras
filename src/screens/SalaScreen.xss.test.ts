import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Un alumno con el código de un aula puede crear una sala a nombre del docente
// con `<img src=x onerror=...>` como nombre (la regla de creación lo permitía).
// «Mis salas» lo interpolaba crudo en innerHTML y se ejecutaba en el navegador
// del docente: leyó su clave de localStorage. Confirmado en producción.
describe('SalaScreen no interpola texto de otros en HTML sin escapar', () => {
  const src = readFileSync('src/screens/SalaScreen.ts', 'utf8')

  it('ninguna plantilla mete code, nombre ni descripcion de una sala crudos', () => {
    const crudos = src.match(/\$\{(s|sala)\.(code|nombre|descripcion)\}/g) ?? []
    // getElementById(`..._${s.code}`) busca por id y no es HTML: se admite.
    const enHtml = src.split('\n')
      .filter(l => /\$\{(s|sala)\.(code|nombre|descripcion)\}/.test(l) && !l.includes('getElementById'))
    expect(enHtml, `${crudos.length} interpolaciones`).toEqual([])
  })

  it('importa escapeHtml', () => {
    expect(src).toMatch(/import \{[^}]*escapeHtml[^}]*\} from '\.\.\/utils'/)
  })
})
