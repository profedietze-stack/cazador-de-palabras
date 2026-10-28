/// <reference path="../pb_data/types.d.ts" />

// Valida la forma de `fallos` en cdp_errores. Un cliente puede mandar cualquier
// JSON; esto deja pasar solo { "palabra": entero 1..99 } con pocas claves y sin
// caracteres que no sean letras, para que lo que llegue al panel del docente
// (que igual se escapa al dibujar) no sea basura ni un vector.
//
// Todo va DENTRO del handler: el JSVM de PocketBase no comparte las constantes
// de nivel superior con los handlers.

onRecordCreateRequest((e) => {
  const MAX_CLAVES = 40;
  const MAX_LARGO = 24;
  const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¡!¿? ]+$/;

  const r = e.record;
  let fallos = r.get('fallos');
  if (typeof fallos === 'string') {
    try { fallos = JSON.parse(fallos); } catch (err) { fallos = null; }
  }
  // Los tipos que llegan de goja pueden ser objetos nativos de Go: se normaliza
  // pasando por JSON.
  try { fallos = JSON.parse(JSON.stringify(fallos)); } catch (err) { fallos = null; }

  if (fallos === null || fallos === undefined) { e.next(); return; }
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
