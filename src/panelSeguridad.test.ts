import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// El panel muestra nombres y palabras que escribieron los alumnos, y guarda
// datos de menores: el HTML va escapado y la colección nueva nace cerrada.

describe('panel del docente: dibujo', () => {
  const src = readFileSync('src/screens/ResultadosSalaScreen.ts', 'utf8')

  it('ningún dato de un alumno entra crudo en el HTML', () => {
    const crudos = src.split('\n').filter(l => /\$\{\s*(a|w|c|p|r)\.[A-Za-z]+\s*\}/.test(l))
    expect(crudos).toEqual([])
  })

  it('escapa el nombre, las palabras y las categorías', () => {
    expect(src).toContain('escapeHtml(a.jugador)')
    expect(src).toContain('escapeHtml(textoVisible(w.palabra))')
    expect(src).toContain('escapeHtml(nombreCat(c.cat))')
  })
})

describe('migración cdp_errores (sin aplicar)', () => {
  const mig = readFileSync('pocketbase/migrations/1795100000_cdp_errores.js', 'utf8')

  it('no se puede editar y no guarda identificadores de dispositivo', () => {
    expect(mig).toMatch(/updateRule:\s*null/)
    expect(mig).not.toMatch(/name:\s*'(device|creator_device)/)
  })

  it('lee y borra solo el dueño de la sala, con el guard contra la cadena vacía', () => {
    expect(mig).toContain('@request.headers.x_host_key_id != ""')
    expect(mig).toMatch(/listRule:\s*ES_DUENIO_DE_LA_SALA/)
    expect(mig).toMatch(/viewRule:\s*ES_DUENIO_DE_LA_SALA/)
    expect(mig).toMatch(/deleteRule:\s*ES_DUENIO_DE_LA_SALA/)
    expect(mig).toContain('@collection.cdp_salas.owner_key_id ?= @request.headers.x_host_key_id')
  })

  it('crear exige una sala existente y activa, y tiene marcha atrás', () => {
    expect(mig).toContain('@collection.cdp_salas.activa ?= true')
    expect(mig).toMatch(/\}, \(app\) => \{[\s\S]*app\.delete\(/)
  })
})

describe('hook cdp_errores', () => {
  const hook = readFileSync('pocketbase/hooks/cdp_errores.pb.js', 'utf8')
  it('valida forma, cantidad y largo de fallos, todo dentro del handler', () => {
    expect(hook).toContain('onRecordCreateRequest')
    expect(hook).toMatch(/MAX_CLAVES\s*=\s*40/)
    expect(hook).toContain('SOLO_LETRAS')
    // el JSVM no comparte constantes de nivel superior con los handlers
    expect(hook.indexOf('const MAX_CLAVES')).toBeGreaterThan(hook.indexOf('onRecordCreateRequest'))
  })
})

describe('limpiar una sala', () => {
  const svc = readFileSync('src/services/LeaderboardService.ts', 'utf8')
  it('fija el contexto de ESTA sala, verifica el conteo y borra antes de eliminar la sala', () => {
    expect(svc).toMatch(/async function borrarContenidoDeSala\(code: string\)[\s\S]*setSalaContexto\(code\)/)
    expect(svc).toContain('quedan.totalItems')
    const i = svc.indexOf('export async function eliminarSala')
    const cuerpo = svc.slice(i, i + 700)
    expect(cuerpo.indexOf('borrarContenidoDeSala')).toBeGreaterThan(-1)
    expect(cuerpo.indexOf('borrarContenidoDeSala')).toBeLessThan(cuerpo.indexOf("collection('cdp_salas').delete"))
  })
})
