import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { celdaPrecision, esFilaDeDuelo } from './utils/rankingFormato'

// Detalles encontrados en la revisión del 31-oct-2026 (duelo y sala docente con datos reales).

describe('ranking: la precisión no aplica a un duelo', () => {
  it('una fila de duelo muestra «—» en vez de «0%»', () => {
    expect(celdaPrecision(0, 'Duelo')).toBe('—')
    expect(celdaPrecision(0, 'duelo')).toBe('—')
    expect(celdaPrecision(37, 'Duelo')).toBe('—')
  })

  it('una partida normal conserva su porcentaje, incluso 0 %', () => {
    expect(celdaPrecision(96, 'Verbos')).toBe('96%')
    expect(celdaPrecision(0, 'Sustantivos')).toBe('0%')
    expect(celdaPrecision(100, '—')).toBe('100%')
  })

  it('una categoría que solo CONTIENE «duelo» no cuenta como duelo', () => {
    expect(esFilaDeDuelo('Duelo')).toBe(true)
    expect(esFilaDeDuelo('Preparación del duelo')).toBe(false)
    expect(esFilaDeDuelo('')).toBe(false)
  })

  it('la tabla del ranking usa ese formato', () => {
    const src = readFileSync('src/screens/RankingScreen.ts', 'utf8')
    expect(src).toContain('celdaPrecision(')
    expect(src).not.toContain('${escapeHtml(s.precision)}%')
  })
})

describe('sala de espera del duelo: el texto no anida signos de exclamación', () => {
  const src = readFileSync('src/screens/DuelLobbyScreen.ts', 'utf8')
  it('no dice «¡Presioná ¡Listo! cuando…»', () => {
    expect(src).not.toContain('¡Presioná ¡Listo!')
  })
  it('dice «¡Presioná «¡Listo!» cuando estés preparado!» en los dos lugares donde aparece', () => {
    expect(src.split('Presioná «¡Listo!» cuando estés preparado!').length - 1).toBe(2)
  })
})
