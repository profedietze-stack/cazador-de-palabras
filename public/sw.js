// Service worker de Cazador de Palabras.
//
// Los dos marcadores de abajo los reemplaza el build (vite.config.ts, plugin
// `sellarServiceWorker`): el nombre de la caché sale de una huella del contenido
// y la lista de precarga es la de los archivos reales del build. Así nadie tiene
// que acordarse de subir un número, y un archivo con hash nunca queda en una
// lista escrita a mano (con `addAll`, un solo 404 deja la caché vacía).
//
// Qué se aprendió de los service workers de los otros juegos (juegos-checklist §6.4):
//   - nunca `put` de un pedido que no es GET ni de una respuesta con error;
//   - clonar ANTES de devolver la respuesta: clonar después tira «body already used»
//     y el archivo no se cachea (así el juego nunca andaba sin internet);
//   - `respondWith` nunca se rechaza: si no hay nada, un 503 de texto;
//   - HTML network-first (versiones nuevas llegan solas), assets con hash cache-first;
//   - solo el propio origen: los GET a la API (ranking, salas) NO se cachean.

const CACHE = '__CACHE_NAME__'
const PRECACHE = __PRECACHE__

const alcance = (ruta) => new URL(ruta, self.registration.scope).href

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // Tolerante: lo que falle se avisa y se reintenta al usarse.
      Promise.allSettled(PRECACHE.map((u) => c.add(alcance(u)))).then((r) => {
        const fallidos = r.filter((x) => x.status === 'rejected').length
        if (fallidos > 0) console.warn('[sw] no se pudo precachear ' + fallidos + ' archivo(s)')
      }),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

/** Guarda una copia sin demorar la respuesta. `copia` ya es un clon. */
function guardar(e, req, copia) {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {}),
  )
}

const cacheable = (res) => res && res.ok && res.type === 'basic'

const sinConexion = () =>
  new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Otro origen (la API de PocketBase, el servidor de duelos): directo a la red.
  if (url.origin !== self.location.origin) return

  const esNavegacion = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')

  if (esNavegacion) {
    // Network-first: la versión nueva llega sola; sin red, la última guardada.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) guardar(e, req, res.clone())
          return res
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match(alcance('./index.html'))).then((c) => c || sinConexion()),
        ),
    )
    return
  }

  // Assets: los del build llevan hash en el nombre (inmutables) -> cache-first.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if (cacheable(res)) guardar(e, req, res.clone())
          return res
        })
        .catch(() => sinConexion())
    }),
  )
})
