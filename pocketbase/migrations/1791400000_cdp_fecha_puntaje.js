/// <reference path="../pb_data/types.d.ts" />

// La columna "Fecha" del ranking nunca mostro nada.
//
// `cdp_scores` no tiene ningun campo de fecha. El cliente pide `created` en la
// lista de campos y lo mapea a `fecha`, pero ese campo no existe en la
// coleccion: llega `undefined` y la celda queda vacia. Pasaba con TODOS los
// puntajes, no solo con los de duelo; aparecio al mirar el ranking renderizado
// en vez de los datos crudos.
//
// Se agrega `created` como autodate al crear. Los puntajes viejos quedan sin
// fecha —no hay de donde sacarla— pero eso hoy no afecta a nadie: los unicos
// registros existentes son de prueba.

migrate((app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');

  if (!scores.fields.find((f) => f.name === 'created')) {
    scores.fields.add(new AutodateField({
      name: 'created',
      onCreate: true,
      onUpdate: false,
      presentable: false,
      hidden: false,
      system: false,
    }));
    app.save(scores);
    console.log('cdp_scores: campo `created` agregado');
  } else {
    console.log('cdp_scores: `created` ya existia');
  }
}, (app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  const f = scores.fields.find((x) => x.name === 'created');
  if (f) scores.fields.removeById(f.id);
  app.save(scores);
});
