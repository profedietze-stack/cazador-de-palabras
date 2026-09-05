/// <reference path="../pb_data/types.d.ts" />

// Clave por docente + privacidad, mismo esquema que ubicate.
//
// Cierra dos cosas que seguian abiertas:
//   - cdp_salas tenia DELETE publico: cualquiera podia borrar la sala de
//     cualquier docente.
//   - cdp_scores era de lectura publica: se listaban nombres de alumnos y
//     puntajes de todos los cursos juntos. Son datos de menores.
//
// Ademas habilita limpiarScoresSala(), que nunca funciono: borraba de
// cdp_scores con el DELETE bloqueado y devolvia false en silencio, mostrando
// "verifica tu conexion" cuando en realidad era la regla.

// La clave presentada existe y es la que dice ser.
const CLAVE_VALIDA =
  '@collection.host_keys.id ?= @request.headers.x_host_key_id && ' +
  '@collection.host_keys.key ?= @request.headers.x_host_key';

// Quien presenta la clave es el dueño de ESTA sala.
const ES_DUENIO = `owner_key_id = @request.headers.x_host_key_id && (${CLAVE_VALIDA})`;

const TEXT = (name, max) => ({
  name, type: 'text', required: false, presentable: false, hidden: false,
  system: false, min: 0, max: max || 128, pattern: '', autogeneratePattern: '',
});

migrate((app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  if (!salas.fields.find((f) => f.name === 'owner_key_id')) {
    salas.fields.add(new TextField(TEXT('owner_key_id', 40)));
  }
  // Un alumno con el codigo ve solo esa sala; el docente ve las suyas.
  salas.listRule = `code = @request.headers.x_sala_code || (${ES_DUENIO})`;
  salas.viewRule = salas.listRule;
  salas.createRule = '';
  salas.updateRule =
    '@request.body.code:isset = false && ' +
    '@request.body.owner_key_id:isset = false && ' +
    '@request.body.creator_device_hash:isset = false && ' +
    `(${ES_DUENIO})`;
  salas.deleteRule = ES_DUENIO;
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  // Los puntajes solo se leen desde la sala a la que pertenecen. Se termina el
  // ranking global, que mezclaba nombres de alumnos de todos los cursos.
  scores.listRule = 'sala_code = @request.headers.x_sala_code';
  scores.viewRule = scores.listRule;
  scores.createRule = '';        // los alumnos publican su puntaje
  scores.updateRule = null;      // nadie edita un puntaje ya cargado
  // El docente puede limpiar los puntajes de SU sala.
  scores.deleteRule =
    '@collection.cdp_salas.code ?= sala_code && ' +
    '@collection.cdp_salas.owner_key_id ?= @request.headers.x_host_key_id && ' +
    `(${CLAVE_VALIDA})`;
  app.save(scores);
}, (app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  const f = salas.fields.find((x) => x.name === 'owner_key_id');
  if (f) salas.fields.removeById(f.id);
  salas.listRule = ''; salas.viewRule = ''; salas.deleteRule = '';
  salas.updateRule =
    '@request.body.code:isset = false && ' +
    '@request.body.creator_device_hash:isset = false';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  scores.listRule = ''; scores.viewRule = '';
  scores.updateRule = null; scores.deleteRule = null;
  app.save(scores);
});
