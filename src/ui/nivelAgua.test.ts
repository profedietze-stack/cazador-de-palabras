import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { debeHundirse, ENTRADA_AGUA_PX, yDelChapuzon } from '../game/caida'

// El efecto de la palabra que se hunde pasaba «demasiado arriba»: la laguna era una franja baja
// (14 %) y la palabra empezaba a desvanecerse sobre las montañas, 30 px antes del agua. Ahora la
// laguna es más alta, las montañas suben con ella, y la palabra se hunde ya dentro del agua.

const css = readFileSync('src/styles/paisaje.css', 'utf8')
const pct = (nombre: string): number => Number(new RegExp(`--${nombre}:\\s*([\\d.]+)%`).exec(css)?.[1] ?? NaN)

describe('altura de la laguna y de las montañas', () => {
  it('la laguna ocupa al menos el 20 % de la pantalla (antes 14 %)', () => {
    expect(pct('agua-alto')).toBeGreaterThanOrEqual(20)
    expect(css).toMatch(/\.pa-agua\{[^}]*height:\s*var\(--agua-alto\)/)
  })

  it('las montañas suben al menos un 6 % (todas las capas por igual)', () => {
    expect(pct('colinas-suben')).toBeGreaterThanOrEqual(6)
    expect(css).toMatch(/\.pa-colina\{[^}]*bottom:\s*var\(--colinas-suben\)/)
  })

  it('las montañas no quedan flotando: su pie queda dentro del agua, con margen', () => {
    expect(pct('colinas-suben')).toBeLessThan(pct('agua-alto') - 5)
  })
})

describe('debeHundirse: la palabra se hunde cuando ya está dentro del agua', () => {
  it('no antes de tocarla: por encima de la línea del agua sigue cayendo', () => {
    expect(debeHundirse(100, 500)).toBe(false)
    expect(debeHundirse(500, 500)).toBe(false)           // justo en la línea todavía no
    expect(debeHundirse(500 + ENTRADA_AGUA_PX - 1, 500)).toBe(false)
  })
  it('sí cuando el borde de arriba de la palabra ya pasó la línea del agua', () => {
    expect(debeHundirse(500 + ENTRADA_AGUA_PX, 500)).toBe(true)
    expect(debeHundirse(700, 500)).toBe(true)
  })
  it('la entrada es hacia adentro del agua, no antes (antes eran −30 px)', () => {
    expect(ENTRADA_AGUA_PX).toBeGreaterThan(0)
  })
})

describe('quien calcula la línea del agua usa el agua real y la nueva función', () => {
  it('la partida usa debeHundirse y no el margen anterior', () => {
    const f = readFileSync('src/game/WordPhysics.ts', 'utf8')
    expect(f).toContain('debeHundirse(')
    expect(f).not.toMatch(/agua - 30/)
  })
  it('el menú calcula la línea desde la laguna dibujada y también usa debeHundirse', () => {
    const f = readFileSync('src/ui/DecoBackground.ts', 'utf8')
    expect(f).toContain('debeHundirse(')
    expect(f).toContain('.pa-agua')
    expect(f).not.toMatch(/lineaAgua - 30/)
    expect(f).not.toMatch(/H \* 0\.86/)
  })
})

describe('la onda del chapuzón se abre dentro del agua, no en la orilla', () => {
  it('yDelChapuzon: el borde de abajo de la palabra, que ya está sumergida', () => {
    const agua = 500, alto = 40
    const y = yDelChapuzon(agua + ENTRADA_AGUA_PX, alto)
    expect(y).toBe(agua + ENTRADA_AGUA_PX + alto)
    expect(y - agua).toBeGreaterThanOrEqual(30)      // bien por debajo de la línea del agua (de la orilla y de las montañas)
  })
  it('la partida y el menú abren la onda ahí y no en la línea del agua', () => {
    for (const f of ['src/game/WordPhysics.ts', 'src/ui/DecoBackground.ts']) {
      const t = readFileSync(f, 'utf8')
      expect(t, f).toContain('yDelChapuzon(')
      expect(t, f).not.toMatch(/lanzarChapuzon\([^)]*,\s*(agua|lineaAgua)\)/)
    }
  })
})
