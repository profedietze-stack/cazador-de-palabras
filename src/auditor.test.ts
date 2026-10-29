import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { puntosPorAcierto } from './game/reglas'

// El auditor de PocketBase no puede importar el juego (corre aislado), asi que
// sus cifras se copian a mano. Este test evita que se desfasen sin que nadie lo note.
describe('auditor de puntajes', () => {
  const hook = readFileSync('pocketbase/hooks/auditor_puntajes.pb.js', 'utf8')

  it('el maximo por captura es el puntaje fijo del nivel por el mejor combo', () => {
    const m = hook.match(/PUNTOS_MAX_POR_CAPTURA = \{ 1: (\d+), 2: (\d+), 3: (\d+) \}/)
    expect(m).not.toBeNull()
    // ComboSystem usa AudioContext al importarse: se lee el codigo, no se carga.
    const mults = [...readFileSync('src/game/ComboSystem.ts', 'utf8').matchAll(/mult:\s*([\d.]+)/g)].map(x => Number(x[1]))
    expect(mults.length).toBeGreaterThan(3)
    const multMax = Math.max(...mults)
    const esperado = [1, 2, 3].map(n => Math.round(puntosPorAcierto(n) * multMax))
    expect([Number(m![1]), Number(m![2]), Number(m![3])]).toEqual(esperado)
  })

  it('no quedan referencias al puntaje por largo de palabra', () => {
    expect(hook).not.toMatch(/14 x 1\.0|caracteres/)
  })
})
