import { mostrar } from './ScreenManager'
import { crearSala, verificarSala, fetchMisSalas, limpiarScoresSala, desactivarSala, eliminarSala, contarSalasActivas, type SalaInfo } from '../services/LeaderboardService'
import { showAlert, showConfirm } from '../ui/Dialog'
import { mostrarRanking } from './RankingScreen'

const SALA_KEY = 'cdp_sala'
const SALA_NOMBRE_KEY = 'cdp_sala_nombre'

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch { /* Safari private / quota */ }
}
function lsRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* */ }
}

export function getSalaActual(): { code: string; nombre: string } | null {
  const code = lsGet(SALA_KEY)
  const nombre = lsGet(SALA_NOMBRE_KEY) ?? code ?? ''
  return code ? { code, nombre } : null
}

// ── Estado actual (alumno unido / sin sala) ───────────────────────────────────

function renderEstado(): void {
  const sala = getSalaActual()
  const estadoEl = document.getElementById('salaEstado')!
  const modosEl = document.getElementById('salaModoTabs')!
  const joinSection = document.getElementById('salaJoinSection')!
  const createSection = document.getElementById('salaCreateSection')!

  if (sala) {
    estadoEl.innerHTML = `
      <div class="sala-activa">
        <span class="sala-badge">🏫 Sala activa</span>
        <div class="sala-info-row">
          <span class="sala-code-display">${sala.code}</span>
          <span class="sala-nombre-display">${sala.nombre}</span>
        </div>
        <p class="sala-hint">Tus puntajes se suben a esta sala al terminar cada partida con medalla.</p>
        <button class="btn btn-outline btn-sm" id="btnVerRankingSala">🏆 Ver ranking de la sala</button>
        <button class="btn btn-outline btn-sm" style="margin-top:.4rem;color:#ef4444;border-color:#ef444455" id="btnSalirSala">✖ Salir de la sala</button>
        <button class="btn btn-outline btn-sm" style="margin-top:.4rem" id="btnCrearOtraSala">➕ Crear otra sala</button>
      </div>`
    modosEl.style.display = 'none'
    joinSection.style.display = 'none'
    createSection.style.display = 'none'

    document.getElementById('btnSalirSala')!.addEventListener('click', () => {
      lsRemove(SALA_KEY)
      lsRemove(SALA_NOMBRE_KEY)
      modosEl.style.display = 'flex'
      resetModoTabs()
      renderEstado()
    })
    document.getElementById('btnCrearOtraSala')!.addEventListener('click', () => {
      const modosEl2 = document.getElementById('salaModoTabs')!
      const joinSection2 = document.getElementById('salaJoinSection')!
      const createSection2 = document.getElementById('salaCreateSection')!
      modosEl2.style.display = 'flex'
      document.getElementById('btnModoCrear')?.classList.add('active')
      document.getElementById('btnModoUnirse')?.classList.remove('active')
      joinSection2.style.display = 'none'
      createSection2.style.display = 'block'
      loadMisSalas()
    })
    document.getElementById('btnVerRankingSala')!.addEventListener('click', () => {
      // Pre-fill ranking sala tab and navigate
      const input = document.getElementById('rkSalaInput') as HTMLInputElement | null
      if (input) input.value = sala.code
      mostrarRanking()
      // Trigger sala tab load after screen transition
      setTimeout(() => {
        const salaTab = document.querySelector<HTMLButtonElement>('.rk-tab[data-tab="sala"]')
        salaTab?.click()
      }, 350)
    })
  } else {
    estadoEl.innerHTML = '<p class="sala-hint" style="margin-bottom:.5rem">No estás en ninguna sala. Uníte a una sala existente o creá una nueva.</p>'
    modosEl.style.display = 'flex'
    resetModoTabs()
  }
}

// ── Tabs modo (Unirse / Crear) ────────────────────────────────────────────────

function resetModoTabs(): void {
  document.getElementById('btnModoUnirse')?.classList.add('active')
  document.getElementById('btnModoCrear')?.classList.remove('active')
  const joinSection = document.getElementById('salaJoinSection')!
  const createSection = document.getElementById('salaCreateSection')!
  joinSection.style.display = 'block'
  createSection.style.display = 'none'
}

