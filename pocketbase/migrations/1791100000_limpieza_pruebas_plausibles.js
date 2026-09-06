/// <reference path="../pb_data/types.d.ts" />

// Borra los registros creados al verificar la regla de plausibilidad.
//
// Van marcados con codigos de sala ZZ..., que ninguna sala real puede tener:
// los codigos de verdad los escribe el docente.
//
// Se cuenta antes de borrar.

const MARCAS = ['ZZBASE', 'ZZVER', 'ZZREAL', 'ZZREQ', 'ZZFIN'];

migrate((app) => {
  let total = 0;
  for (const marca of MARCAS) {
    const encontrados = app.findRecordsByFilter('cdp_scores', `sala_code = "${marca}"`, '', 0, 0);
    for (const r of encontrados) { app.delete(r); total++; }
  }
  console.log('puntajes de prueba borrados: ' + total);
  console.log('puntajes restantes: ' +
    app.findRecordsByFilter('cdp_scores', 'id != ""', '', 0, 0).length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
