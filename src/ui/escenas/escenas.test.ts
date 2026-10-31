// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ESCENAS, horaDeNivel, cieloDeHora } from './index'
import type { Hora } from './dibujo'
import { MUNDOS, type Mundo } from '../../data/mundos'
import { montarPaisaje } from '../paisaje'
import { aterrizajeDe, lanzarHojas, lanzarAterrizaje } from '../../game/caida'
import { cambiarAjustes, restablecerAjustes } from '../../storage/ajustes'

/** Todos los mundos tienen escena de caza; el paisaje de colinas sigue siendo el plan B y se prueba sin ella. */
const colinas = (m: Mundo): Mundo => { const { escena: _escena, ...resto } = m; return resto }

const HORAS: Hora[] = ['amanecer', 'dia', 'noche']
const ids = Object.keys(ESCENAS) as Array<keyof typeof ESCENAS>
const leer = (f: string): string => readFileSync(f, 'utf8')

beforeEach(() => {
  localStorage.clear()
  restablecerAjustes()
  ;(globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener() {} })
  document.body.innerHTML = '<div id="fondo"></div>'
})

describe('la hora del día sale del nivel', () => {
  it('1 amanecer, 2 día, 3 noche, y vuelve a empezar', () => {
    expect([1, 2, 3, 4, 5, 6].map(horaDeNivel)).toEqual(['amanecer', 'dia', 'noche', 'amanecer', 'dia', 'noche'])
  })
  it('un nivel raro (0, negativo, NaN, decimal) no rompe nada', () => {
    for (const n of [0, -1, -7, NaN, Infinity, 2.9]) expect(HORAS).toContain(horaDeNivel(n))
    expect(horaDeNivel(NaN)).toBe('amanecer')
  })
  it('la noche es noche y las otras dos horas son de día para el texto sobre el cielo', () => {
    expect(cieloDeHora('noche')).toBe('noche')
    expect(cieloDeHora('amanecer')).toBe('dia')
    expect(cieloDeHora('dia')).toBe('dia')
  })
})