function initModoTabs(): void {
  const btnUnirse = document.getElementById('btnModoUnirse')!
  const btnCrear = document.getElementById('btnModoCrear')!
  const joinSection = document.getElementById('salaJoinSection')!
  const createSection = document.getElementById('salaCreateSection')!

  btnUnirse.addEventListener('click', () => {
    btnUnirse.classList.add('active')
    btnCrear.classList.remove('active')
    joinSection.style.display = 'block'
    createSection.style.display = 'none'
  })

  btnCrear.addEventListener('click', async () => {
    btnCrear.classList.add('active')
    btnUnirse.classList.remove('active')
    createSection.style.display = 'block'
    joinSection.style.display = 'none'
    await loadMisSalas()
  })
}

// ── Unirse ────────────────────────────────────────────────────────────────────

async function handleUnirse(): Promise<void> {
  const codeInput = document.getElementById('inputJoinCode') as HTMLInputElement
  const code = codeInput.value.trim().toUpperCase()
  if (!code) { await showAlert('Ingresá el código de sala.'); return }

  const btn = document.getElementById('btnUnirme') as HTMLButtonElement
  btn.disabled = true
  btn.textContent = '⏳ Verificando...'

  const existe = await verificarSala(code)
  btn.disabled = false
  btn.textContent = '✅ Unirme'

  if (!existe) {
    await showAlert(`No se encontró una sala activa con el código "${code}".\n\nVerificá el código con tu docente.`)
    return
  }

  lsSet(SALA_KEY, code)
  lsSet(SALA_NOMBRE_KEY, code)
  codeInput.value = ''
  renderEstado()
}

// ── Crear sala ────────────────────────────────────────────────────────────────

function generarCodigoAleatorio(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '23456789'
  const parte1 = letras[Math.floor(Math.random() * letras.length)]
  const parte2 = nums[Math.floor(Math.random() * nums.length)]
  const parte3 = letras[Math.floor(Math.random() * letras.length)]
  return parte1 + parte2 + parte3
}

async function handleCrear(): Promise<void> {
  const codeInput = document.getElementById('inputCrearCode') as HTMLInputElement
  const nameInput = document.getElementById('inputCrearNombre') as HTMLInputElement

  const code = codeInput.value.trim().toUpperCase()
  const nombre = nameInput.value.trim()

  if (!code || code.length < 2) { await showAlert('El código debe tener al menos 2 caracteres.'); return }
  if (!nombre) { await showAlert('Ingresá un nombre para la sala.'); return }

  const activasCount = await contarSalasActivas()
  if (activasCount >= 4) {
    await showAlert('Llegaste al límite de 4 salas activas. Desactivá o eliminá una sala antes de crear una nueva.')
    return
  }

  const btn = document.getElementById('btnCrearSala') as HTMLButtonElement
  btn.disabled = true
  btn.textContent = '⏳ Creando...'

  const ok = await crearSala(code, nombre, undefined)
  btn.disabled = false
  btn.textContent = '🏫 Crear Sala'

  if (!ok) {
    await showAlert(`No se pudo crear la sala.\nEl código "${code}" ya está en uso.\n\nProbá con otro código.`)
    return
  }

  lsSet(SALA_KEY, code)
  lsSet(SALA_NOMBRE_KEY, nombre)
  codeInput.value = ''
  nameInput.value = ''
  await showAlert(`¡Sala "${nombre}" creada!\n\nCódigo: ${code}\n\nCompartí este código con tus alumnos.`)
  renderEstado()
}

// ── Panel Mis Salas (docente) ─────────────────────────────────────────────────

async function loadMisSalas(): Promise<void> {
  const container = document.getElementById('misSalasContainer')!
  container.innerHTML = '<p class="sala-hint">⏳ Cargando tus salas...</p>'

  const salas = await fetchMisSalas()
  if (!salas.length) {
    container.innerHTML = '<p class="sala-hint" style="color:var(--text-faint)">No creaste ninguna sala aún. Usá el formulario de arriba.</p>'
    return
  }

  container.innerHTML = salas.map(s => renderSalaDocente(s)).join('')

  // Wire up buttons
  salas.forEach(s => {
    document.getElementById(`btnVerSala_${s.code}`)?.addEventListener('click', () => abrirRankingSala(s.code))
    document.getElementById(`btnLimpiarSala_${s.code}`)?.addEventListener('click', () => handleLimpiar(s.code, s.nombre))
    document.getElementById(`btnDesactivarSala_${s.code}`)?.addEventListener('click', () => handleDesactivar(s.code, s.nombre))
    document.getElementById(`btnEliminarSala_${s.code}`)?.addEventListener('click', () => handleEliminar(s.code, s.nombre))
  })
}

