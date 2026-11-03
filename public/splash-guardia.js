/* global window, document, setTimeout */
// Guardia de la pantalla de carga. Si pasan 20 s y el juego no arrancó (conexión caída, un archivo que
// no llegó), avisa en lugar de dejar una pantalla de carga eterna. Es un archivo aparte y no un script
// dentro del HTML porque la política de seguridad (CSP) no permite scripts inline.
setTimeout(function () {
  if (window.__splashListo) return
  var e = document.querySelector('#splash .splash-error')
  if (e) e.hidden = false
}, 20000)
