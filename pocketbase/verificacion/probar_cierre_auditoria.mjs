// Verificación de las migraciones 1795000000 y 1795100000 contra una COPIA de
// PocketBase (nunca contra producción). Se corre desde la PC, por túnel SSH:
//
//   ssh -N -L 8091:127.0.0.1:8091 root@<IP_DEL_VPS>
//   BASE=http://127.0.0.1:8091 MODO=antes     node pocketbase/verificacion/probar_cierre_auditoria.mjs
//   BASE=http://127.0.0.1:8091 MODO=aplicado  node pocketbase/verificacion/probar_cierre_auditoria.mjs
//
// MODO=antes     -> la copia SIN las migraciones nuevas: tiene que mostrar los
//                   agujeros (es la evidencia de que la prueba prueba algo).
// MODO=aplicado  -> la copia CON las migraciones y el hook: todo tiene que cerrar.
// MODO=revertido -> después de `migrate down 2`: vuelve a lo de antes.
//
// Todo lo que crea lleva el prefijo ZZTEST_ / ZZT; como es una copia, la limpieza
// es borrar la copia entera. No usa ninguna credencial: prueba como lo haría un
// alumno con las DevTools.

const BASE = process.env.BASE ?? 'http://127.0.0.1:8091'
const MODO = process.env.MODO ?? 'aplicado'
if (!/^(127\.0\.0\.1|localhost)/.test(new URL(BASE).host)) {
  console.error('BASE tiene que ser local (túnel a la copia). Abortado: no se prueba contra producción.')
  process.exit(2)
}
if (!['antes', 'aplicado', 'revertido'].includes(MODO)) { console.error('MODO: antes | aplicado | revertido'); process.exit(2) }
const CERRADO = MODO === 'aplicado'

const azar = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
const RUN = 'ZZT' + azar()
const resultados = []

async function http(metodo, ruta, cuerpo, cabeceras = {}) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  let json = null
  try { json = await r.json() } catch { /* sin cuerpo */ }
  return { status: r.status, json }
}

const hdr = (k) => ({ 'x-host-key-id': k.id, 'x-host-key': k.key })
const sala = (code, owner, extra = {}) => ({ code, nombre: 'ZZTEST_Aula', descripcion: '', activa: true, owner_key_id: owner, ...extra })
const puntaje = (salaCode, extra = {}) => ({
  jugador: 'ZZTEST_Ana', sala_code: salaCode, modo: 'solo',
  cat: 'sustantivos', cat_nombre: 'Sustantivos', nivel: 1, pts: 100, medalla: 'ORO',
  precision: 100, cazadas: 10, erradas: 0, tiempo_usado: 60, combos: 1, ...extra,
})
const errores = (salaCode, fallos, extra = {}) => ({ sala_code: salaCode, jugador: 'ZZTEST_Ana', cat: 'adverbios', nivel: 1, cazadas: 10, erradas: 2, fallos, ...extra })

/** esperado: lista de estados aceptables, o 'ok' (2xx) / 'no-ok' (4xx). */
function chequear(nombre, res, esperado, detalle = '') {
  const s = res.status
  const bien = esperado === 'ok' ? s >= 200 && s < 300
    : esperado === 'no-ok' ? s >= 400 && s < 500
    : esperado.includes(s)
  resultados.push({ nombre, bien, estado: s, esperado: String(esperado), detalle: bien ? '' : (detalle || JSON.stringify(res.json)?.slice(0, 160)) })
}
const filas = (res) => (res.json && Array.isArray(res.json.items) ? res.json.items.length : null)

