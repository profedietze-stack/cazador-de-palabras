/// <reference path="../pb_data/types.d.ts" />

// Valida la forma de `fallos` en cdp_errores. Un cliente puede mandar cualquier
// JSON; esto deja pasar solo { "palabra": entero 1..99 } con pocas claves y sin
// caracteres que no sean letras, para que lo que llegue al panel del docente
// (que igual se escapa al dibujar) no sea basura ni un vector.
//
// Falla CERRADO: si no se puede leer `fallos` como JSON, se rechaza. Un
// validador que ante la duda deja pasar no valida nada. Por eso hay que probarlo
// en una copia antes de aplicarlo (ver docs/infra/probar-migraciones-en-copia.md):
// si `toString` no devolviera el JSON en esta version de PocketBase, un `fallos`
// valido se rechazaria y lo vas a ver en la prueba, no en el aula.
//
// Todo va DENTRO del handler: el JSVM de PocketBase no comparte las constantes
// de nivel superior con los handlers.

onRecordCreateRequest((e) => {
  const MAX_CLAVES = 40;
  const MAX_LARGO = 24;
  const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¡!¿? ]+$/;

  const r = e.record;
  const crudo = r.get('fallos');

  // Un campo JSON llega como bytes de Go (types.JSONRaw); `toString` los vuelve texto.
  let fallos = null;
  if (crudo !== null && crudo !== undefined) {
    let texto = '';
    try { texto = toString(crudo); } catch (err) { texto = ''; }
    if (texto && texto !== 'null') {
      try { fallos = JSON.parse(texto); } catch (err) {
        throw new BadRequestError('fallos no es JSON valido');
      }
    }
  }

  if (fallos === null) { e.next(); return; }
  if (typeof fallos !== 'object' || Array.isArray(fallos)) {
    throw new BadRequestError('fallos tiene que ser un objeto palabra -> cantidad');
  }

  const claves = Object.keys(fallos);
  if (claves.length > MAX_CLAVES) {
    throw new BadRequestError('fallos tiene demasiadas palabras');
  }
  const limpio = {};
  for (const k of claves) {
    const v = fallos[k];
    if (k.length === 0 || k.length > MAX_LARGO || !SOLO_LETRAS.test(k)) {
      throw new BadRequestError('fallos: palabra no valida');
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 99) {
      throw new BadRequestError('fallos: cantidad no valida');
    }
    limpio[k] = v;
  }
  r.set('fallos', limpio);
  e.next();
}, 'cdp_errores');
