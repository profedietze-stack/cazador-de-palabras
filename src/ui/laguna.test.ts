// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { MUNDOS } from '../data/mundos'
import { razonContraste } from './contraste'
import { montarPaisaje, type OpcionesPaisaje } from './paisaje'
import { aplicarMundo } from './aplicarMundo'

// La laguna: el bloque verde de abajo del paisaje es agua, al pie de las montañas. Se ve en
// todos los mundos, de noche y de día, y es quieta con «reducir movimiento».

const op = (o: Partial<OpcionesPaisaje> = {}): OpcionesPaisaje => ({ animado: true, particulas: true, cielo: 'noche', ...o })
let el: HTMLElement
beforeEach(() => {
  document.body.innerHTML = '<div id="fondo"></div>'
  el = document.getElementById('fondo')!
  document.documentElement.removeAttribute('style')
})

describe('el agua es un dato de cada mundo', () => {
  for (const m of Object.values(MUNDOS)) {
    for (const cielo of ['noche', 'dia'] as const) {
      it(`${m.id} (${cielo}): color de agua válido, azulado y distinguible de la colina cercana y del cielo`, () => {
        const p = m[cielo]
        expect(p.agua).toMatch(/^#[0-9a-f]{6}$/i)
        expect(razonContraste(p.agua, p.colinas[2]), 'contra la colina').toBeGreaterThanOrEqual(1.5)
        expect(razonContraste(p.agua, p.cieloBajo), 'contra el cielo').toBeGreaterThanOrEqual(1.5)
        // «azulado»: el canal azul no es el más bajo (no es verde ni marrón)
        const [r, g, b] = [1, 3, 5].map(i => parseInt(p.agua.slice(i, i + 2), 16)) as [number, number, number]
        expect(b, 'azul >= rojo').toBeGreaterThanOrEqual(r)
        expect(b + g, 'azul y verde dominan').toBeGreaterThan(r * 2)
      })
    }
  }
})

describe('aplicarMundo escribe el agua', () => {
  it('fija --agua con el color del mundo y del cielo', () => {
    aplicarMundo(MUNDOS.verbos, 'noche')
    expect(document.documentElement.style.getPropertyValue('--agua')).toBe(MUNDOS.verbos.noche.agua)
    aplicarMundo(MUNDOS.verbos, 'dia')
    expect(document.documentElement.style.getPropertyValue('--agua')).toBe(MUNDOS.verbos.dia.agua)
  })
})

describe('montarPaisaje dibuja la laguna', () => {
  it('hay una franja de agua con su orilla (SVG) por encima de las colinas', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op())
    const agua = el.querySelector('.pa-agua')
    expect(agua).not.toBeNull()
    expect(agua!.querySelector('svg path')).not.toBeNull()
    // va después de las tres colinas: se dibuja encima y las corta en la orilla
    const hijos = [...el.children]
    expect(hijos.indexOf(agua as HTMLElement)).toBeGreaterThan(hijos.findIndex(h => h.classList.contains('pa-c3')))
  })

  it('animado: hay reflejos que brillan; quieto: el agua queda pero sin reflejos animados', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op({ animado: true }))
    expect(el.querySelectorAll('.pa-onda').length).toBe(3)
    montarPaisaje(el, MUNDOS.sustantivos, op({ animado: false }))
    expect(el.querySelector('.pa-agua')).not.toBeNull()
    expect(el.querySelectorAll('.pa-onda').length).toBe(0)
  })

  it('con alto contraste no hay agua (fondo liso)', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op({ apagarTodo: true }))
    expect(el.querySelector('.pa-agua')).toBeNull()
  })

  it('montar dos veces no duplica el agua', () => {
    montarPaisaje(el, MUNDOS.sustantivos, op())
    montarPaisaje(el, MUNDOS.sustantivos, op())
    expect(el.querySelectorAll('.pa-agua').length).toBe(1)
  })
})

describe('estilos de la laguna', () => {
  const css = readFileSync('src/styles/paisaje.css', 'utf8')
  it('el color sale de la variable del mundo', () => {
    expect(css).toMatch(/\.pa-agua path\{[^}]*fill:\s*var\(--agua\)/)
  })
  it('los reflejos se apagan con menos movimiento (sistema y Ajustes) y con la pestaña oculta', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.pa-onda/)
    expect(css).toMatch(/html\[data-movimiento="reducido"\] \.pa-onda[^{]*\{[^}]*animation:\s*none/)
    expect(css).toMatch(/html\.pestana-oculta \.pa-onda[^{]*\{[^}]*animation-play-state:\s*paused/)
  })
})
