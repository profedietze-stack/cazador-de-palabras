/// <reference path="../pb_data/types.d.ts" />

// Borra lo creado al verificar la publicacion de puntajes de duelo.
//
// Se filtra por el aula de prueba (ZZAULA), por el apodo marcado y por la
// clave con nombre marcado: tres marcas que ninguna sala real puede tener.
// Se cuenta e imprime antes de borrar.

migrate((app) => {
  const buscar = (col, filtro) => app.findRecordsByFilter(col, filtro, '', 0, 0);

  const puntajes = buscar('cdp_scores', 'sala_code = "ZZAULA" || jugador ~ "ZZ-%"');
  const salas = buscar('cdp_salas', 'code = "ZZAULA"');
  const claves = buscar('host_keys', 'nombre = "zz-test-pub"');
  console.log(`a borrar -> puntajes:${puntajes.length} salas:${salas.length} claves:${claves.length}`);

  for (const r of puntajes) app.delete(r);
  for (const r of salas) app.delete(r);
  for (const r of claves) app.delete(r);

  console.log('puntajes restantes: ' + buscar('cdp_scores', 'id != ""').length);
  console.log('salas restantes: ' + buscar('cdp_salas', 'id != ""').length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
