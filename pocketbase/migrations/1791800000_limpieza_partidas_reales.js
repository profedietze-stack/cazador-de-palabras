/// <reference path="../pb_data/types.d.ts" />

// Borra las partidas jugadas de verdad para probar el auditor, y el aula que
// se creo para ellas.
//
// Eran tres partidas reales (una por nivel), jugadas desde la interfaz del
// juego haciendo clic en las palabras mientras caian. Ninguna quedo marcada,
// que era lo que habia que comprobar: el auditor no acusa a quien juega bien.

migrate((app) => {
  const buscar = (col, filtro) => app.findRecordsByFilter(col, filtro, '', 0, 0);

  const puntajes = buscar('cdp_scores', 'sala_code = "ZZREAL" || jugador ~ "ZZ-%"');
  const salas = buscar('cdp_salas', 'code = "ZZREAL"');
  const claves = buscar('host_keys', 'nombre = "zz-test-real"');
  console.log(`a borrar -> puntajes:${puntajes.length} salas:${salas.length} claves:${claves.length}`);

  for (const r of puntajes) app.delete(r);
  for (const r of salas) app.delete(r);
  for (const r of claves) app.delete(r);

  console.log('puntajes restantes: ' + buscar('cdp_scores', 'id != ""').length);
  console.log('salas restantes: ' + buscar('cdp_salas', 'id != ""').length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
