import { G } from '../game/state'
import { ajustes, ganancia } from '../storage/ajustes'

const AC = window.AudioContext || (window as any).webkitAudioContext
let ac: AudioContext | null = null

function getAC(): AudioContext {
  if (!ac) ac = new AC()
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  return ac
}

// iOS Safari requires AudioContext.resume() inside a user gesture.
// Unlock on first touch/click so music starts correctly.
function unlockAudio(): void {
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => {})
}
document.addEventListener('touchend', unlockAudio, { once: false, passive: true })
document.addEventListener('click', unlockAudio, { once: false, passive: true })

function playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18): void {
  const k = ganancia(ajustes(), 'efectos')
  if (k === 0) return
  vol *= k
  try {
    const ctx = getAC(), t = ctx.currentTime
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.start(t); o.stop(t + dur)
  } catch (e) {}
}

export function sonidoOk(): void {
  playTone(880, 0.07)
  setTimeout(() => playTone(1100, 0.1), 70)
}

export function sonidoMal(): void {
  playTone(180, 0.22, 'sawtooth', 0.18)
}

/** Ráfaga de ruido filtrado: el «fiuu» de la flecha y el golpe seco al clavarse. */
function ruido(dur: number, f0: number, f1: number, vol: number, tipo: BiquadFilterType = 'bandpass', retraso = 0): void {
  const k = ganancia(ajustes(), 'efectos')
  if (k === 0) return
  try {
    const ctx = getAC(), t = ctx.currentTime + retraso
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(), fil = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = buf
    fil.type = tipo; fil.Q.value = 1.2
    fil.frequency.setValueAtTime(f0, t)
    fil.frequency.exponentialRampToValueAtTime(f1, t + dur)
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(vol * k, t + dur * 0.35)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(fil); fil.connect(g); g.connect(ctx.destination)
    src.start(t)
  } catch (e) {}
}

/** Tono que baja (o sube) de frecuencia: el «thunk» del clavado y el «tink» del rebote. */
function barrido(f0: number, f1: number, dur: number, tipo: OscillatorType, vol: number): void {
  const k = ganancia(ajustes(), 'efectos')
  if (k === 0) return
  try {
    const ctx = getAC(), t = ctx.currentTime
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = tipo
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    g.gain.setValueAtTime(vol * k, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.start(t); o.stop(t + dur + 0.02)
  } catch (e) {}
}

/** La flecha sale: un silbido corto que sube. */
export function sonidoLanzar(): void {
  ruido(0.16, 700, 2600, 0.16)
}

/** La flecha se clava en una palabra: golpe seco, grave y corto. */
export function sonidoClavar(): void {
  barrido(210, 70, 0.1, 'sine', 0.34)
  ruido(0.04, 3000, 900, 0.12, 'highpass')
}

/** La flecha rebota en una palabra equivocada: «tink» metálico. */
export function sonidoRebote(): void {
  barrido(1500, 760, 0.13, 'triangle', 0.14)
  ruido(0.05, 4000, 1500, 0.08, 'highpass')
}

export function sonidoBtn(): void {
  playTone(660, 0.06, 'sine', 0.08)
}

export function sonidoNivel(): void {
  ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.16, 'sine', 0.18), i * 110)
  )
}

export function playComboSound(nivel: number): void {
  const k = ganancia(ajustes(), 'efectos')
  if (k === 0) return
  try {
    const ctx = getAC(), t = ctx.currentTime
    const secs = [
      [880, 1100],
      [880, 1100, 1320],
      [880, 1100, 1320, 1568],
      [880, 1100, 1320, 1568, 1760],
      [659, 880, 1100, 1320, 1568, 1760, 2093],
    ]
    const notas = secs[Math.min(nivel - 1, secs.length - 1)]!
    notas.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = nivel === 5 ? 'triangle' : 'sine'; o.frequency.value = f
      const ini = t + i * 0.07
      g.gain.setValueAtTime(0, ini)
      g.gain.linearRampToValueAtTime(0.2 * k, ini + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ini + 0.18)
      o.start(ini); o.stop(ini + 0.22)
    })
    if (nivel === 5) {
      ;[262, 330, 392].forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.1 * k, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.65)
        o.start(t); o.stop(t + 0.68)
      })
    }
  } catch (e) {}
}

// ── Generative music ──
const NOTAS_MENU = [262, 294, 330, 349, 392, 440, 494, 523]
const NOTAS_JUEGO = [330, 370, 415, 440, 494, 554, 622, 659]

let musicaNode: ReturnType<typeof setTimeout> | null = null
let musicaActiva = false
let musicaTipo: 'menu' | 'juego' | null = null

export function iniciarMusica(tipo: 'menu' | 'juego'): void {
  if (ganancia(ajustes(), 'musica') === 0) return
  if (musicaTipo === tipo && musicaActiva) return
  detenerMusica()
  musicaActiva = true
  musicaTipo = tipo

  const notas = tipo === 'juego' ? NOTAS_JUEGO : NOTAS_MENU
  const bpm = tipo === 'juego' ? 130 : 72
  const beat = 60000 / bpm
  const patronMenu = [0, 2, 4, 7, 4, 2, 0, 4, 2, 5, 7, 4, 5, 3, 0, 2]
  const patronJuego = [0, 2, 4, 2, 4, 5, 4, 2, 0, 2, 4, 7, 5, 4, 2, 0]
  const patron = tipo === 'juego' ? patronJuego : patronMenu
  let paso = 0

  function tocarNota(): void {
    if (!musicaActiva) return
    // El volumen se lee en cada nota: moverlo en Ajustes se oye al instante.
    const km = ganancia(ajustes(), 'musica')
    if (km === 0) { musicaNode = setTimeout(tocarNota, beat); return }
    try {
      const ctx = getAC(), t = ctx.currentTime
      const idx = patron[paso % patron.length]!
      const freq = notas[idx % notas.length]!
      const vol = (tipo === 'juego' ? 0.08 : 0.055) * km
      const dur = tipo === 'juego' ? 0.16 : 0.32
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = tipo === 'juego' ? 'triangle' : 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.start(t); o.stop(t + dur + 0.05)
      if (tipo === 'juego' && paso % 4 === 0) {
        const ob = ctx.createOscillator(), gb = ctx.createGain()
        ob.connect(gb); gb.connect(ctx.destination)
        ob.type = 'sine'; ob.frequency.value = freq / 2
        gb.gain.setValueAtTime(0.06 * km, t)
        gb.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        ob.start(t); ob.stop(t + 0.25)
      }
    } catch (e) {}
    paso++
    musicaNode = setTimeout(tocarNota, beat)
  }
  tocarNota()
}

/** Arranca o corta la música según los ajustes y la pantalla en la que se está. */
export function refrescarMusica(): void {
  if (ganancia(ajustes(), 'musica') === 0) { detenerMusica(); return }
  const id = document.querySelector('.screen.active')?.id
  if (id === 'menuPrincipal' || id === 'seleccionCategoria' || id === 'preNivel' || id === 'ajustesScreen') {
    iniciarMusica('menu')
  } else if (id === 'gameScreen' && G.activo && !G.pausado) {
    iniciarMusica('juego')
  }
}

/** Para el botón «Probar sonido» de Ajustes. */
export function probarSonido(): void {
  sonidoOk()
  setTimeout(() => playComboSound(2), 260)
}

export function detenerMusica(): void {
  musicaActiva = false
  musicaTipo = null
  if (musicaNode) { clearTimeout(musicaNode); musicaNode = null }
}
