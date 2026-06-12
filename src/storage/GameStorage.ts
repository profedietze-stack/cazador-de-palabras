import type { GameRecord, AchievementRecord, PlayerData } from '../types'
import { G } from '../game/state'

function storageKey(): string {
  return 'cdp_' + G.jugador
}

export function cargarDatos(): PlayerData {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '{}') } catch (e) { return {} }
}

export function guardarDatos(d: PlayerData): void {
  localStorage.setItem(storageKey(), JSON.stringify(d))
}

export function getPartidas(): GameRecord[] {
  return cargarDatos().partidas || []
}

export function addPartida(p: GameRecord): void {
  const d = cargarDatos()
  if (!d.partidas) d.partidas = []
  d.partidas.push(p)
  guardarDatos(d)
}

export function getLogros(): AchievementRecord[] {
  return cargarDatos().logros || []
}

export function setLogros(l: AchievementRecord[]): void {
  const d = cargarDatos()
  d.logros = l
  guardarDatos(d)
}

export function getRankingGlobal(): (GameRecord & { jugador: string })[] {
  const all: (GameRecord & { jugador: string })[] = []
  for (const k in localStorage) {
    if (k.startsWith('cdp_') && k !== 'cdp_nombre' && k !== 'cdp_sonido' && k !== 'cdp_tema' && !k.startsWith('cdp_stk_')) {
      try {
        const d: PlayerData = JSON.parse(localStorage.getItem(k) || '{}')
        const jug = k.slice(4)
        ;(d.partidas || []).forEach(p => all.push({ ...p, jugador: jug }))
      } catch (e) {}
    }
  }
  return all.sort((a, b) => b.pts - a.pts).slice(0, 50)
}

export function getTotalCombosJugador(): number {
  return getPartidas().reduce((s, p) => s + (p.combosHechos || 0), 0)
}

export function skStickers(tipo: string): string {
  return 'cdp_stk_' + tipo + '_' + G.jugador
}

export function cargarLayoutStickers(tipo: string): any[] | null {
  try { return JSON.parse(localStorage.getItem(skStickers(tipo)) || 'null') } catch (e) { return null }
}

export function guardarLayoutStickers(tipo: string, layout: any[]): void {
  try { localStorage.setItem(skStickers(tipo), JSON.stringify(layout)) } catch (e) {}
}
