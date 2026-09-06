/// <reference path="../pb_data/types.d.ts" />

// Borra los puntajes creados al verificar el auditor.
//
// Se cuenta e imprime antes de borrar, y se listan los marcados para poder
// revisar que el auditor haya hecho lo que se esperaba.

migrate((app) => {
  const encontrados = app.findRecordsByFilter(
    'cdp_scores', 'sala_code = "ZZAUD" || jugador ~ "ZZ-%"', '', 0, 0);

  console.log('puntajes de prueba del auditor: ' + encontrados.length);
  let marcados = 0;
  for (const r of encontrados) {
    if (r.get('sospechoso')) {
      marcados++;
      console.log('  marcado -> ' + r.get('motivo_sospecha'));
    }
    app.delete(r);
  }
  console.log(`borrados: ${encontrados.length} (marcados por el auditor: ${marcados})`);
  console.log('puntajes restantes: ' +
    app.findRecordsByFilter('cdp_scores', 'id != ""', '', 0, 0).length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
