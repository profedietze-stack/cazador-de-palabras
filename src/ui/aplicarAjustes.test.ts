// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { aplicarAjustes, cieloActual } from './aplicarAjustes'
import { AJUSTES_DE_FABRICA as F } from '../storage/ajustes'

const sistema = (oscuro: boolean): void => {
  ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: oscuro, addEventListener() {} })
}

beforeEach(() => {
  delete document.documentElement.dataset['cielo']
  sistema(false)
})

describe('el tema elige el cielo del mundo: oscuro = noche, claro = día', () => {
  it('«oscuro» deja la noche y «claro» el día', () => {
    aplicarAjustes({ ...F, tema: 'oscuro' })
    expect(document.documentElement.dataset['cielo']).toBe('noche')
    aplicarAjustes({ ...F, tema: 'claro' })
    expect(document.documentElement.dataset['cielo']).toBe('dia')
  })

  it('«auto» sigue al sistema', () => {
    sistema(true)
    aplicarAjustes({ ...F, tema: 'auto' })
    expect(document.documentElement.dataset['cielo']).toBe('noche')
    sistema(false)
    aplicarAjustes({ ...F, tema: 'auto' })
    expect(document.documentElement.dataset['cielo']).toBe('dia')
  })

  it('cieloActual() lee el atributo y sin atributo es de noche', () => {
    expect(cieloActual()).toBe('noche')
    aplicarAjustes({ ...F, tema: 'claro' })
    expect(cieloActual()).toBe('dia')
  })

  it('los otros atributos siguen igual', () => {
    aplicarAjustes({ ...F, altoContraste: true, reducirMovimiento: true, fondoDecorativo: false, tamanoPalabras: 'grande' })
    const d = document.documentElement.dataset
    expect([d['contraste'], d['movimiento'], d['fondo'], d['tamano']]).toEqual(['alto', 'reducido', 'no', 'grande'])
    expect(document.documentElement.style.getPropertyValue('--tam-palabras')).toBe('1.25')
  })
})

describe('tipografías y tokens', () => {
  const fuentes = readFileSync('src/styles/fuentes.css', 'utf8')
  const tokens = readFileSync('src/styles/tokens.css', 'utf8')

  it('declara las dos familias con font-display: swap y archivos que existen', () => {
    const bloques = fuentes.match(/@font-face\s*\{[^}]*\}/g) ?? []
    expect(bloques.length).toBe(2)
    for (const b of bloques) {
      expect(b).toMatch(/font-display:\s*swap/)
      const url = /url\(['"]?\/fonts\/([\w.-]+\.woff2)['"]?\)/.exec(b)?.[1]
      expect(url, b).toBeTruthy()
      expect(existsSync('public/fonts/' + url!)).toBe(true)
    }
    expect(fuentes).toContain("'Lilita One'")
    expect(fuentes).toContain("'Baloo 2'")
  })

  it('Baloo 2 es variable (400 a 800) para los botones y las palabras', () => {
    expect(fuentes).toMatch(/font-weight:\s*400\s+800/)
  })

  it('los tokens definen las familias y la escala de radios y sombras', () => {
    for (const v of ['--font-titulo', '--font-texto', '--r-sm', '--r-md', '--r-lg', '--sombra-placa', '--borde-3d']) {
      expect(tokens, v).toContain(v + ':')
    }
    expect(tokens).toMatch(/--font-titulo:\s*'Lilita One'/)
    expect(tokens).toMatch(/--font-texto:\s*'Baloo 2'/)
  })

  it('el texto del juego usa la tipografía propia, no la del sistema', () => {
    expect(readFileSync('src/styles/base.css', 'utf8')).toMatch(/body\{[^}]*font-family:var\(--font-texto\)/)
  })
})
