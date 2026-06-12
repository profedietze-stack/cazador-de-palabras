import { G } from '../game/state'

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
  if (!G.sonido) return
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

export function sonidoBtn(): void {
  playTone(660, 0.06, 'sine', 0.08)
}

export function sonidoNivel(): void {
  ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.16, 'sine', 0.18), i * 110)
  )
}

export function playComboSound(nivel: number): void {
  if (!G.sonido) return
  try {
    const ctx = getAC(), t = ctx.currentTime
    const secs = [
      [880, 1100],
      [880, 1100, 1320],
      [880, 1100, 1320, 1568],
      [880, 1100, 1320, 1568, 1760],
      [659, 880, 1100, 1320, 1568, 1760, 2093],
    ]
    const notas = secs[Math.min(nivel - 1, secs.length - 1)]
    notas.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = nivel === 5 ? 'triangle' : 'sine'; o.frequency.value = f
      const ini = t + i * 0.07
      g.gain.setValueAtTime(0, ini)
      g.gain.linearRampToValueAtTime(0.2, ini + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ini + 0.18)
      o.start(ini); o.stop(ini + 0.22)
    })
    if (nivel === 5) {
      ;[262, 330, 392].forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.1, t)
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
  if (!G.sonido) return
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
    if (!G.sonido) { musicaNode = setTimeout(tocarNota, beat); return }
    try {
      const ctx = getAC(), t = ctx.currentTime
      const idx = patron[paso % patron.length]
      const freq = notas[idx % notas.length]
      const vol = tipo === 'juego' ? 0.08 : 0.055
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
        gb.gain.setValueAtTime(0.06, t)
        gb.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        ob.start(t); ob.stop(t + 0.25)
      }
    } catch (e) {}
    paso++
    musicaNode = setTimeout(tocarNota, beat)
  }
  tocarNota()
}

export function detenerMusica(): void {
  musicaActiva = false
  musicaTipo = null
  if (musicaNode) { clearTimeout(musicaNode); musicaNode = null }
}
