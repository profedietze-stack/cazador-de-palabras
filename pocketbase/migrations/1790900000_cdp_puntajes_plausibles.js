/// <reference path="../pb_data/types.d.ts" />

// El ranking deja de aceptar puntajes imposibles.
//
// `cdp_scores` tenia createRule vacia: aceptaba cualquier cosa. Comprobado
// contra produccion antes de este cambio, los cinco dieron 200:
//
//     nivel 1 con 260 pts (legitimo)   -> 200
//     nivel 1 con 999999 pts           -> 200
//     precision 500%                   -> 200
//     nivel 99                         -> 200
//     pts -100                         -> 200
//
// De donde salen los topes: el modo de un jugador termina la partida en cuanto
// `pts >= obj`, asi que el puntaje final no puede pasar del objetivo mas lo que
// sume la ultima captura. Objetivos: 250 / 350 / 500. La captura mas grande
// posible es la palabra mas larga del diccionario ("verdaderamente", 14
// caracteres) por el multiplicador de nivel por el combo maximo (x4):
//
//     nivel 1: 250 + 56  = 306
//     nivel 2: 350 + 84  = 434
//     nivel 3: 500 + 112 = 612
//
// Los topes son generosos a proposito. Un rechazo equivocado le borra el
// puntaje a un chico que jugo bien, que es peor que dejar pasar uno inflado.
//
// LO QUE ESTO NO HACE: no vuelve confiables los puntajes. Alguien puede seguir
// publicando 300 puntos sin haber jugado. El modo de un jugador corre entero en
// el dispositivo y no hay ninguna partida del lado del servidor con la cual
// contrastar. Lo que se cierra es el ranking arruinado con 999999 puntos, que
// es el daño que afecta al resto del curso.

const TOPES = { 1: 306, 2: 434, 3: 612 };

const PLAUSIBLE = [
  '@request.body.nivel >= 1',
  '@request.body.nivel <= 3',
  '@request.body.pts >= 0',
  '@request.body.precision >= 0',
  '@request.body.precision <= 100',
  '@request.body.cazadas >= 0',
  '@request.body.erradas >= 0',
  '@request.body.tiempo_usado >= 0',
  // El techo depende del nivel, asi que va como alternativa por cada uno.
  '(' + Object.entries(TOPES)
    .map(([niv, tope]) => `(@request.body.nivel = ${niv} && @request.body.pts <= ${tope})`)
    .join(' || ') + ')',
].join(' && ');

migrate((app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  scores.createRule = PLAUSIBLE;
  app.save(scores);
  console.log('cdp_scores.createRule endurecida');

  // Los registros de la prueba de linea de base.
  let borrados = 0;
  for (const r of app.findRecordsByFilter('cdp_scores', 'sala_code = "ZZBASE"', '', 0, 0)) {
    app.delete(r); borrados++;
  }
  console.log('registros de la prueba borrados: ' + borrados);
}, (app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  scores.createRule = '';
  app.save(scores);
});
