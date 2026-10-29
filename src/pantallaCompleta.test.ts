import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Auditoría 28-oct (UX-6): la pantalla completa se pedía sobre #gameScreen y el
// diálogo de «Salir», los avisos y el banner de errores están en <body>, fuera de
// ese elemento: no se dibujaban. Medido en Chromium real: el botón «Aceptar» no
// recibía el clic y el reloj seguía corriendo.

describe('pantalla completa', () => {
  const motor = readFileSync('src/game/GameEngine.ts', 'utf8')
  const pantalla = readFileSync('src/screens/GameScreen.ts', 'utf8')

  it('se pide sobre el documento entero, no sobre #gameScreen', () => {
    expect(motor).toContain('const el = document.documentElement')
    expect(pantalla).toContain('const el = document.documentElement')
    expect(pantalla).not.toContain("getElementById('gameScreen')!\n  const isFs")
    expect(motor).not.toMatch(/gameEl\.requestFullscreen|gameScreen'\)!?\.requestFullscreen/)
  })

  it('el reloj se detiene mientras el diálogo de «Salir» está abierto y se restaura', () => {
    const i = pantalla.indexOf("showConfirm('¿Salir del nivel?")
    const antes = pantalla.slice(Math.max(0, i - 250), i)
    const despues = pantalla.slice(i, i + 250)
    expect(antes).toContain('G.pausado = true')
    expect(despues).toContain('G.pausado = yaPausado')
  })
})
