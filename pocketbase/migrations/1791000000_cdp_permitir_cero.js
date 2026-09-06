/// <reference path="../pb_data/types.d.ts" />

// Los campos numericos de un puntaje pueden valer cero.
//
// Estaban marcados como obligatorios, y PocketBase trata el 0 numerico como
// vacio: rechazaba el registro con "Cannot be blank". Comprobado campo por
// campo contra produccion, mandando 0 en cada uno:
//
//     pts          -> 400 validation_required
//     precision    -> 400 validation_required
//     cazadas      -> 400 validation_required
//     erradas      -> 400 validation_required
//     tiempo_usado -> 400 validation_required
//     combos       -> 200 (este ya estaba bien)
//
// El que importa es `erradas`. Un alumno que hace una partida perfecta, sin
// una sola equivocacion, manda `erradas: 0` y el servidor le rechaza el
// puntaje. Nunca aparece en el ranking. Y como `postScore` atrapa el error y
// muestra "Sin conexion", ni el chico ni el docente se enteran de que paso:
// el mejor del curso simplemente no figura.
//
// Es anterior a la regla de plausibilidad; aparecio al verificar que esa regla
// no generara rechazos falsos.
//
// Sacar `required` no afloja nada: la regla de plausibilidad ya exige que los
// valores esten en rango, y ahi el 0 siempre fue valido.

const CAMPOS = ['pts', 'precision', 'cazadas', 'erradas', 'tiempo_usado'];

migrate((app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');

  const cambiados = [];
  for (const nombre of CAMPOS) {
    const f = scores.fields.find((x) => x.name === nombre);
    if (!f) { console.log('no existe el campo: ' + nombre); continue; }
    if (f.required) { f.required = false; cambiados.push(nombre); }
  }
  app.save(scores);
  console.log('campos que ya aceptan cero: ' + (cambiados.join(', ') || 'ninguno'));

  // Registros de las pruebas de verificacion.
  let borrados = 0;
  for (const marca of ['ZZBASE', 'ZZVER', 'ZZREAL', 'ZZREQ']) {
    for (const r of app.findRecordsByFilter('cdp_scores', `sala_code = "${marca}"`, '', 0, 0)) {
      app.delete(r); borrados++;
    }
  }
  console.log('registros de prueba borrados: ' + borrados);
}, (app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  for (const nombre of CAMPOS) {
    const f = scores.fields.find((x) => x.name === nombre);
    if (f) f.required = true;
  }
  app.save(scores);
});
