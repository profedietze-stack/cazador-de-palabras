/// <reference path="../pb_data/types.d.ts" />

// Campos donde el auditor deja su marca.
//
// El auditor NO rechaza ni descuenta puntos: marca el registro y explica por
// que. La decision es del docente, que conoce a sus alumnos; el servidor no.
// Un rechazo automatico castiga al chico honesto cuando el chequeo se
// equivoca, y el que hace trampa a proposito vuelve a intentar con un numero
// mas creible.
//
// `sospechoso` no lo puede poner el cliente: lo escribe el hook del servidor
// despues de revisar las cuentas.

migrate((app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');

  if (!scores.fields.find((f) => f.name === 'sospechoso')) {
    scores.fields.add(new BoolField({
      name: 'sospechoso', required: false, presentable: false,
      hidden: false, system: false,
    }));
  }
  if (!scores.fields.find((f) => f.name === 'motivo_sospecha')) {
    scores.fields.add(new TextField({
      name: 'motivo_sospecha', required: false, presentable: false,
      hidden: false, system: false, min: 0, max: 300,
      pattern: '', autogeneratePattern: '',
    }));
  }
  app.save(scores);
  console.log('cdp_scores: campos `sospechoso` y `motivo_sospecha`');
}, (app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  for (const n of ['sospechoso', 'motivo_sospecha']) {
    const f = scores.fields.find((x) => x.name === n);
    if (f) scores.fields.removeById(f.id);
  }
  app.save(scores);
});
