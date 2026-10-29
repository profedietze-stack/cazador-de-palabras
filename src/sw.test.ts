import { describe, it, expect } from 'vitest'
import vm from 'node:vm'
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sellar, huella, listarArchivos } from '../tools/sellar-sw.mjs'

// El service worker es lo único del juego que falla en silencio. Antes
// (auditoría 28-oct, UX-2) clonaba la respuesta DESPUÉS de devolverla: tiraba
// «body already used», nunca cacheaba el JS ni el CSS y la recarga sin internet
// dejaba la página muerta. Acá se corre el sw.js REAL en un `self` de mentira.

const ORIGEN = 'https://juego.test'
const SW = readFileSync('public/sw.js', 'utf8')

type Handler = (e: unknown) => void

function entorno(opciones: { red: (url: string, init?: RequestInit) => Promise<Response>; precache?: string[] }) {
  const cachesMem = new Map<string, Map<string, Response>>()
  const clave = (r: Request | string) => (typeof r === 'string' ? r : r.url)
  const abrir = (n: string) => {
    if (!cachesMem.has(n)) cachesMem.set(n, new Map())
    const m = cachesMem.get(n)!
    return {
      async add(u: string) {
        const res = await opciones.red(u)
        if (!res.ok) throw new Error('addAll/add rechazado: ' + res.status)
        m.set(clave(u), res)
      },
      async put(r: Request | string, res: Response) {
        if (typeof r !== 'string' && r.method !== 'GET') throw new TypeError('put de un no-GET')
        await res.clone().arrayBuffer()   // lee el cuerpo, como hace el navegador
        m.set(clave(r), res)
      },
      async match(r: Request | string) { return m.get(clave(r))?.clone() },
    }
  }
  const handlers = new Map<string, Handler>()
  const self = {
    registration: { scope: ORIGEN + '/' },
    location: new URL(ORIGEN + '/sw.js'),
    clients: { claim: async () => {} },
    skipWaiting: () => {},
    addEventListener: (t: string, h: Handler) => handlers.set(t, h),
  }
  const caches = {
    open: async (n: string) => abrir(n),
    keys: async () => [...cachesMem.keys()],
    delete: async (n: string) => cachesMem.delete(n),
    match: async (r: Request | string) => {
      for (const m of cachesMem.values()) { const x = m.get(clave(r)); if (x) return x.clone() }
      return undefined
    },
  }
  const codigo = sellar(SW, (opciones.precache ?? ['index.html', 'assets/a-1.js']).map(ruta => ({ ruta, contenido: Buffer.from(ruta) })))
  const ctx = vm.createContext({
    self, caches, console: { warn: () => {}, log: () => {} }, URL, Response, Request, Promise,
    fetch: (r: Request | string) => opciones.red(typeof r === 'string' ? r : r.url, typeof r === 'string' ? undefined : r),
  })
  vm.runInContext(codigo, ctx)

  const evento = async (tipo: string, extra: Record<string, unknown> = {}) => {
    const esperas: Promise<unknown>[] = []
    let respuesta: Promise<Response> | undefined
    const e = {
      ...extra,
      waitUntil: (p: Promise<unknown>) => { esperas.push(Promise.resolve(p)) },
      respondWith: (p: Promise<Response>) => { respuesta = Promise.resolve(p) },
    }
    handlers.get(tipo)!(e)
    // `waitUntil` se llama de forma asincrónica (después de que responde la red):
    // se espera la respuesta primero y después todo lo que se haya colgado.
    if (respuesta) await respuesta.catch(() => {})
    for (let i = 0; i < 5; i++) await Promise.all(esperas.splice(0))
    return { respondio: respuesta !== undefined, respuesta }
  }
  return { cachesMem, handlers, evento, codigo }
}

const GET = (ruta: string, accept = '*/*', modo = 'cors') => {
  const r = new Request(ORIGEN + ruta, { headers: { accept } })
  Object.defineProperty(r, 'mode', { value: modo })
  return r
}

const sirve = (mapa: Record<string, string>) => async (url: string) => {
  const ruta = url.replace(ORIGEN, '')
  const cuerpo = mapa[ruta]
  if (cuerpo === undefined) return new Response('no', { status: 404 })
  return new Response(cuerpo, { status: 200 })
}

// `Response.type` es siempre 'default' en Node: se simula 'basic' (mismo origen).
const basica = (res: Response) => Object.defineProperty(res, 'type', { value: 'basic' })
const redBasica = (mapa: Record<string, string>) => async (u: string) => {
  const r = await sirve(mapa)(u)
  return r.ok ? basica(r) : r
}

