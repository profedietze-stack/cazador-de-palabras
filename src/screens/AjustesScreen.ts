import { mostrar } from './ScreenManager'
import { ajustes, alCambiarAjustes, cambiarAjustes, restablecerAjustes, type Ajustes } from '../storage/ajustes'
import { probarSonido } from '../audio/AudioEngine'
import { probarVibracion, vibracionDisponible } from '../utils/vibracion'
import { showConfirm } from '../ui/Dialog'

// Pantalla ⚙️ del menú de inicio. Los controles están escritos en index.html con
// `data-aj="<clave de Ajustes>"` y acá se enlazan por esa clave: un interruptor
// (checkbox), un deslizador (range) o un grupo de opciones (.aj-seg con botones
// `data-valor`). Agregar un ajuste es agregar su control con la clave; un test
// comprueba que ninguna clave de Ajustes se quede sin control.

type Clave = keyof Ajustes

// Qué controles dependen de otro interruptor (quedan deshabilitados, no ocultos:
// así el alumno ve que existen y por qué no responden).
const DEPENDE_DE: Partial<Record<Clave, Clave>> = {
  volGeneral: 'sonido', musica: 'sonido', efectos: 'sonido',
  volMusica: 'musica', volEfectos: 'efectos',
  vibIntensidad: 'vibracion', vibAcierto: 'vibracion', vibError: 'vibracion', vibCombo: 'vibracion',
}

const controles = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-aj]')]

function habilitado(clave: Clave, a: Ajustes): boolean {
  const padre = DEPENDE_DE[clave]
  if (padre && !a[padre]) return false
  // Si el padre es a su vez dependiente (volMusica ← musica ← sonido), se sube la cadena.
  if (padre && DEPENDE_DE[padre]) return habilitado(padre, a)
  if (DEPENDE_DE[clave] === 'vibracion' && !vibracionDisponible()) return false
  return true
}

function pintar(a: Ajustes): void {
  for (const el of controles()) {
    const clave = el.dataset['aj'] as Clave
    const valor = a[clave]
    const activo = habilitado(clave, a)
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = valor === true
      el.setAttribute('aria-checked', String(valor === true))
      el.disabled = !activo
    } else if (el instanceof HTMLInputElement && el.type === 'range') {
      el.value = String(valor)
      el.setAttribute('aria-valuetext', `${valor} %`)
      el.disabled = !activo
      const out = document.querySelector<HTMLOutputElement>(`[data-out="${clave}"]`)
      if (out) out.textContent = `${valor} %`
    } else if (el.classList.contains('aj-seg')) {
      el.querySelectorAll<HTMLButtonElement>('.aj-op').forEach(b => {
        const on = b.dataset['valor'] === String(valor)
        b.classList.toggle('on', on)
        b.setAttribute('aria-checked', String(on))
        b.disabled = !activo
      })
    }
  }
  const probarS = document.getElementById('ajProbarSonido') as HTMLButtonElement | null
  if (probarS) probarS.disabled = !a.sonido
  const probarV = document.getElementById('ajProbarVib') as HTMLButtonElement | null
  if (probarV) probarV.disabled = !vibracionDisponible()
  const aviso = document.getElementById('ajVibNoDisp')
  if (aviso) aviso.hidden = vibracionDisponible()
}

export function initAjustesScreen(): void {
  document.getElementById('ajustesBtn')!.addEventListener('click', () => mostrar('ajustesScreen'))
  document.getElementById('backFromAjustes')!.addEventListener('click', () => mostrar('menuPrincipal'))

  for (const el of controles()) {
    const clave = el.dataset['aj'] as Clave
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.addEventListener('change', () => { cambiarAjustes({ [clave]: el.checked } as Partial<Ajustes>) })
    } else if (el instanceof HTMLInputElement && el.type === 'range') {
      el.addEventListener('input', () => { cambiarAjustes({ [clave]: Number(el.value) } as Partial<Ajustes>) })
    } else if (el.classList.contains('aj-seg')) {
      el.addEventListener('click', e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.aj-op')
        if (!b || b.disabled) return
        const v = b.dataset['valor']!
        cambiarAjustes({ [clave]: v } as Partial<Ajustes>)
      })
    }
  }

  document.getElementById('ajProbarSonido')!.addEventListener('click', () => probarSonido())
  document.getElementById('ajProbarVib')!.addEventListener('click', () => probarVibracion())
  document.getElementById('ajRestablecer')!.addEventListener('click', async () => {
    if (await showConfirm('¿Volver todos los ajustes a los valores de fábrica?')) restablecerAjustes()
  })

  alCambiarAjustes(pintar)
  pintar(ajustes())
}
