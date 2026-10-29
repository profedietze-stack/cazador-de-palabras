import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Wifi de escuela: un pedido que no contesta no puede dejar la pantalla en
// «Cargando...» para siempre; y la red caída no se puede confundir con «no existe».

describe('red', () => {
  const pbSrc = readFileSync('src/lib/pocketbase.ts', 'utf8')
  const svc = readFileSync('src/services/LeaderboardService.ts', 'utf8')
  const sala = readFileSync('src/screens/SalaScreen.ts', 'utf8')
  const rank = readFileSync('src/screens/RankingScreen.ts', 'utf8')

  it('todo pedido a PocketBase tiene tope de espera', () => {
    expect(pbSrc).toContain('TIMEOUT_PEDIDO_MS')
    expect(pbSrc).toMatch(/AbortController\(\)/)
    expect(pbSrc).toMatch(/options\.signal = c\.signal/)
  })

  it('verificarSala distingue «no existe» de «sin conexión»', () => {
    expect(svc).toMatch(/Promise<'si' \| 'no' \| 'red'>/)
    expect(svc).toMatch(/status === 404 \? 'no' : 'red'/)
    expect(sala).toContain("existe === 'red'")
    expect(sala).toContain('No se pudo conectar con el servidor')
  })

  it('el ranking vacío dice por qué está vacío', () => {
    expect(rank).toContain('Todavía no hay puntajes en esta sala')
    expect(rank).toContain('Todavía no jugaste partidas')
    expect(rank).not.toMatch(/renderTabla\(scores\)/)
  })
})

describe('banner de errores y arranque', () => {
  it('initErrorBanner es lo primero que corre en main.ts, antes de leer el guardado', () => {
    const m = readFileSync('src/main.ts', 'utf8')
    const i = m.indexOf('initErrorBanner()')
    expect(i).toBeGreaterThan(-1)
    const antes = m.slice(0, i)
    // lo único permitido antes son los imports
    expect(antes.split('\n').filter(l => l.trim() && !l.startsWith('import') && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith(' *'))).toEqual([])
  })
})
