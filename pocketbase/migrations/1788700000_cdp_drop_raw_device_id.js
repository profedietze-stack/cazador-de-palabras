/// <reference path="../pb_data/types.d.ts" />

// Paso 2 de 2: elimina creator_device_id y device_id en crudo.
//
// ⚠️ NO APLICAR hasta que el cliente con soporte de hash este desplegado.
// Un navegador con el cliente viejo deja de ver sus propias salas en cuanto
// desaparezca la columna: para el docente, sus salas simplemente desaparecen
// de "mis salas" y no puede administrarlas.
//
// Esta es la migracion que realmente cierra el agujero. Comprobado en la
// prueba end-to-end del paso 1: robando el hash no se consigue nada, pero
// robando el UUID en crudo la suplantacion todavia funciona. Mientras exista
// la columna vieja, la vulnerabilidad sigue abierta.
//
// Checklist antes de correrla:
//   1. Cliente nuevo desplegado.
//   2. Crear una sala, cerrar y reabrir el navegador, confirmar que sigue
//      apareciendo en "mis salas" y que se puede desactivar y borrar.
//   3. Backup de data.db.
//
// Nota sobre las salas viejas: las creadas antes del paso 1 sólo tienen el
// UUID en crudo, sin hash. Al eliminar la columna quedan huerfanas — nadie
// las va a poder administrar. Si hay salas activas que importen, conviene
// que el docente las vuelva a crear antes de aplicar esto.
//
// Como aplicarla:
//   scp pocketbase/migrations/1788700000_cdp_drop_raw_device_id.js root@38.45.71.187:/root/
//   ssh root@38.45.71.187 "cp /opt/pocketbase/data.db /root/pb-backup-$(date +%F)-data.db"
//   ssh root@38.45.71.187 "docker cp /root/1788700000_cdp_drop_raw_device_id.js pocketbase:/pb_migrations/"
//   ssh root@38.45.71.187 "docker restart pocketbase"

migrate((app) => {
  const salas = app.findCollectionByNameOrId('cdp_salas');
  const f1 = salas.fields.find((f) => f.name === 'creator_device_id');
  if (f1) salas.fields.removeById(f1.id);
  salas.updateRule =
    '@request.body.code:isset = false && ' +
    '@request.body.creator_device_hash:isset = false';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  // El indice sobre device_id hay que sacarlo ANTES que la columna: SQLite
  // rechaza borrar una columna que un indice todavia referencia.
  // Se recrea sobre device_hash para no perder el proposito original.
  scores.indexes = scores.indexes
    .filter((sql) => !sql.includes('device_id'))
    .concat(['CREATE INDEX idx_cdp_scores_device_hash ON cdp_scores (device_hash)']);
  const f2 = scores.fields.find((f) => f.name === 'device_id');
  if (f2) scores.fields.removeById(f2.id);
  app.save(scores);
}, (app) => {
  const TEXT = (name) => ({
    name, type: 'text', required: false, presentable: false, hidden: false,
    system: false, min: 0, max: 128, pattern: '', autogeneratePattern: '',
  });
  const salas = app.findCollectionByNameOrId('cdp_salas');
  if (!salas.fields.find((f) => f.name === 'creator_device_id')) {
    salas.fields.add(new TextField(TEXT('creator_device_id')));
  }
  salas.updateRule =
    '@request.body.code:isset = false && ' +
    '@request.body.creator_device_id:isset = false && ' +
    '@request.body.creator_device_hash:isset = false';
  app.save(salas);

  const scores = app.findCollectionByNameOrId('cdp_scores');
  if (!scores.fields.find((f) => f.name === 'device_id')) {
    scores.fields.add(new TextField(TEXT('device_id')));
  }
  scores.indexes = scores.indexes
    .filter((sql) => !sql.includes('device_hash'))
    .concat(['CREATE INDEX idx_cdp_scores_device ON cdp_scores (device_id)']);
  app.save(scores);
});
