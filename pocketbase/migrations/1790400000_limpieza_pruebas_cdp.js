/// <reference path="../pb_data/types.d.ts" />

// Borra los registros creados al verificar las reglas de 1789200000.
//
// Se cuenta antes de borrar y se imprimen los numeros: si un total no da lo
// esperado, el filtro esta mal, no los datos.
//
// El filtro es por marca `ZZ` en el codigo de sala y en el nombre de la clave,
// que es una marca que ninguna sala real va a tener: los codigos de verdad los
// escribe el docente y las claves se llaman "docente". No se filtra por nada
// que produccion pueda compartir.

migrate((app) => {
  const buscar = (coleccion, filtro) =>
    app.findRecordsByFilter(coleccion, filtro, '', 0, 0);

  const puntajes = buscar('cdp_scores', 'sala_code ~ "ZZ%"');
  const salas = buscar('cdp_salas', 'code ~ "ZZ%"');
  const claves = buscar('host_keys', 'nombre ~ "zz-test%"');
  console.log(`limpieza cdp -> a borrar: puntajes:${puntajes.length} ` +
    `salas:${salas.length} claves:${claves.length}`);

  for (const r of puntajes) app.delete(r);
  for (const r of salas) app.delete(r);
  for (const r of claves) app.delete(r);

  console.log('limpieza cdp -> quedan puntajes de prueba: ' +
    buscar('cdp_scores', 'sala_code ~ "ZZ%"').length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
