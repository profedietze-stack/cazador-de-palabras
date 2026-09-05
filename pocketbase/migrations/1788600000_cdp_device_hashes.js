/// <reference path="../pb_data/types.d.ts" />

// Paso 1 de 2 para cerrar la exposicion de la identidad de dispositivo.
//
// getDeviceId() genera un UUID que se guarda en localStorage y define la
// propiedad de las salas (creator_device_id). Ese UUID se escribe ademas en
// cdp_scores.device_id, y ambas colecciones tienen lectura publica.
//
// Consecuencia: cualquiera podia listar la coleccion, copiar el UUID del
// docente en su propio localStorage y quedar como duenio de sus salas —
// verlas en "mis salas", desactivarlas y borrarlas. Sin escribir una sola
// linea de codigo, solo editando localStorage.
//
// Solucion: guardar el SHA-256 del device id en vez del UUID. El cliente
// conoce el suyo, calcula el hash y consulta por hash. Un atacante lee el hash
// pero no puede derivar el UUID (UUIDv4 = 122 bits de entropia), asi que ya no
// puede hacerse pasar por ese dispositivo.
//
// Marcar los campos `hidden` no sirve: los ocultos solo los escribe un
// superusuario, y el cliente los necesita al crear la sala.
//
// Aditiva y en modo dual: los campos viejos siguen ahi hasta la migracion de
// limpieza, para que las salas creadas antes sigan siendo administrables por
// su duenio.

const TEXT = (name) => ({
  name,
  type: 'text',
  required: false,
  presentable: false,
  hidden: false,
  system: false,
  min: 0,
  max: 128,
  pattern: '',
  autogeneratePattern: '',
});

migrate((app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  if (!salas.fields.find((f) => f.name === 'creator_device_hash')) {
    salas.fields.add(new TextField(TEXT('creator_device_hash')));
  }
  // code y la identidad del creador no se tocan por UPDATE.
  // DELETE queda abierto a proposito: eliminarSala() lo usa y no hay auth con
  // la que verificar propiedad del lado del servidor.
  salas.updateRule =
    '@request.body.code:isset = false && ' +
    '@request.body.creator_device_id:isset = false && ' +
    '@request.body.creator_device_hash:isset = false';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  if (!scores.fields.find((f) => f.name === 'device_hash')) {
    scores.fields.add(new TextField(TEXT('device_hash')));
  }
  app.save(scores);
}, (app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  const f1 = salas.fields.find((f) => f.name === 'creator_device_hash');
  if (f1) salas.fields.removeById(f1.id);
  salas.updateRule = '';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  const f2 = scores.fields.find((f) => f.name === 'device_hash');
  if (f2) scores.fields.removeById(f2.id);
  app.save(scores);
});