async function main() {
  console.log(`MODO=${MODO}  BASE=${BASE}  marca=${RUN}\n`)

  // ── claves de docente (host_keys se crea sin sesión: es como funciona hoy) ─────
  const mkKey = async (n) => {
    const key = (RUN + n + 'KEYKEYKEYKEYKEYKEYKEY').slice(0, 32)
    const r = await http('POST', '/api/collections/host_keys/records', { key, nombre: 'ZZTEST_docente' })
    return r.status === 200 ? { id: r.json.id, key } : null
  }
  const A = await mkKey('A'), B = await mkKey('B')
  if (!A || !B) { console.error('No pude crear las claves de prueba (host_keys). Revisá la copia.'); process.exit(2) }

  // ── 1. SEG-1: crear una sala a nombre de otro docente ──────────────────────────
  const ajena = await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'X1', B.id))
  chequear('crear sala con owner_key_id AJENO y sin clave', ajena, CERRADO ? 'no-ok' : 'ok')
  const ajena2 = await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'X2', B.id), hdr(A))
  chequear('crear sala con owner_key_id de B presentando la clave de A', ajena2, CERRADO ? 'no-ok' : 'ok')
  const propia = await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'S1', A.id), hdr(A))
  chequear('crear sala propia con la clave propia (tiene que seguir andando)', propia, 'ok')
  const propiaB = await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'S2', B.id), hdr(B))
  chequear('otro docente crea la suya', propiaB, 'ok')

  // ── 2. SEG-8: topes de largo y formato ─────────────────────────────────────────
  chequear('code de 40 caracteres', await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'L'.repeat(34), A.id), hdr(A)), CERRADO ? 'no-ok' : 'ok')
  chequear('code en minúsculas', await http('POST', '/api/collections/cdp_salas/records', sala((RUN + 'm1').toLowerCase(), A.id), hdr(A)), CERRADO ? 'no-ok' : 'ok')
  chequear('nombre de sala de 61 caracteres', await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'N1', A.id, { nombre: 'N'.repeat(61) }), hdr(A)), CERRADO ? 'no-ok' : 'ok')
  chequear('descripcion de 201 caracteres', await http('POST', '/api/collections/cdp_salas/records', sala(RUN + 'D1', A.id, { descripcion: 'D'.repeat(201) }), hdr(A)), CERRADO ? 'no-ok' : 'ok')
  chequear('jugador de 25 caracteres en un puntaje', await http('POST', '/api/collections/cdp_scores/records', puntaje(RUN + 'S1', { jugador: 'J'.repeat(25) })), CERRADO ? 'no-ok' : 'ok')

  // ── 3. SEG-4 / SEG-11: puntajes ───────────────────────────────────────────────
  chequear('puntaje en una sala que no existe', await http('POST', '/api/collections/cdp_scores/records', puntaje(RUN + 'NOEXISTE')), CERRADO ? 'no-ok' : 'ok')
  chequear('puntaje con sospechoso:true escrito por el cliente', await http('POST', '/api/collections/cdp_scores/records', puntaje(RUN + 'S1', { sospechoso: true, motivo_sospecha: 'ZZTEST' })), CERRADO ? 'no-ok' : 'ok')
  chequear('puntaje en una sala activa (tiene que seguir andando)', await http('POST', '/api/collections/cdp_scores/records', puntaje(RUN + 'S1')), 'ok')
  chequear('puntaje sin sala (partida solitaria; tiene que seguir andando)', await http('POST', '/api/collections/cdp_scores/records', puntaje(null)), 'ok')

  // ── 4. cdp_errores (solo existe con la migración 1795100000) ──────────────────
  if (!CERRADO) {
    const l = await http('GET', '/api/collections/cdp_errores/records?perPage=1', undefined, hdr(A))
    chequear('cdp_errores NO existe todavía', l, [404])
    return
  }
  const E = '/api/collections/cdp_errores/records'
  const ok1 = await http('POST', E, errores(RUN + 'S1', { rápido: 2, mucho: 1 }))
  chequear('errores válidos en sala activa', ok1, 'ok', 'si falla acá con "fallos no es JSON valido", toString() no devuelve el JSON en esta versión: ajustar el hook')
  chequear('errores en sala inexistente', await http('POST', E, errores(RUN + 'NOEXISTE', { a: 1 })), 'no-ok')
  chequear('errores sin sala', await http('POST', E, errores('', { a: 1 })), 'no-ok')
  chequear('fallos como array', await http('POST', E, errores(RUN + 'S1', ['a', 'b'])), 'no-ok')
  chequear('fallos con "<" en la palabra', await http('POST', E, errores(RUN + 'S1', { '<img src=x onerror=1>': 1 })), 'no-ok')
  chequear('fallos con valor 100', await http('POST', E, errores(RUN + 'S1', { a: 100 })), 'no-ok')
  chequear('fallos con valor decimal', await http('POST', E, errores(RUN + 'S1', { a: 1.5 })), 'no-ok')
  chequear('fallos con 41 palabras', await http('POST', E, errores(RUN + 'S1', Object.fromEntries(Array.from({ length: 41 }, (_, i) => ['p' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26)), 1])))), 'no-ok')
  chequear('palabra de 25 letras', await http('POST', E, errores(RUN + 'S1', { ['a'.repeat(25)]: 1 })), 'no-ok')
  chequear('nivel 4', await http('POST', E, errores(RUN + 'S1', { a: 1 }, { nivel: 4 })), 'no-ok')
  chequear('jugador de 25 caracteres', await http('POST', E, errores(RUN + 'S1', { a: 1 }, { jugador: 'J'.repeat(25) })), 'no-ok')

  // lectura: SOLO el dueño de la sala
  const q = `?filter=${encodeURIComponent(`sala_code="${RUN}S1"`)}`
  // «No ve nada» = respuesta 4xx, o 200 con CERO filas. 200 con filas es la fuga.
  const sinFilas = (nombre, res) => {
    const bien = (res.status >= 400 && res.status < 500) || (res.status === 200 && filas(res) === 0)
    resultados.push({ nombre, bien, estado: res.status, esperado: '4xx o 200 con 0 filas', detalle: bien ? '' : `filas=${filas(res)}` })
  }
  sinFilas('LISTAR sin cabeceras', await http('GET', E + q))
  sinFilas('LISTAR con cabeceras VACÍAS (cadena vacía)', await http('GET', E + q, undefined, { 'x-host-key-id': '', 'x-host-key': '', 'x-sala-code': '' }))
  sinFilas('un ALUMNO con el código de la sala NO ve los errores', await http('GET', E + q, undefined, { 'x-sala-code': RUN + 'S1' }))
  sinFilas('OTRO docente no ve los errores de esta sala', await http('GET', E + q, undefined, { ...hdr(B), 'x-sala-code': RUN + 'S1' }))
  const dueno = await http('GET', E + q, undefined, { ...hdr(A), 'x-sala-code': RUN + 'S1' })
  chequear('el DUEÑO ve sus errores', dueno, [200], JSON.stringify(dueno.json)?.slice(0, 200))
  const fila = dueno.json?.items?.[0]
  chequear('lo guardado es lo enviado ({rápido:2, mucho:1})', { status: fila && fila.fallos?.['rápido'] === 2 && fila.fallos?.mucho === 1 ? 200 : 500 }, [200], JSON.stringify(fila?.fallos))

  if (fila) {
    chequear('EDITAR un registro (nadie puede)', await http('PATCH', `${E}/${fila.id}`, { cazadas: 999 }, hdr(A)), 'no-ok')
    chequear('BORRAR por otro docente', await http('DELETE', `${E}/${fila.id}`, undefined, hdr(B)), 'no-ok')
    chequear('BORRAR por un alumno sin clave', await http('DELETE', `${E}/${fila.id}`), 'no-ok')
    chequear('BORRAR por el dueño', await http('DELETE', `${E}/${fila.id}`, undefined, hdr(A)), [204])
  }
}

await main().catch((e) => { console.error('Error de la prueba:', e); process.exit(2) })

const mal = resultados.filter((r) => !r.bien)
for (const r of resultados) {
  console.log(`${r.bien ? '  OK ' : ' FALLA'}  ${r.nombre}  [${r.estado}]${r.bien ? '' : `  esperado ${r.esperado}  ${r.detalle}`}`)
}
console.log(`\n${resultados.length - mal.length}/${resultados.length} bien en MODO=${MODO}`)
if (MODO === 'antes' || MODO === 'revertido') {
  console.log('En este modo "bien" significa que el agujero SIGUE abierto (es la evidencia previa). No es un error.')
}
process.exit(mal.length === 0 ? 0 : 1)
