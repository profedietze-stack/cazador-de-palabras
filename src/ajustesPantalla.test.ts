import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AJUSTES_DE_FABRICA } from './storage/ajustes'

const html = readFileSync('index.html', 'utf8')
const leer = (f: string): string => readFileSync(f, 'utf8')

describe('pantalla de ajustes', () => {
  const clavesEnHtml = [...html.matchAll(/data-aj="(\w+)"/g)].map(m => m[1]!)

  it('cada ajuste tiene su control, y cada control un ajuste que existe', () => {
    const claves = Object.keys(AJUSTES_DE_FABRICA)
    expect(claves.filter(k => !clavesEnHtml.includes(k))).toEqual([])
    expect(clavesEnHtml.filter(k => !claves.includes(k))).toEqual([])
    expect(new Set(clavesEnHtml).size).toBe(clavesEnHtml.length)
  })

  it('las opciones de cada grupo son valores que el ajuste acepta', () => {
    for (const m of html.matchAll(/class="aj-seg" data-aj="(\w+)"[^>]*>(.*?)<\/div>/g)) {
      const valores = [...m[2]!.matchAll(/data-valor="(\w+)"/g)].map(x => x[1]!)
      expect(valores.length, m[1]).toBeGreaterThanOrEqual(2)
      expect(valores, m[1]).toContain(String(AJUSTES_DE_FABRICA[m[1] as keyof typeof AJUSTES_DE_FABRICA]))
    }
  })

  it('hay un solo botón flotante (⚙️) y no quedan los de sonido y tema', () => {
    expect(html).toContain('id="ajustesBtn"')
    expect(html).not.toContain('id="volBtn"')
    expect(html).not.toContain('id="themeBtn"')
    expect(leer('src/styles/components.css')).toMatch(/body\[data-pantalla="menuPrincipal"\] \.aj-btn/)
  })

  it('el botón ⚙️ solo se muestra en el menú de inicio', () => {
    const css = leer('src/styles/components.css')
    expect(css).toMatch(/\.aj-btn\{[^}]*display:none/)
    expect(leer('src/screens/ScreenManager.ts')).toContain("document.body.dataset['pantalla'] = id")
  })

  it('el sonido ya no usa el interruptor viejo y respeta los volúmenes', () => {
    const a = leer('src/audio/AudioEngine.ts')
    expect(a).not.toContain('G.sonido')
    expect(a).toContain("ganancia(ajustes(), 'efectos')")
    expect(a).toContain("ganancia(ajustes(), 'musica')")
  })

  it('el juego usa los ajustes: vibración, stickers, tamaño y duración del «¿Por qué?»', () => {
    const e = leer('src/game/GameEngine.ts')
    expect(e).toContain("vibrar('acierto')")
    expect(e).toContain("vibrar('error')")
    expect(e).toContain('ajustes().stickers')
    expect(e).toContain('ajustes().porQueSeg')
    expect(leer('src/game/ComboSystem.ts')).toContain("vibrar('combo')")
    expect(leer('src/game/WordSpawner.ts')).toContain('MULTIPLICADOR_TAMANO[ajustes().tamanoPalabras]')
    expect(leer('src/ui/DecoBackground.ts')).toContain('ajustes().fondoDecorativo')
  })

  it('«reducir movimiento» del alumno suma al del sistema, nunca lo anula', () => {
    const m = leer('src/utils/movimiento.ts')
    expect(m).toContain('prefers-reduced-motion: reduce')
    expect(m).toContain('ajustes().reducirMovimiento')
  })

  it('la pantalla es accesible: switches con role, grupos de opciones con radiogroup y rótulos', () => {
    expect(html).toMatch(/class="aj-switch" data-aj="sonido" role="switch"/)
    expect([...html.matchAll(/role="radiogroup" aria-labelledby="ajl-/g)].length).toBe(4)
    expect(html).toContain('id="backFromAjustes"')
  })
})
