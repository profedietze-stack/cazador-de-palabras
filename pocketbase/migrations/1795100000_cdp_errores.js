/// <reference path="../pb_data/types.d.ts" />

// Panel del docente (DID-13): que palabras le cuestan a la clase.
// NO APLICADA. Aditiva: crea una coleccion nueva y no toca ninguna existente.
// Probar en una copia de data.db (leer, crear y borrar con y SIN cabeceras, y con
// cabecera vacia) antes de aplicar, y recien despues desplegar el cliente que la usa.
//
// Privacidad (CLAUDE.md §15):
//   - sin device_hash ni ningun identificador de sesion: solo el nombre de pila
//     que ya se publica en el ranking;
//   - lectura y borrado SOLO para el dueno de la sala (a diferencia de los
//     puntajes, que ve cualquiera con el codigo): son datos de que le sale mal a
//     cada chico;
//   - el alumno puede crear, nadie puede editar.
// El guard `!= ""` va en cada rama: sin sesion, `@request.headers.*` vale "".

const CLAVE_VALIDA =
  '@collection.host_keys.id ?= @request.headers.x_host_key_id && ' +
  '@collection.host_keys.key ?= @request.headers.x_host_key';

const ES_DUENIO_DE_LA_SALA =
  '@request.headers.x_host_key_id != "" && ' +
  '@collection.cdp_salas.code ?= sala_code && ' +
  '@collection.cdp_salas.owner_key_id ?= @request.headers.x_host_key_id && ' +
  `(${CLAVE_VALIDA})`;

migrate((app) => {
  const c = new Collection({
    type: 'base',
    name: 'cdp_errores',
    listRule: ES_DUENIO_DE_LA_SALA,
    viewRule: ES_DUENIO_DE_LA_SALA,
    // Sala existente y activa; nivel dentro de rango (lo exige tambien el campo).
    createRule:
      'sala_code != "" && @collection.cdp_salas.code ?= sala_code && ' +
      '@collection.cdp_salas.activa ?= true',
    updateRule: null,
    deleteRule: ES_DUENIO_DE_LA_SALA,
    fields: [
      { type: 'text', name: 'sala_code', required: true, min: 4, max: 12 },
      { type: 'text', name: 'jugador', required: true, min: 1, max: 24 },
      { type: 'text', name: 'cat', required: true, min: 1, max: 32 },
      { type: 'number', name: 'nivel', required: true, min: 1, max: 3, onlyInt: true },
      { type: 'number', name: 'cazadas', required: false, min: 0, max: 1000, onlyInt: true },
      { type: 'number', name: 'erradas', required: false, min: 0, max: 1000, onlyInt: true },
      // { "palabra": cantidad_de_fallos } — la forma la valida el hook cdp_errores.pb.js
      { type: 'json', name: 'fallos', required: false, maxSize: 2000 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
    ],
    indexes: ['CREATE INDEX idx_cdp_errores_sala ON cdp_errores (sala_code)'],
  });
  app.save(c);
}, (app) => {
  const c = app.findCollectionByNameOrId('cdp_errores');
  app.delete(c);
});
