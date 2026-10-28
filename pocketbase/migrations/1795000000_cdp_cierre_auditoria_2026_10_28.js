/// <reference path="../pb_data/types.d.ts" />

// Cierre de la auditoria del 28-oct-2026 (docs/auditoria-2026-10-28.md).
// NO APLICADA. Probar primero contra una copia de data.db con los scripts de
// seguridad (crear sala con owner_key_id ajeno, code de 4000 chars, puntaje con
// sospechoso:true) y recien despues aplicar, con backup de data.db antes.
//
// Que cierra:
//   - SEG-1: cdp_salas.createRule era '' y aceptaba owner_key_id y
//     creator_device_hash AJENOS. Un alumno con el codigo de un aula (los lee)
//     creaba una sala a nombre del docente con HTML en el nombre. Ahora quien
//     crea tiene que presentar la clave del owner_key_id que declara.
//   - SEG-4: cdp_scores aceptaba cualquier sala_code (inexistente o inactiva).
//     Se acepta vacio (partida sin sala) o una sala activa.
//   - SEG-8: tope de largo en los campos de texto (llegaban a 5000) y formato
//     del codigo de sala.
//   - SEG-11: sospechoso y motivo_sospecha los escribe el hook, no el cliente.
//
// Las reglas de cdp_scores se EXTIENDEN sobre la regla viva en vez de
// reemplazarla: la regla de plausibilidad (migracion 1790900000) y la del
// origen del duelo (1791300000) siguen donde estaban. El revert quita
// exactamente lo que esta migracion agrego.

const CLAVE_VALIDA =
  '@collection.host_keys.id ?= @request.headers.x_host_key_id && ' +
  '@collection.host_keys.key ?= @request.headers.x_host_key';

// Quien crea la sala presenta la clave del dueno que declara en el cuerpo.
const CREA_COMO_DUENIO =
  '@request.body.owner_key_id != "" && ' +
  '@request.body.owner_key_id = @request.headers.x_host_key_id && ' +
  `(${CLAVE_VALIDA})`;

const SUFIJO_SCORES =
  ' && @request.body.sospechoso:isset = false' +
  ' && @request.body.motivo_sospecha:isset = false' +
  ' && (sala_code = "" || (@collection.cdp_salas.code ?= sala_code && @collection.cdp_salas.activa ?= true))';

// [coleccion, campo, max, pattern]
const LIMITES = [
  ['cdp_salas', 'code', 12, '^[A-Z0-9]{4,12}$'],
  ['cdp_salas', 'nombre', 60, ''],
  ['cdp_salas', 'descripcion', 200, ''],
  ['cdp_scores', 'jugador', 24, ''],
  ['cdp_scores', 'cat', 32, ''],
  ['cdp_scores', 'cat_nombre', 40, ''],
  ['cdp_scores', 'sala_code', 12, ''],
];

migrate((app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  salas.createRule = CREA_COMO_DUENIO;
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  if (scores.createRule !== null && !scores.createRule.includes(SUFIJO_SCORES)) {
    scores.createRule = scores.createRule === ''
      ? SUFIJO_SCORES.slice(' && '.length)
      : `(${scores.createRule})${SUFIJO_SCORES}`;
  }
  app.save(scores);

  for (const [col, campo, max, pattern] of LIMITES) {
    const c = app.findCollectionByNameOrId(col);
    const f = c.fields.find((x) => x.name === campo);
    if (!f) continue;
    f.max = max;
    if (pattern) f.pattern = pattern;
    app.save(c);
  }
}, (app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  salas.createRule = '';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  const r = scores.createRule || '';
  if (r === SUFIJO_SCORES.slice(' && '.length)) {
    scores.createRule = '';
  } else if (r.endsWith(SUFIJO_SCORES) && r.startsWith('(')) {
    scores.createRule = r.slice(1, r.length - SUFIJO_SCORES.length - 1);
  }
  app.save(scores);

  for (const [col, campo, , pattern] of LIMITES) {
    const c = app.findCollectionByNameOrId(col);
    const f = c.fields.find((x) => x.name === campo);
    if (!f) continue;
    f.max = 5000;
    if (pattern) f.pattern = '';
    app.save(c);
  }
});