function renderSalaDocente(s: SalaInfo): string {
  const fecha = s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR') : '—'
  const estadoBadge = s.activa
    ? '<span class="sala-estado activa">activa</span>'
    : '<span class="sala-estado inactiva">inactiva</span>'
  return `
    <div class="sala-docente-card" id="salaCard_${s.code}">
      <div class="sala-docente-header">
        <span class="sala-code-display" style="font-size:1.3rem">${s.code}</span>
        ${estadoBadge}
      </div>
      <div class="sala-docente-nombre">${s.nombre}</div>
      ${s.descripcion ? `<div class="sala-docente-desc">${s.descripcion}</div>` : ''}
      <div class="sala-docente-fecha">Creada: ${fecha}</div>
      <div class="sala-docente-btns">
        <button class="btn btn-outline btn-xs" id="btnVerSala_${s.code}">🏆 Ver ranking</button>
        <button class="btn btn-outline btn-xs" id="btnLimpiarSala_${s.code}" style="color:#f59e0b;border-color:#f59e0b55">🗑 Limpiar scores</button>
        ${s.activa ? `<button class="btn btn-outline btn-xs" id="btnDesactivarSala_${s.code}" style="color:#ef4444;border-color:#ef444455">✖ Desactivar</button>` : ''}
        <button class="btn btn-outline btn-xs" id="btnEliminarSala_${s.code}" style="color:#ef4444;border-color:#ef444455;margin-top:.25rem">🗑️ Eliminar sala</button>
      </div>
    </div>`
}

function abrirRankingSala(code: string): void {
  const input = document.getElementById('rkSalaInput') as HTMLInputElement | null
  if (input) input.value = code
  mostrarRanking()
  setTimeout(() => {
    const salaTab = document.querySelector<HTMLButtonElement>('.rk-tab[data-tab="sala"]')
    salaTab?.click()
  }, 350)
}

async function handleLimpiar(code: string, nombre: string): Promise<void> {
  const ok = await showConfirm(`¿Borrar TODOS los scores de la sala "${nombre}" (${code})?\n\nEsta acción no se puede deshacer.`)
  if (!ok) return

  const btn = document.getElementById(`btnLimpiarSala_${code}`) as HTMLButtonElement
  btn.disabled = true
  btn.textContent = '⏳...'

  const exito = await limpiarScoresSala(code)
  if (exito) {
    await showAlert(`✅ Scores de "${nombre}" eliminados.`)
  } else {
    await showAlert('No se pudieron eliminar los scores. Verificá tu conexión.')
  }
  btn.disabled = false
  btn.textContent = '🗑 Limpiar scores'
}

async function handleDesactivar(code: string, nombre: string): Promise<void> {
  const ok = await showConfirm(`¿Desactivar la sala "${nombre}" (${code})?\n\nLos alumnos ya no podrán unirse con este código.`)
  if (!ok) return

  const exito = await desactivarSala(code)
  if (exito) {
    await showAlert(`Sala "${nombre}" desactivada.`)
    await loadMisSalas()
  } else {
    await showAlert('No se pudo desactivar. Verificá tu conexión.')
  }
}

async function handleEliminar(code: string, nombre: string): Promise<void> {
  const ok = await showConfirm(`¿Eliminar la sala "${nombre}" (${code}) y todos sus scores permanentemente?

Esta acción no se puede deshacer.`)
  if (!ok) return

  const btn = document.getElementById(`btnEliminarSala_${code}`) as HTMLButtonElement
  if (btn) { btn.disabled = true; btn.textContent = '⏳...' }

  const exito = await eliminarSala(code)
  if (exito) {
    await showAlert(`Sala "${nombre}" eliminada.`)
    await loadMisSalas()
  } else {
    await showAlert('No se pudo eliminar. Verificá tu conexión.')
    if (btn) { btn.disabled = false; btn.textContent = '🗑️ Eliminar sala' }
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function mostrarSala(): void {
  mostrar('salaScreen')
  renderEstado()
}

export function initSalaScreen(): void {
  document.getElementById('backFromSala')!.addEventListener('click', () => mostrar('menuPrincipal'))
  initModoTabs()
  document.getElementById('btnUnirme')!.addEventListener('click', handleUnirse)
  document.getElementById('inputJoinCode')!.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleUnirse()
  })
  document.getElementById('btnCrearSala')!.addEventListener('click', handleCrear)
  document.getElementById('btnGenerarCodigo')!.addEventListener('click', () => {
    const input = document.getElementById('inputCrearCode') as HTMLInputElement
    input.value = generarCodigoAleatorio()
  })
}