describe('service worker', () => {
  it('el marcador __CACHE_NAME__ se reemplazó y la lista de precarga es la del build', () => {
    const { codigo } = entorno({ red: redBasica({}) })
    expect(codigo).not.toContain('__CACHE_NAME__')
    expect(codigo).not.toContain('__PRECACHE__')
    expect(codigo).toMatch(/const CACHE = "cdp-[0-9a-f]{10}"/)
  })

  it('install precachea todo lo que existe, aunque un archivo dé 404 (no es todo-o-nada)', async () => {
    const env = entorno({ red: redBasica({ '/index.html': 'html', '/assets/a-1.js': 'js' }), precache: ['index.html', 'assets/a-1.js', 'assets/falta.js'] })
    await env.evento('install')
    const [cache] = [...env.cachesMem.values()]
    expect([...cache!.keys()].sort()).toEqual([ORIGEN + '/assets/a-1.js', ORIGEN + '/index.html'])
  })

  it('un asset se cachea la primera vez Y lo que se devuelve sigue siendo legible (clon antes de devolver)', async () => {
    const env = entorno({ red: redBasica({ '/assets/b.js': 'contenido-b' }) })
    const { respuesta } = await env.evento('fetch', { request: GET('/assets/b.js') })
    expect(await (await respuesta!).text()).toBe('contenido-b')
    const [cache] = [...env.cachesMem.values()]
    expect(cache!.has(ORIGEN + '/assets/b.js')).toBe(true)
  })

  it('sin red, un asset ya visto sale de la caché y el HTML cae en el index guardado', async () => {
    let enLinea = true
    const mapa = { '/assets/b.js': 'js-b', '/index.html': 'html-index', '/': 'html-raiz' }
    const env = entorno({ red: async (u) => { if (!enLinea) throw new TypeError('offline'); return redBasica(mapa)(u) } })
    await env.evento('fetch', { request: GET('/assets/b.js') })
    await env.evento('install')            // precache de ./index.html
    enLinea = false
    const a = await env.evento('fetch', { request: GET('/assets/b.js') })
    expect(await (await a.respuesta!).text()).toBe('js-b')
    const h = await env.evento('fetch', { request: GET('/cualquier/ruta', 'text/html', 'navigate') })
    expect(await (await h.respuesta!).text()).toBe('html-index')
  })

  it('el HTML es network-first: con red sirve lo nuevo aunque haya una copia vieja', async () => {
    const mapa: Record<string, string> = { '/': 'v1', '/index.html': 'v1' }
    const env = entorno({ red: async (u) => redBasica(mapa)(u) })
    await env.evento('fetch', { request: GET('/', 'text/html', 'navigate') })
    mapa['/'] = 'v2'
    const r = await env.evento('fetch', { request: GET('/', 'text/html', 'navigate') })
    expect(await (await r.respuesta!).text()).toBe('v2')
  })

  it('nunca rechaza respondWith: sin red y sin caché da un 503 de texto', async () => {
    const env = entorno({ red: async () => { throw new TypeError('offline') } })
    const { respuesta } = await env.evento('fetch', { request: GET('/assets/x.js') })
    const res = await respuesta!
    expect(res.status).toBe(503)
  })

  it('no toca pedidos que no son GET ni de otro origen (la API no se cachea)', async () => {
    const env = entorno({ red: redBasica({}) })
    const post = new Request(ORIGEN + '/api/x', { method: 'POST', body: '{}' })
    expect((await env.evento('fetch', { request: post })).respondio).toBe(false)
    const api = new Request('https://aulaplay.duckdns.org/api/collections/cdp_scores/records')
    expect((await env.evento('fetch', { request: api })).respondio).toBe(false)
    expect(env.cachesMem.size).toBe(0)
  })

  it('no cachea una respuesta con error: no deja el error congelado', async () => {
    const env = entorno({ red: async () => basica(new Response('roto', { status: 500 })) })
    await env.evento('fetch', { request: GET('/assets/roto.js') })
    const todas = [...env.cachesMem.values()].flatMap(m => [...m.keys()])
    expect(todas).toEqual([])
  })

  it('activate borra las cachés de versiones anteriores', async () => {
    const env = entorno({ red: redBasica({}) })
    env.cachesMem.set('cdp-viejo', new Map())
    await env.evento('activate')
    expect([...env.cachesMem.keys()]).not.toContain('cdp-viejo')
  })
})

describe('sello de la caché', () => {
  const a = (ruta: string, c: string) => ({ ruta, contenido: Buffer.from(c) })

  it('cambia el contenido -> cambia el nombre; igual contenido -> mismo nombre', () => {
    expect(huella([a('x.js', '1')])).toBe(huella([a('x.js', '1')]))
    expect(huella([a('x.js', '1')])).not.toBe(huella([a('x.js', '2')]))
    expect(huella([a('x.js', '1')])).not.toBe(huella([a('y.js', '1')]))
  })

  it('sin marcadores el build falla en vez de publicar un sw sin sellar', () => {
    expect(() => sellar('const CACHE = "cdp-v4"', [])).toThrow(/marcadores/)
  })

  it('lista los archivos reales de un directorio y excluye sw.js y los mapas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sello-'))
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'index.html'), 'h')
    writeFileSync(join(dir, 'sw.js'), 'sw')
    writeFileSync(join(dir, 'assets', 'a-1.js'), 'js')
    writeFileSync(join(dir, 'assets', 'a-1.js.map'), 'm')
    expect(listarArchivos(dir).map(x => x.ruta)).toEqual(['assets/a-1.js', 'index.html'])
  })

  it('el sw publicado usa marcadores y no una lista a mano ni un nombre fijo', () => {
    expect(SW).toContain("'__CACHE_NAME__'")
    expect(SW).toContain('__PRECACHE__')
    expect(SW).not.toMatch(/cdp-v\d/)
    expect(SW).not.toMatch(/\.put\([^)]*\)[^;\n]*r\.clone\(\)\)\s*\n\s*return r/)
  })
})

describe('manifest', () => {
  const m = JSON.parse(readFileSync('public/manifest.json', 'utf8')) as { icons: Array<{ src: string; sizes: string; purpose: string }>; start_url: string }
  it('tiene íconos 192 y 512 (instalable) y uno maskable, y los archivos existen', () => {
    const tam = m.icons.map(i => i.sizes)
    expect(tam).toContain('192x192')
    expect(tam).toContain('512x512')
    expect(m.icons.some(i => i.purpose === 'maskable')).toBe(true)
    for (const i of m.icons) expect(() => readFileSync('public/' + i.src)).not.toThrow()
    expect(m.start_url).toBe('./')
  })

  it('index.html enlaza el manifest con la base, no con una ruta absoluta', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain('href="%BASE_URL%manifest.json"')
    expect(html).not.toContain('href="/manifest.json"')
  })
})
