import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Las cuentas que se cerraron en la auditoría no se reabren sin que un test lo diga.
describe('calidad de ingeniería', () => {
  const ts = JSON.parse(readFileSync('tsconfig.json', 'utf8')) as { compilerOptions: Record<string, unknown> }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }

  it('TypeScript en modo estricto (con noImplicitAny y strictNullChecks)', () => {
    expect(ts.compilerOptions['strict']).toBe(true)
    expect(ts.compilerOptions['noImplicitAny']).not.toBe(false)
    expect(ts.compilerOptions['noUncheckedIndexedAccess']).toBe(true)
  })

  it('hay lint, typecheck y test como scripts, y el test corre los archivos de verdad', () => {
    expect(pkg.scripts['lint']).toBe('eslint .')
    expect(pkg.scripts['typecheck']).toContain('tsc')
    expect(pkg.scripts['test']).toBe('vitest run')
    expect(readFileSync('vitest.config.ts', 'utf8')).toContain("'src/**/*.test.ts'")
  })

  it('ningún barajado usa sort con Math.random (no es un barajado)', () => {
    for (const f of ['src/utils.ts', 'src/game/WordSpawner.ts', 'src/game/distractores.ts', 'server/src/tablero.ts', 'server/src/PowerManager.ts']) {
      // Se ignoran los comentarios: algunos explican justamente por qué NO se usa.
      const codigo = readFileSync(f, 'utf8').split(/\r?\n/).filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join(' ')
      expect(codigo, f).not.toMatch(/sort\(\s*\(\)\s*=>\s*Math\.random/)
    }
  })
})
