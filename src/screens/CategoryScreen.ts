import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { mostrarPreNivel } from './PreLevelScreen'
import type { CategoryKey, GameRecord } from '../types'
import { MUNDOS } from '../data/mundos'
import { getPartidas } from '../storage/GameStorage'
import { estrellasDe } from '../game/progresoNiveles'
import { cieloActual, type Cielo } from '../ui/aplicarAjustes'
import { ondas } from '../ui/paisaje'

export function initCategoryScreen(): void {
  document.getElementById('backFromCats')!.addEventListener('click', () => mostrar('menuPrincipal'))
}

/** Las nueve tarjetas «mundo»: paisaje y color propios, estrellas de progreso y los tres niveles. */
export function renderMundos(grid: HTMLElement, partidas: readonly GameRecord[], cielo: Cielo): void {
  grid.replaceChildren()
  for (const [key, cat] of Object.entries(CATS) as [CategoryKey, (typeof CATS)[CategoryKey]][]) {
    const p = MUNDOS[key][cielo]
    const est = estrellasDe(partidas, key)
    const superados = est.filter(Boolean).length
    const t = document.createElement('div')
    t.className = 'mundo'
    t.dataset['cat'] = key
    t.style.setProperty('--m-alto', p.cieloAlto)
    t.style.setProperty('--m-bajo', p.cieloBajo)
    t.style.setProperty('--m-c1', p.colinas[0])
    t.style.setProperty('--m-c2', p.colinas[1])
    t.style.setProperty('--m-c3', p.colinas[2])
    // Todo lo que entra acá son constantes del juego (CATS), nunca texto de otros jugadores.
    t.innerHTML = `<svg class="mundo-paisaje" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
        <path class="m1" d="${ondas(120, 60)}"/><path class="m2" d="${ondas(150, 100)}"/><path class="m3" d="${ondas(175, 130)}"/></svg>
      <div class="mundo-icono" aria-hidden="true">${cat.icon}</div>
      <div class="mundo-info placa">
        <h3 class="mundo-nombre">${cat.nombre}</h3>
        <div class="estrellas" role="img" aria-label="Niveles superados: ${superados} de 3">${est.map(on => `<span class="est${on ? ' on' : ''}" aria-hidden="true">${on ? '★' : '☆'}</span>`).join('')}</div>
        <div class="nivel-row">
          <button class="nv-btn" data-cat="${key}" data-niv="1">Niv 1</button>
          <button class="nv-btn" data-cat="${key}" data-niv="2">Niv 2</button>
          <button class="nv-btn" data-cat="${key}" data-niv="3">Niv 3</button>
        </div>
      </div>`
    grid.appendChild(t)
  }
}

export function mostrarSeleccionCategoria(): void {
  mostrar('seleccionCategoria')
  const grid = document.getElementById('catsGrid')!
  renderMundos(grid, getPartidas(), cieloActual())
  grid.querySelectorAll('.nv-btn').forEach(btn => {
    btn.addEventListener('click', function (this: HTMLElement) {
      seleccionarNivel(this.dataset.cat as CategoryKey, parseInt(this.dataset.niv!))
    })
  })
}

export function seleccionarNivel(cat: CategoryKey, niv: number): void {
  G.cat = cat
  G.nivel = niv
  G.obj = niv === 1 ? 250 : niv === 2 ? 350 : 500
  G.velocidadBase = 1 + (niv - 1) * 0.5
  mostrarPreNivel()
}
