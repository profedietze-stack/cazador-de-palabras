/// <reference path="../pb_data/types.d.ts" />

// Borra la sala envenenada que se uso para comprobar el arreglo del XSS del
// ranking. Tenia puntajes con nombres tipo `<img src=x onerror=...>`, cargados
// por la API a proposito para verificar que el escape los neutraliza.
//
// Se cuenta antes de borrar. Los filtros son por marcas que produccion no
// puede tener: codigo de sala ZZXSS1 y clave llamada zz-test-xss.

migrate((app) => {
  const buscar = (coleccion, filtro) =>
    app.findRecordsByFilter(coleccion, filtro, '', 0, 0);

  const puntajes = buscar('cdp_scores', 'sala_code = "ZZXSS1"');
  const salas = buscar('cdp_salas', 'code = "ZZXSS1"');
  const claves = buscar('host_keys', 'nombre = "zz-test-xss"');
  console.log(`limpieza xss -> a borrar: puntajes:${puntajes.length} ` +
    `salas:${salas.length} claves:${claves.length}`);

  for (const r of puntajes) app.delete(r);
  for (const r of salas) app.delete(r);
  for (const r of claves) app.delete(r);

  console.log('limpieza xss -> quedan puntajes envenenados: ' +
    buscar('cdp_scores', 'sala_code = "ZZXSS1"').length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
