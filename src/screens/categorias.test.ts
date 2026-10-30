// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderMundos } from './CategoryScreen'
import { CATS } from '../data/categories'
import { MUNDOS } from '../data/mundos'
import type { GameRecord } from '../types'

const html = readFileSync('index.html', 'utf8')
const css = ['screens', 'responsive', 'a11y', 'ajustes'].map(f => readFileSync(`src/styles/${f}.css`, 'utf8')).join('\n') + readFileSync('src/styles/componentes.css', 'utf8')

let grid: HTMLElement
beforeEach(() => {
  document.body.innerHTML = '<div id="catsGrid"></div>'
  grid = document.getElementById('catsGrid')!
})

const partida = (cat: GameRecord['cat'], nivel: number, medalla: GameRecord['medalla']): GameRecord => ({
  cat, catNombre: cat, nivel, pts: 300, medalla, precision: 90, cazadas: 20, erradas: 2, tiempoUsado: 60, combosHechos: 1, fecha: '2026-10-30',
})

describe('selección de categoría: nueve mundos', () => {
  it('hay una tarjeta .mundo por categoría, con su nombre y tres botones de nivel', () => {
    renderMundos(grid, [], 'noche')
    const tarjetas = [...grid.querySelectorAll<HTMLElement>('.mundo')]
    expect(tarjetas.length).toBe(9)
    expect(tarjetas.map(t => t.dataset['cat']).sort()).toEqual(Object.keys(CATS).sort())
    for (const t of tarjetas) {
      const botones = [...t.querySelectorAll<HTMLButtonElement>('.nv-btn')]
      expect(botones.map(b => b.dataset['niv'])).toEqual(['1', '2', '3'])
      expect(botones.every(b => b.dataset['cat'] === t.dataset['cat'])).toBe(true)
      expect(botones.map(b => b.textContent)).toEqual(['Niv 1', 'Niv 2', 'Niv 3'])
      expect(t.querySelector('.mundo-nombre')!.textContent).toContain(CATS[t.dataset['cat'] as keyof typeof CATS].nombre)
    }
  })

  it('cada tarjeta lleva la paleta de su mundo, y la de día cuando el cielo es de día', () => {
    renderMundos(grid, [], 'noche')
    const verbos = grid.querySelector<HTMLElement>('.mundo[data-cat="verbos"]')!
    expect(verbos.style.getPropertyValue('--m-alto')).toBe(MUNDOS.verbos.noche.cieloAlto)
    renderMundos(grid, [], 'dia')
    expect(grid.querySelector<HTMLElement>('.mundo[data-cat="verbos"]')!.style.getPropertyValue('--m-alto')).toBe(MUNDOS.verbos.dia.cieloAlto)
  })

  it('las estrellas muestran los niveles superados y lo dicen con texto, no solo con el color', () => {
    renderMundos(grid, [partida('verbos', 2, 'ORO')], 'noche')
    const est = grid.querySelector('.mundo[data-cat="verbos"] .estrellas')!
    expect([...est.querySelectorAll('.est')].map(e => e.classList.contains('on'))).toEqual([false, true, false])
    expect(est.getAttribute('aria-label')).toBe('Niveles superados: 1 de 3')
    expect(grid.querySelector('.mundo[data-cat="adjetivos"] .estrellas')!.getAttribute('aria-label')).toBe('Niveles superados: 0 de 3')
  })

  it('volver a dibujar no duplica las tarjetas', () => {
    renderMundos(grid, [], 'noche')
    renderMundos(grid, [], 'noche')
    expect(grid.querySelectorAll('.mundo').length).toBe(9)
  })
})

describe('pantallas de categoría y previa', () => {
  const sel = html.slice(html.indexOf('id="seleccionCategoria"'), html.indexOf('id="preNivel"'))
  const pre = html.slice(html.indexOf('id="preNivel"'), html.indexOf('id="gameScreen"'))

  it('ambas llevan el contenedor del paisaje y la selección el título cartel', () => {
    expect(sel).toContain('class="fondo-mundo"')
    expect(pre).toContain('class="fondo-mundo"')
    expect(sel).toMatch(/<h1 class="titulo-cartel[^"]*">/)
  })

  it('los botones de la previa son 3D (el principal es «Entendido»)', () => {
    expect(pre).toMatch(/class="btn3d btn3d--principal" id="btnEntendido"/)
    expect(pre).toMatch(/class="btn3d" id="btnPractica"/)
    expect(sel).toMatch(/class="btn3d btn3d--volver" id="backFromCats"/)
  })

  it('los botones de nivel miden al menos 44 px de alto (blanco táctil)', () => {
    expect(css).toMatch(/\.mundo \.nv-btn\s*\{[^}]*min-height:\s*44px/)
  })

  it('en celular angosto la grilla pasa a dos columnas', () => {
    expect(css).toMatch(/@media \(max-width:\s*\d+px\)\s*\{[^}]*\.cats-grid\s*\{[^}]*grid-template-columns:\s*1fr 1fr/)
  })

  it('la previa es una placa crema con texto oscuro, no la tarjeta violeta de antes', () => {
    expect(css).toMatch(/\.pre-box\s*\{[^}]*background:\s*#fff6dc/)
  })
})