describe('cada escena y cada hora', () => {
  for (const id of ids) {
    for (const hora of HORAS) {
      it(`${id} · ${hora}: tres SVG válidos, una sola línea de aterrizaje y sin recursos externos`, () => {
        const d = ESCENAS[id].dibujar(hora, true)
        for (const [nombre, svg] of [['fondo', d.fondo], ['izq', d.izq], ['der', d.der]] as const) {
          const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
          expect(doc.querySelector('parsererror'), nombre).toBeNull()
          expect(doc.documentElement.tagName.toLowerCase(), nombre).toBe('svg')
          expect(svg, nombre).not.toMatch(/https?:|url\(['"]?(?!#)/)   // nada de la red: solo degradés internos (#id)
        }
        const doc = new DOMParser().parseFromString(d.fondo, 'image/svg+xml')
        const marcas = doc.querySelectorAll('rect.pa-linea')
        expect(marcas.length).toBe(1)
        expect(Number(marcas[0]!.getAttribute('y'))).toBe(d.linea)
        expect(d.linea).toBeGreaterThan(300)
        expect(d.linea).toBeLessThan(520)
      })
    }
  }

  it('la escena sale igual cada vez (azar sembrado)', () => {
    for (const id of ids) for (const hora of HORAS) {
      expect(ESCENAS[id].dibujar(hora, true)).toEqual(ESCENAS[id].dibujar(hora, true))
    }
  })

  it('las tres horas se ven distintas', () => {
    for (const id of ids) {
      const v = HORAS.map(h => ESCENAS[id].dibujar(h, true).fondo)
      expect(new Set(v).size, id).toBe(3)
    }
  })

  it('de noche hay estrellas y de día no (salvo la tormenta del páramo, que tapa el cielo)', () => {
    for (const id of ids) {
      const estrellas = (h: Hora): number => (ESCENAS[id].dibujar(h, false).fondo.match(/<circle [^>]*fill="#fff" opacity=/g) ?? []).length
      if (id !== 'paramo') expect(estrellas('noche'), id).toBeGreaterThan(20)
      expect(estrellas('dia'), id).toBe(0)
    }
  })

  it('sin animación no hay luciérnagas ni fuego animado', () => {
    for (const id of ids) for (const hora of HORAS) {
      const d = ESCENAS[id].dibujar(hora, false)
      expect(d.fondo + d.izq + d.der, `${id} ${hora}`).not.toMatch(/esc-luci|esc-fuego|esc-vuelo|esc-rayo|esc-lluvia|esc-aurora|esc-nieve|viva-/)
    }
    const con = ESCENAS.campamento.dibujar('noche', true)
    expect(con.viva).toContain('viva-luci')
    expect(con.izq).toContain('esc-fuego')
  })

  it('el arte cubre bastante más que un celular: una pantalla apaisada no deja bordes vacíos', () => {
    const d = ESCENAS.bosque.dibujar('noche', false).fondo
    expect(d).toContain('viewBox="-350 0 1000 520"')
    expect(d).toContain('preserveAspectRatio="xMidYMax slice"')
    expect(d).toMatch(/M-350 520/)   // la cordillera arranca en el borde izquierdo del arte
  })

  it('los degradés de cada escena no chocan entre sí (los ids son únicos en el documento)', () => {
    for (const id of ids) {
      const d = ESCENAS[id].dibujar('noche', true)
      const todos = [...(d.fondo + d.izq + d.der).matchAll(/ id="([^"]+)"/g)].map(m => m[1])
      expect(new Set(todos).size, id).toBe(todos.length)
    }
  })
})

describe('la capa animada va aparte del fondo', () => {
  const ANIMADOS = /esc-(luci|nieve|vuelo|rayo|lluvia|aurora)/
  const VIVA = /viva-(luci|cae|vuelo|rayo|lluvia|aurora)/
  it('el fondo nunca lleva elementos animados: se pinta una sola vez', () => {
    for (const id of ids) for (const hora of HORAS) {
      expect(ESCENAS[id].dibujar(hora, true).fondo, `${id} ${hora}`).not.toMatch(ANIMADOS)
    }
  })
  it('lo animado está en `viva`, con el mismo encuadre que el fondo, y solo si hay animación', () => {
    for (const id of ids) for (const hora of HORAS) {
      const d = ESCENAS[id].dibujar(hora, true)
      if (d.viva) {
        expect(d.viva, `${id} ${hora}`).toContain('class="pa-escena pa-viva')
        expect(d.viva).toContain('viewBox="-350 0 1000 520"')
        expect(d.viva).toContain('preserveAspectRatio="xMidYMax slice"')
        expect(d.viva).toMatch(VIVA)
        expect(d.viva, 'dentro de las capas ya no se anima cada elemento').not.toMatch(ANIMADOS)
      }
      expect(ESCENAS[id].dibujar(hora, false).viva, `${id} ${hora} sin animación`).toBe('')
    }
  })
  it('cada escena tiene algo animado de noche (luciérnagas, nieve, aurora, rayo o fuego)', () => {
    for (const id of ids) {
      const d = ESCENAS[id].dibujar('noche', true)
      expect(d.viva !== '' || /esc-fuego/.test(d.izq), id).toBe(true)
    }
  })
  it('la capa animada se dibuja encima del fondo y debajo de los bordes', () => {
    document.body.innerHTML = '<div id="fondo"></div>'
    montarPaisaje(document.getElementById('fondo')!, MUNDOS.sustantivos, { animado: true, particulas: true, cielo: 'noche', hora: 'noche' })
    const orden = [...document.querySelectorAll('#fondo > svg')].map(s => (s.classList.contains('pa-viva') ? 'viva' : s.classList.contains('pa-borde') ? 'borde' : 'fondo'))
    expect(orden).toEqual(['fondo', 'viva', 'viva', 'borde', 'borde'])   // las luciérnagas van en dos capas que titilan a destiempo
  })
})

describe('qué mundos tienen escena', () => {
  it('cada mundo tiene su escena de caza', () => {
    const esperadas = {
      inicio: 'campamento', sustantivos: 'bosque', adjetivos: 'estepa', verbos: 'montana', adverbios: 'humedal',
      articulos: 'taiga', pronombres: 'desierto', preposiciones: 'canon', conjunciones: 'valle', interjecciones: 'paramo',
    }
    expect(Object.fromEntries(Object.entries(MUNDOS).map(([id, m]) => [id, m.escena]))).toEqual(esperadas)
  })
  it('cada aterrizaje es el que corresponde a la escena', () => {
    expect(Object.fromEntries(ids.map(i => [i, ESCENAS[i].aterrizaje]))).toEqual({
      campamento: 'agua', bosque: 'hojas', estepa: 'pasto', montana: 'nieve', humedal: 'agua',
      paramo: 'pasto', canon: 'polvo', taiga: 'nieve', desierto: 'polvo', valle: 'agua',
    })
  })
})

describe('montaje de la escena', () => {
  const op = (hora: Hora) => ({ animado: true, particulas: true, cielo: cieloDeHora(hora), hora })
  const el = (): HTMLElement => document.getElementById('fondo')!

  it('deja un SVG ancho y dos de borde, con la escena, la hora y el aterrizaje anotados', () => {
    montarPaisaje(el(), MUNDOS.sustantivos, op('dia'))
    expect(el().querySelectorAll('svg.pa-escena:not(.pa-viva)').length).toBe(1)
    expect(el().querySelectorAll('svg.pa-viva').length).toBe(2)   // luciérnagas en dos capas
    expect(el().querySelectorAll('svg.pa-borde.izq, svg.pa-borde.der').length).toBe(2)
    expect([el().dataset['escena'], el().dataset['hora'], el().dataset['aterrizaje']]).toEqual(['bosque', 'dia', 'hojas'])
    expect(el().querySelector('.pa-colina')).toBeNull()
  })
  it('el campamento aterriza en el agua; un mundo sin escena también', () => {
    montarPaisaje(el(), MUNDOS.inicio, op('noche'))
    expect(aterrizajeDe('body')).toBe('agua')
    montarPaisaje(el(), colinas(MUNDOS.articulos), op('noche'))
    expect(aterrizajeDe('body')).toBe('agua')
    for (const [mundo, tipo] of [[MUNDOS.sustantivos, 'hojas'], [MUNDOS.adjetivos, 'pasto'], [MUNDOS.verbos, 'nieve'], [MUNDOS.adverbios, 'agua'],
      [MUNDOS.articulos, 'nieve'], [MUNDOS.pronombres, 'polvo'], [MUNDOS.preposiciones, 'polvo'], [MUNDOS.conjunciones, 'agua'], [MUNDOS.interjecciones, 'pasto']] as const) {
      montarPaisaje(el(), mundo, op('noche'))
      expect(aterrizajeDe('body'), mundo.id).toBe(tipo)
    }
  })
  it('montar dos veces no duplica y desmontar limpia todo', () => {
    montarPaisaje(el(), MUNDOS.sustantivos, op('noche'))
    const desmontar = montarPaisaje(el(), MUNDOS.sustantivos, op('amanecer'))
    expect(el().querySelectorAll('svg').length).toBe(5)   // fondo, dos capas de luciérnagas y los dos bordes
    expect(el().dataset['hora']).toBe('amanecer')
    desmontar()
    expect(el().children.length).toBe(0)
    expect(el().dataset['escena']).toBeUndefined()
    expect(el().dataset['aterrizaje']).toBeUndefined()
  })
  it('con alto contraste no hay escena: fondo liso', () => {
    montarPaisaje(el(), MUNDOS.sustantivos, { ...op('noche'), apagarTodo: true })
    expect(el().children.length).toBe(0)
    expect(el().classList.contains('liso')).toBe(true)
  })
})

describe('hojas del aterrizaje', () => {
  it('saltan 8 hojas con su dirección y se retiran solas', () => {
    vi.useFakeTimers()
    const c = document.getElementById('fondo')!
    lanzarHojas(c, 50, 300)
    const hs = [...c.querySelectorAll<HTMLElement>('.hoja-aterriza')]
    expect(hs.length).toBe(8)
    for (const h of hs) { expect(h.style.getPropertyValue('--dx')).toMatch(/px$/); expect(h.style.left).toBe('50px') }
    vi.advanceTimersByTime(2000)
    expect(c.querySelectorAll('.hoja-aterriza').length).toBe(0)
    vi.useRealTimers()
  })
  it('lanzarAterrizaje elige el efecto de cada escena; con «reducir movimiento» no hay nada', () => {
    const c = document.getElementById('fondo')!
    lanzarAterrizaje(c, 1, 1, 'agua')
    expect(c.querySelectorAll('.onda-chapuzon').length).toBe(1)
    lanzarAterrizaje(c, 1, 1, 'hojas')
    expect(c.querySelectorAll('.hoja-aterriza').length).toBe(8)
    lanzarAterrizaje(c, 1, 1, 'pasto')
    expect(c.querySelectorAll('.brizna-aterriza').length).toBe(9)
    lanzarAterrizaje(c, 1, 1, 'nieve')
    expect(c.querySelectorAll('.copo-aterriza').length).toBe(10)
    lanzarAterrizaje(c, 1, 1, 'polvo')
    expect(c.querySelectorAll('.polvo-aterriza').length).toBe(7)
    c.innerHTML = ''
    cambiarAjustes({ reducirMovimiento: true })
    for (const t of ['agua', 'hojas', 'pasto', 'nieve', 'polvo'] as const) lanzarAterrizaje(c, 1, 1, t)
    expect(c.children.length).toBe(0)
  })
  it('briznas y copos se retiran solos', () => {
    vi.useFakeTimers()
    const c = document.getElementById('fondo')!
    for (const t of ['pasto', 'nieve', 'polvo'] as const) lanzarAterrizaje(c, 5, 5, t)
    vi.advanceTimersByTime(2000)
    expect(c.children.length).toBe(0)
    vi.useRealTimers()
  })
})

describe('estilos de las escenas', () => {
  const css = leer('src/styles/paisaje.css')
  it('el SVG ancho cubre la pantalla y los de borde se pegan a un costado a la altura completa', () => {
    expect(css).toMatch(/\.pa-escena\{[^}]*inset:0/)
    expect(css).toMatch(/\.pa-borde\{[^}]*height:100%/)
    expect(css).toMatch(/\.pa-borde\.izq\{left:0\}/)
    expect(css).toMatch(/\.pa-borde\.der\{right:0\}/)
  })
  it('el fuego se apaga con menos movimiento (sistema y Ajustes) y se pausa con la pestaña oculta', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{[^}]*\.esc-fuego[^}]*\{animation:none\}/)
    expect(css).toMatch(/html\[data-movimiento="reducido"\] \.esc-fuego/)
    expect(css).toMatch(/html\.pestana-oculta \.esc-fuego/)
  })
  it('hojas, briznas y copos también se ocultan con menos movimiento', () => {
    const comp = leer('src/styles/componentes.css')
    for (const clase of ['hoja-aterriza', 'brizna-aterriza', 'copo-aterriza', 'polvo-aterriza']) {
      expect(comp, clase).toMatch(new RegExp(String.raw`prefers-reduced-motion: reduce\)\s*\{[^}]*\.${clase}[,{]`))
      expect(comp, clase).toMatch(new RegExp(String.raw`html\[data-movimiento="reducido"\] \.${clase}[,{]`))
    }
  })
  it('cada capa animada se mueve entera (GPU), se apaga con menos movimiento y se pausa con la pestaña oculta', () => {
    for (const clase of ['viva-luci', 'viva-vuelo', 'viva-rayo', 'viva-lluvia', 'viva-aurora', 'viva-cae']) {
      expect(css, clase).toMatch(new RegExp(String.raw`\.${clase}\{[^}]*animation:${clase}`))
      expect(css, clase).toMatch(new RegExp(String.raw`prefers-reduced-motion: reduce\)\{[^}]*\.${clase}[,{]`))
      expect(css, clase).toMatch(new RegExp(String.raw`html\[data-movimiento="reducido"\] \.${clase}[,{]`))
      expect(css, clase).toMatch(new RegExp(String.raw`html\.pestana-oculta \.${clase}[,{]`))
    }
  })
  it('las animaciones de las capas solo tocan transform y opacity (lo único que la GPU hace sin repintar)', () => {
    const bloque = (n: string): string => { const i = css.indexOf(`@keyframes ${n}`); return css.slice(i, css.indexOf('\n', i)) }
    for (const n of ['viva-luci', 'viva-vuelo', 'viva-rayo', 'viva-lluvia', 'viva-aurora', 'viva-cae']) {
      const props = [...bloque(n).matchAll(/([a-z-]+)\s*:/g)].map(m => m[1])
      expect(props.length, n).toBeGreaterThan(0)
      for (const prop of props) expect(['opacity', 'transform'], `${n}: ${prop}`).toContain(prop)
    }
  })
  it('la lámina de nieve tiene su copia de arriba para que la caída no se corte', () => {
    expect(css).toMatch(/\.viva-arriba\{[^}]*top:-100%/)
    expect(css).toMatch(/@keyframes viva-cae\{from\{transform:translateY\(0\)\}to\{transform:translateY\(100%\)\}\}/)
  })
})
