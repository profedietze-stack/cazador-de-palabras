/// <reference path="../pb_data/types.d.ts" />

// Paso 2 de 2 para sacar el identificador de dispositivo (hallazgo SEG-12).
// NO APLICADA. Se aplica DESPUES de desplegar el cliente y el servidor de duelos que
// ya no lo escriben ni lo leen, y de comprobar en uso real que «Mis salas» y el
// ranking siguen andando (CLAUDE.md §7: aditiva -> cliente dual -> verificacion ->
// recien ahi la limpieza). Probar antes en una copia de data.db.
//
// Que quita: `cdp_salas.creator_device_hash` y `cdp_scores.device_hash`. Eran un
// identificador persistente de un menor (el SHA-256 de un UUID), legible por quien
// tuviera el codigo de la sala, y sin ningun uso: la propiedad de una sala la da
// `owner_key_id` con la clave de docente.
//
// OJO 1: cdp_scores tiene el indice `idx_cdp_scores_device_hash` sobre la columna. Borrar
// el campo con el indice puesto falla («no such column: device_hash»): lo encontro la
// prueba en una copia, no se veia leyendo. Se quita el indice antes.
//
// OJO 2, con el orden: la regla de UPDATE de cdp_salas nombra `creator_device_hash`
// (`@request.body.creator_device_hash:isset = false`). PocketBase rechaza una regla
// que mencione un campo que no existe, asi que primero se reescribe la regla y
// recien despues se borra la columna.

const CLAUSULA = '@request.body.creator_device_hash:isset = false && ';

// Las reglas llegan al JSVM como un objeto (puntero de Go), no como un string de JS:
// `typeof regla === 'string'` da false y la regla NO se reescribia (lo mostro la prueba
// en la copia). Se convierte con String() antes de mirarla.
const regla = (col, nombre) => (col[nombre] === null || col[nombre] === undefined ? null : String(col[nombre]));

migrate((app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  const actual = regla(salas, 'updateRule');
  if (actual !== null && actual.includes(CLAUSULA)) {
    salas.updateRule = actual.replace(CLAUSULA, '');
    app.save(salas);
  }
  const f1 = salas.fields.find((f) => f.name === 'creator_device_hash');
  if (f1) {
    salas.fields.removeById(f1.id);
    app.save(salas);
  }

  const scores = app.findCollectionByNameOrId('cdp_scores');
  // Primero los indices que nombran la columna, en las dos colecciones.
  for (const col of [salas, scores]) {
    const sin = col.indexes.filter((i) => !/device_hash/.test(i));
    if (sin.length !== col.indexes.length) {
      col.indexes = sin;
      app.save(col);
    }
  }
  const f2 = scores.fields.find((f) => f.name === 'device_hash');
  if (f2) {
    scores.fields.removeById(f2.id);
    app.save(scores);
  }
}, (app) => {
  const TEXT = (name) => ({
    name, type: 'text', required: false, presentable: false, hidden: false,
    system: false, min: 0, max: 128, pattern: '', autogeneratePattern: '',
  });

  const salas = app.findCollectionByNameOrId('cdp_salas');
  if (!salas.fields.find((f) => f.name === 'creator_device_hash')) {
    salas.fields.add(new TextField(TEXT('creator_device_hash')));
    app.save(salas);
  }
  const actual = regla(salas, 'updateRule');
  if (actual !== null && !actual.includes('creator_device_hash')) {
    salas.updateRule = CLAUSULA + actual;
    app.save(salas);
  }

  const scores = app.findCollectionByNameOrId('cdp_scores');
  if (!scores.fields.find((f) => f.name === 'device_hash')) {
    scores.fields.add(new TextField(TEXT('device_hash')));
    app.save(scores);
  }
  if (!scores.indexes.some((i) => /idx_cdp_scores_device_hash/.test(i))) {
    scores.indexes = [...scores.indexes, 'CREATE INDEX idx_cdp_scores_device_hash ON cdp_scores (device_hash)'];
    app.save(scores);
  }
});
