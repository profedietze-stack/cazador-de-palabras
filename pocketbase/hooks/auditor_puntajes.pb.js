/// <reference path="../pb_data/types.d.ts" />

// Auditor de jugadas imposibles.
//
// Corre en el servidor, donde nadie lo puede apagar, y revisa que las cuentas
// de un puntaje cierren entre si. No mira si alguien "modifico el codigo" —eso
// no se puede detectar desde aca y ni siquiera hace falta modificar nada para
// hacer trampa—, mira si los numeros que declara son posibles jugando.
//
// NO RECHAZA Y NO DESCUENTA PUNTOS. Marca el registro y explica por que, para
// que lo vea el docente. Un rechazo automatico castiga al chico honesto cuando
// el chequeo se equivoca, y al que hace trampa a proposito solo le enseña a
// mandar un numero mas creible. Un puntaje raro es una conversacion, no una
// penalizacion.
//
// Los puntajes de duelo no se auditan: los calcula el servidor, que llevo la
// partida entera.
//
// Cada umbral sale de una constante real del juego. Si el juego cambia, hay
// que revisar esto o empieza a marcar partidas legitimas.

// --- Constantes tomadas del juego -------------------------------------------
//
// WordSpawner: por ola salen `cantidad` palabras, de las cuales `pcCorr` son
// correctas, y las olas no bajan de `msMin`.
//
//   nivel 1: 3 palabras, 70% correctas, ola minima 1400 ms -> 1.43 correctas/s
//   nivel 2: 5 palabras, 50% correctas, ola minima 1000 ms -> 3.00 correctas/s
//   nivel 3: 7 palabras, 30% correctas, ola minima  700 ms -> 2.86 correctas/s
//
// GameEngine: cada palabra vale su largo x el multiplicador de nivel, y el
// combo maximo multiplica por 4. La palabra mas larga del diccionario tiene 14
// caracteres.
//
//   nivel 1: 14 x 1.0 x 4 =  56 puntos como maximo en una captura
//   nivel 2: 14 x 1.5 x 4 =  84
//   nivel 3: 14 x 2.0 x 4 = 112

// IMPORTANTE: los hooks de PocketBase corren en un contexto aislado. El
// callback NO puede usar constantes ni funciones declaradas afuera: da
// "ReferenceError: ... is not defined" en cada peticion. Por eso todo vive
// dentro del handler, aunque quede mas largo.

onRecordCreateRequest((e) => {
  const TASA_CORRECTAS_POR_SEG = { 1: 1.43, 2: 3.0, 3: 2.86 };
  const PUNTOS_MAX_POR_CAPTURA = { 1: 56, 2: 84, 3: 112 };

  // Margen sobre los limites teoricos. Existe para no marcar a nadie por un
  // redondeo o por una constante que se me haya escapado: preferimos dejar pasar
  // algo raro antes que acusar a un chico que jugo bien.
  const MARGEN = 1.5;

  // La precision la calcula el cliente redondeando; se tolera la diferencia.
  const TOLERANCIA_PRECISION = 2;

  function revisar(r) {
    const motivos = [];

    const nivel = r.getInt('nivel') || 1;
    const pts = r.getInt('pts') || 0;
    const cazadas = r.getInt('cazadas') || 0;
    const erradas = r.getInt('erradas') || 0;
    const precision = r.getInt('precision') || 0;
    const combos = r.getInt('combos') || 0;
    const tiempo = r.getInt('tiempo_usado') || 0;

    // 1. La precision tiene que salir de las capturas declaradas.
    const total = cazadas + erradas;
    if (total > 0) {
      const esperada = Math.round((cazadas / total) * 100);
      if (Math.abs(esperada - precision) > TOLERANCIA_PRECISION) {
        motivos.push(`precision declarada ${precision}% pero ${cazadas} de ${total} da ${esperada}%`);
      }
    }

    // 2. No se pueden sumar mas puntos de los que dan las capturas declaradas.
    const maxPorCaptura = PUNTOS_MAX_POR_CAPTURA[nivel] || PUNTOS_MAX_POR_CAPTURA[1];
    const techoPorCapturas = Math.ceil(cazadas * maxPorCaptura * MARGEN);
    if (pts > techoPorCapturas) {
      motivos.push(`${pts} puntos con ${cazadas} capturas (el maximo posible seria ${techoPorCapturas})`);
    }

    // 3. No se pueden capturar mas palabras de las que llegaron a aparecer.
    if (tiempo > 0) {
      const tasa = TASA_CORRECTAS_POR_SEG[nivel] || TASA_CORRECTAS_POR_SEG[1];
      const techoPorTiempo = Math.ceil(tiempo * tasa * MARGEN);
      if (cazadas > techoPorTiempo) {
        motivos.push(`${cazadas} capturas en ${tiempo}s (en ese tiempo aparecen ${techoPorTiempo} como mucho)`);
      }
    } else if (cazadas > 0) {
      motivos.push(`${cazadas} capturas en 0 segundos`);
    }

    // 4. Cada combo necesita una racha de 3 aciertos.
    const techoCombos = Math.floor(cazadas / 3) + 1;
    if (combos > techoCombos) {
      motivos.push(`${combos} combos con ${cazadas} capturas (harian falta 3 aciertos por combo)`);
    }

    return motivos;
  }

  const r = e.record;

  // Los puntajes de duelo los calcula el servidor: no hay nada que auditar.
  if (r.get('modo') === 'duelo') {
    e.next();
    return;
  }

  let motivos = [];
  try {
    motivos = revisar(r);
  } catch (err) {
    // Que falle el auditor no puede impedir que un chico registre su puntaje.
    console.log('[auditor] error revisando un puntaje: ' + err);
    e.next();
    return;
  }

  if (motivos.length > 0) {
    r.set('sospechoso', true);
    r.set('motivo_sospecha', motivos.join(' | ').slice(0, 300));
    console.log(`[auditor] puntaje marcado: ${r.get('jugador')} ` +
      `(sala ${r.get('sala_code') || 'sin sala'}) -> ${motivos.join(' | ')}`);
  }

  e.next();
}, 'cdp_scores');
