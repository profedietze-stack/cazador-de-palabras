import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { esCodigoDuelo } from './utils'
import { generateCode } from '../server/src/validate'

// Regresión: el cliente exigía 4 caracteres y el servidor generaba 5, así que
// el segundo jugador nunca podía unirse a un duelo desde la interfaz.
describe('código de duelo: cliente y servidor coinciden', () => {
  it('el cliente acepta todo código que genera el servidor', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode()
      expect(esCodigoDuelo(code), code).toBe(true)
    }
  })

  it('rechaza lo que el servidor también rechazaría', () => {
    for (const malo of ['', 'ABC', 'ABCDEFGHI', 'AB0DE', 'ABIDE', 'abcde', 'AB CD', 'AB-CD']) {
      expect(esCodigoDuelo(malo), malo).toBe(false)
    }
  })

  it('la pantalla de unirse usa esa validación y no un largo fijo', () => {
    const src = readFileSync('src/screens/DuelMenuScreen.ts', 'utf8')
    expect(src).toContain('esCodigoDuelo(code)')
    expect(src).not.toMatch(/code\.length\s*!==\s*4/)
  })
})
