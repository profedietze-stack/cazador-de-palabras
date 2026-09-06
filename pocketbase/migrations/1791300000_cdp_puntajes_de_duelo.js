/// <reference path="../pb_data/types.d.ts" />

// El duelo publica su puntaje al ranking, y lo escribe el servidor.
//
// Por que vale la pena: el servidor de duelos ya lleva la partida entera (el
// tablero lo arma el, y cada captura la valida el). Su puntaje no paso nunca
// por el dispositivo del alumno, asi que es confiable por construccion. En
// cambio el modo de un jugador corre entero en el celular y lo unico que se
// puede hacer con sus puntajes es acotarlos.
//
// Como se distingue quien escribe, sin secretos en ningun archivo:
//
//   - PocketBase no esta expuesto a internet: el puerto 8090 esta cerrado y
//     solo se llega por nginx (verificado desde afuera).
//   - nginx vacia la cabecera `X-Origen-Duelo` en TODA peticion publica, asi
//     que ningun cliente puede mandarla.
//   - El servidor de duelos habla con PocketBase por la red interna de Docker
//     (`http://pocketbase:8090`), sin pasar por nginx, y si puede ponerla.
//
// O sea: la cabecera no es un secreto, es una marca que solo sobrevive si la
// peticion no vino de afuera. No hay ninguna credencial que filtrar.
//
// El campo `modo` separa las dos clases de puntaje. Un cliente solo puede
// crear `solo` (o no mandarlo, como los clientes viejos); `duelo` solo lo
// puede crear quien tenga la marca interna.

const TOPES_SOLO = { 1: 306, 2: 434, 3: 612 };

// Tope del duelo: 18 correctas (nivel 3) x 10 x 3 = 540, y el DOBLE puede
// duplicar algunas. 2000 es holgado y sigue frenando un absurdo.
const TOPE_DUELO = 2000;

const PLAUSIBLE_SOLO = [
  '@request.body.nivel >= 1',
  '@request.body.nivel <= 3',
  '@request.body.pts >= 0',
  '@request.body.precision >= 0',
  '@request.body.precision <= 100',
  '@request.body.cazadas >= 0',
  '@request.body.erradas >= 0',
  '@request.body.tiempo_usado >= 0',
  '(' + Object.entries(TOPES_SOLO)
    .map(([niv, tope]) => `(@request.body.nivel = ${niv} && @request.body.pts <= ${tope})`)
    .join(' || ') + ')',
].join(' && ');

// Lo que puede crear un cliente: solo puntajes de un jugador.
const DESDE_CLIENTE =
  '(@request.body.modo:isset = false || @request.body.modo = "solo") && ' +
  `(${PLAUSIBLE_SOLO})`;

// Lo que puede crear el servidor de duelos. El tope va igual, por si algun dia
// la cabecera dejara de filtrarse: una sola linea de defensa es poca.
const DESDE_DUELO =
  '@request.headers.x_origen_duelo = "1" && ' +
  '@request.body.modo = "duelo" && ' +
  '@request.body.pts >= 0 && ' +
  `@request.body.pts <= ${TOPE_DUELO}`;

migrate((app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');

  if (!scores.fields.find((f) => f.name === 'modo')) {
    scores.fields.add(new TextField({
      name: 'modo', required: false, presentable: false, hidden: false,
      system: false, min: 0, max: 16, pattern: '', autogeneratePattern: '',
    }));
  }
  scores.createRule = `(${DESDE_CLIENTE}) || (${DESDE_DUELO})`;
  app.save(scores);
  console.log('cdp_scores: campo `modo` y regla de creacion por origen');

  // Los puntajes que ya existen son todos del modo de un jugador.
  let marcados = 0;
  for (const r of app.findRecordsByFilter('cdp_scores', 'modo = ""', '', 0, 0)) {
    r.set('modo', 'solo'); app.save(r); marcados++;
  }
  console.log('puntajes existentes marcados como `solo`: ' + marcados);
}, (app) => {
  const scores = app.findCollectionByNameOrId('cdp_scores');
  const f = scores.fields.find((x) => x.name === 'modo');
  if (f) scores.fields.removeById(f.id);
  scores.createRule = PLAUSIBLE_SOLO;
  app.save(scores);
});
