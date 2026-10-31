import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AJUSTES_DE_FABRICA } from './storage/ajustes'
import { razonContraste } from './ui/contraste'

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

  it('el botón ⚙️ es un botón más del menú, encima de «Borrar Progreso», y no queda el flotante ni los de sonido y tema', () => {
    expect(html).toContain('id="ajustesBtn"')
    expect(html).not.toContain('id="volBtn"')
    expect(html).not.toContain('id="themeBtn"')
    expect(html).not.toContain('aj-btn')
    expect(html).toMatch(/<button class="btn3d" id="ajustesBtn">[^<]*<\/button>\s*<button[^>]*id="btnBorrar"/)
    const menu = html.slice(html.indexOf('id="menuPrincipal"'), html.indexOf('id="seleccionCategoria"'))
    expect(menu).toContain('id="ajustesBtn"')
    expect(leer('src/styles/componentes.css')).not.toContain('.aj-btn')
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

describe('ajustes con el estilo Aventura', () => {
  const pant = html.slice(html.indexOf('id="ajustesScreen"'), html.indexOf('BOTÓN FLOTANTE'))
  const css = leer('src/styles/ajustes.css')
  const hex = (re: RegExp): string => re.exec(css)?.[1] ?? ''

  it('lleva el paisaje, el título cartel y el botón de volver 3D', () => {
    expect(pant).toMatch(/id="ajustesScreen" class="screen con-mundo"/)
    expect(pant).toContain('class="fondo-mundo"')
    expect(pant).toMatch(/<h1 class="titulo-cartel titulo-pantalla">/)
    expect(pant).toMatch(/class="btn3d btn3d--volver" id="backFromAjustes"/)
  })

  it('las cinco secciones son placas crema y los botones de acción son 3D', () => {
    expect([...pant.matchAll(/<section class="aj-sec placa placa--crema"/g)].length).toBe(5)
    expect(pant).not.toContain('btn-outline')
    for (const id of ['ajProbarSonido', 'ajProbarVib', 'ajRestablecer']) expect(pant, id).toMatch(new RegExp(`class="btn3d btn3d--chico" id="${id}"`))
  })

  it('el texto de las secciones es marrón oscuro sobre el crema: contraste medido ≥ 4,5:1', () => {
    expect(hex(/\.aj-sec\{[^}]*color:\s*(#[0-9a-f]{6})/i)).toBe('#3a2200')
    expect(razonContraste('#3a2200', '#fff6dc')).toBeGreaterThanOrEqual(4.5)
    expect(razonContraste(hex(/\.aj-txt small\{[^}]*color:\s*(#[0-9a-f]{6})/i), '#fff6dc')).toBeGreaterThanOrEqual(4.5)
  })

  it('el interruptor se distingue del crema (≥ 3:1) encendido y apagado', () => {
    expect(razonContraste(hex(/\.aj-switch\{[^}]*background:\s*(#[0-9a-f]{6})/i), '#fff6dc')).toBeGreaterThanOrEqual(3)
    expect(razonContraste(hex(/\.aj-switch:checked\{[^}]*background:\s*(#[0-9a-f]{6})/i), '#fff6dc')).toBeGreaterThanOrEqual(3)
  })

  it('el grupo de opciones elegido usa el botón principal (texto y fondo ya medidos)', () => {
    expect(css).toMatch(/\.aj-op\.on\{[^}]*background:\s*var\(--btn-pri-bg\)/)
    expect(css).toMatch(/\.aj-op\.on\{[^}]*color:\s*var\(--btn-pri-fg\)/)
  })

  it('filas, opciones y deslizadores miden al menos 44 px de alto', () => {
    expect(css).toMatch(/\.aj-fila\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.aj-op\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.aj-rango input\{[^}]*min-height:\s*44px/)
  })

  it('con alto contraste la palabra que cae sigue legible: fondo blanco y letra negra (no marrón sobre oscuro)', () => {
    const m = /html\[data-contraste="alto"\] \.palabra\{([^}]*)\}/.exec(css)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/background:\s*#ffffff/)
    expect(m![1]).toMatch(/color:\s*#000000/)
  })
})
