import { G } from '../game/state'
import { CATS } from '../data/categories'
import { mostrar } from './ScreenManager'
import { mostrarPreNivel } from './PreLevelScreen'
import type { CategoryKey } from '../types'

export function initCategoryScreen(): void {
  document.getElementById('backFromCats')!.addEventListener('click', () => mostrar('menuPrincipal'))
}

export function mostrarSeleccionCategoria(): void {
  mostrar('seleccionCategoria')
  const grid = document.getElementById('catsGrid')!
  grid.innerHTML = ''
  Object.entries(CATS).forEach(([key, cat]) => {
    const c = document.createElement('div')
    c.className = 'cat-card'
    c.innerHTML = `<h3>${cat.icon} ${cat.nombre}</h3>
      <div class="nivel-row">
        <button class="nv-btn" data-cat="${key}" data-niv="1">Niv 1</button>
        <button class="nv-btn" data-cat="${key}" data-niv="2">Niv 2</button>
        <button class="nv-btn" data-cat="${key}" data-niv="3">Niv 3</button>
      </div>`
    grid.appendChild(c)
  })
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
