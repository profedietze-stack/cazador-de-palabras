import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Hallazgo SEG-12 de la auditoría: un identificador persistente de un menor
// (SHA-256 de un UUID) viajaba con cada puntaje y cada sala, legible por quien tuviera
// el código del aula, y no se usaba para nada. La propiedad la da la clave de docente.

function fuentes(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (n === '__tests__') continue
    const p = join(dir, n)
    if (statSync(p).isDirectory()) fuentes(p, acc)
    else if (/\.ts$/.test(n) && !/\.test\.ts$/.test(n)) acc.push(p)
  }
  return acc
}

describe('sin identificadores de dispositivo', () => {
  const codigo = [...fuentes('src'), ...fuentes('server/src')]

  it('ningún código del cliente ni del servidor escribe device_hash ni creator_device_hash', () => {
    const usos = codigo.flatMap(f =>
      readFileSync(f, 'utf8').split(/\r?\n/)
        .filter(l => /device_hash|creator_device|getDeviceHash|getDeviceId|cdp_device_id/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l))
        .map(l => `${f}: ${l.trim().slice(0, 80)}`))
    // la única mención permitida es el borrado de lo que dejaron versiones anteriores
    expect(usos.filter(u => !u.includes('lsRemove'))).toEqual([])
  })

  it('al arrancar se borra el identificador que hubiera quedado en el dispositivo', () => {
    const m = readFileSync('src/main.ts', 'utf8')
    expect(m).toContain("lsRemove('cdp_device_id')")
    expect(m).toContain("lsRemove('cdp_device_hash')")
  })

  it('la propiedad de las salas sale de la clave de docente (owner_key_id)', () => {
    const s = readFileSync('src/services/LeaderboardService.ts', 'utf8')
    expect(s).toContain("pb.filter('owner_key_id = {:id}'")
    expect(s).toContain('getHostKeyId()')
  })

  it('Supabase ya no está en el repo', () => {
    expect(existsSync('supabase')).toBe(false)
    expect(existsSync('src/lib/database.types.ts')).toBe(false)
    expect(readFileSync('CLAUDE.md', 'utf8')).not.toMatch(/anon key in `src\/lib\/supabase\.ts`/)
  })
})

describe('migración que quita las columnas (sin aplicar)', () => {
  const m = readFileSync('pocketbase/migrations/1796000000_cdp_quitar_device_hash.js', 'utf8')
  it('reescribe la regla de UPDATE ANTES de borrar el campo que la regla nombra', () => {
    const regla = m.indexOf('salas.updateRule = salas.updateRule.replace')
    const borrar = m.indexOf('salas.fields.removeById(f1.id)')
    expect(regla).toBeGreaterThan(-1)
    expect(borrar).toBeGreaterThan(regla)
  })
  it('tiene marcha atrás que devuelve los dos campos', () => {
    expect(m).toMatch(/\}, \(app\) => \{[\s\S]*TextField\(TEXT\('creator_device_hash'\)\)[\s\S]*TextField\(TEXT\('device_hash'\)\)/)
  })
})

// Los dos fallos que encontró la prueba en una copia de PocketBase 0.39.3 (no se veían leyendo):
describe('migración 1796000000: lo que mostró la prueba en la copia', () => {
  const m = readFileSync('pocketbase/migrations/1796000000_cdp_quitar_device_hash.js', 'utf8')

  it('quita el índice idx_cdp_scores_device_hash antes de borrar la columna', () => {
    const indice = m.indexOf('col.indexes = sin')
    const borrar = m.indexOf('scores.fields.removeById(f2.id)')
    expect(indice).toBeGreaterThan(-1)
    expect(borrar).toBeGreaterThan(indice)
  })

  it('lee las reglas con String(): en el JSVM son objetos y typeof da "object"', () => {
    expect(m).toContain('String(col[nombre])')
    expect(m).not.toMatch(/typeof\s+salas\.updateRule\s*===\s*'string'/)
  })

  it('la marcha atrás recrea el índice', () => {
    expect(m).toContain('CREATE INDEX idx_cdp_scores_device_hash ON cdp_scores (device_hash)')
  })
})
