/// <reference path="../pb_data/types.d.ts" />

// Los ultimos puntajes de prueba, marcados por el nombre del jugador.
//
// La limpieza anterior filtraba por `sala_code`, y los casos que probaban
// "jugar sin sala" tienen `sala_code` nulo: no los agarraba ninguno de los
// filtros por sala. Se los reconoce por el apodo, que va marcado "ZZ-".
//
// Es el mismo tropiezo de siempre: el filtro se eligio mirando una parte de
// los datos de prueba y no todas. Por eso se cuenta e imprime antes de borrar,
// y se listan los apodos encontrados para poder revisarlos.

migrate((app) => {
  const encontrados = app.findRecordsByFilter('cdp_scores', 'jugador ~ "ZZ-%"', '', 0, 0);
  console.log('puntajes de prueba por apodo: ' + encontrados.length);
  for (const r of encontrados) {
    console.log('  ' + r.get('jugador') + ' | sala=' + (r.get('sala_code') || 'sin sala') +
      ' | pts=' + r.get('pts'));
    app.delete(r);
  }
  console.log('puntajes restantes: ' +
    app.findRecordsByFilter('cdp_scores', 'id != ""', '', 0, 0).length);
}, (app) => {
  // Sin vuelta atras: no se pueden recrear registros borrados.
});
