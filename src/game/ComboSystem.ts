import type { ComboLevel } from '../types'
import { G } from './state'
import { playComboSound } from '../audio/AudioEngine'

export const COMBOS: (ComboLevel | null)[] = [
  null,
  { racha: 3,  mult: 1.5, label: '📖 COMBO x1.5',     clase: 'combo-lv1' },
  { racha: 6,  mult: 2,   label: '✏️ COMBO x2',        clase: 'combo-lv2' },
  { racha: 10, mult: 2.5, label: '🏆 COMBO x2.5',      clase: 'combo-lv3' },
  { racha: 15, mult: 3,   label: '🌟 COMBO x3',        clase: 'combo-lv4' },
  { racha: 20, mult: 4,   label: '🔥 ULTRA COMBO x4',  clase: 'combo-lv5' },
]

let comboTimeout: ReturnType<typeof setTimeout> | null = null

export function actualizarCombo(acerto: boolean): void {
  if (acerto) {
    G.racha++
    let nuevoNivel = 0
    for (let i = COMBOS.length - 1; i >= 1; i--) {
      if (G.racha >= COMBOS[i]!.racha) { nuevoNivel = i; break }
    }
    const subio = nuevoNivel > G.comboNivel
    if (subio && nuevoNivel > 0) G.combosTotalesPartida++
    G.comboNivel = nuevoNivel
    if (G.comboNivel > 0) {
      mostrarComboBanner(subio)
      if (comboTimeout) clearTimeout(comboTimeout)
      comboTimeout = setTimeout(resetCombo, 5000)
    }
  } else {
    resetCombo()
  }
}

export function resetCombo(): void {
  G.racha = 0
  G.comboNivel = 0
  if (comboTimeout) { clearTimeout(comboTimeout); comboTimeout = null }
  const d = document.getElementById('comboDisplay')
  if (d) d.innerHTML = ''
}

function mostrarComboBanner(esNuevo: boolean): void {
  const combo = COMBOS[G.comboNivel]
  if (!combo) return
  const d = document.getElementById('comboDisplay')
  if (!d) return
  d.innerHTML = ''
  const b = document.createElement('div')
  b.className = 'combo-banner ' + combo.clase
  b.textContent = combo.label + '  🔥×' + G.racha
  d.appendChild(b)
  if (esNuevo) playComboSound(G.comboNivel)
}
