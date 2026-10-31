// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ESCENAS, horaDeNivel, cieloDeHora } from './index'
import type { Hora } from './dibujo'
import { MUNDOS } from '../../data/mundos'
import { montarPaisaje } from '../paisaje'
import { aterrizajeDe, lanzarHojas, lanzarAterrizaje } from '../../game/caida'
import { cambiarAjustes, restablecerAjustes } from '../../storage/ajustes'

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

  it('de noche hay estrellas y de día no', () => {
    for (const id of ids) {
      const estrellas = (h: Hora): number => (ESCENAS[id].dibujar(h, false).fondo.match(/<circle [^>]*fill="#fff" opacity=/g) ?? []).length
      expect(estrellas('noche'), id).toBeGreaterThan(20)
      expect(estrellas('dia'), id).toBe(0)
    }
  })

  it('sin animación no hay luciérnagas ni fuego animado', () => {
    for (const id of ids) for (const hora of HORAS) {
      const d = ESCENAS[id].dibujar(hora, false)
      expect(d.fondo + d.izq + d.der, `${id} ${hora}`).not.toMatch(/esc-luci|esc-fuego/)
    }
    const con = ESCENAS.campamento.dibujar('noche', true)
    expect(con.fondo).toContain('esc-luci')
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

describe('qué mundos tienen escena', () => {
  it('inicio es el campamento y sustantivos el bosque; el resto sigue con colinas hasta las próximas tandas', () => {
    expect(MUNDOS.inicio.escena).toBe('campamento')
    expect(MUNDOS.sustantivos.escena).toBe('bosque')
    for (const [id, m] of Object.entries(MUNDOS)) {
      if (id !== 'inicio' && id !== 'sustantivos') expect(m.escena, id).toBeUndefined()
    }
  })
})

describe('montaje de la escena', () => {
  const op = (hora: Hora) => ({ animado: true, particulas: true, cielo: cieloDeHora(hora), hora })
  const el = (): HTMLElement => document.getElementById('fondo')!

  it('deja un SVG ancho y dos de borde, con la escena, la hora y el aterrizaje anotados', () => {
    montarPaisaje(el(), MUNDOS.sustantivos, op('dia'))
    expect(el().querySelectorAll('svg').length).toBe(3)
    expect(el().querySelectorAll('svg.pa-borde.izq, svg.pa-borde.der').length).toBe(2)
    expect([el().dataset['escena'], el().dataset['hora'], el().dataset['aterrizaje']]).toEqual(['bosque', 'dia', 'hojas'])
    expect(el().querySelector('.pa-colina')).toBeNull()
  })
  it('el campamento aterriza en el agua; un mundo sin escena también', () => {
    montarPaisaje(el(), MUNDOS.inicio, op('noche'))
    expect(aterrizajeDe('body')).toBe('agua')
    montarPaisaje(el(), MUNDOS.verbos, op('noche'))
    expect(aterrizajeDe('body')).toBe('agua')
    montarPaisaje(el(), MUNDOS.sustantivos, op('noche'))
    expect(aterrizajeDe('body')).toBe('hojas')
  })
  it('montar dos veces no duplica y desmontar limpia todo', () => {
    montarPaisaje(el(), MUNDOS.sustantivos, op('noche'))
    const desmontar = montarPaisaje(el(), MUNDOS.sustantivos, op('amanecer'))
    expect(el().querySelectorAll('svg').length).toBe(3)
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
  it('lanzarAterrizaje elige: agua → onda, hojas → hojas; y con «reducir movimiento» no hay nada', () => {
    const c = document.getElementById('fondo')!
    lanzarAterrizaje(c, 1, 1, 'agua')
    expect(c.querySelectorAll('.onda-chapuzon').length).toBe(1)
    lanzarAterrizaje(c, 1, 1, 'hojas')
    expect(c.querySelectorAll('.hoja-aterriza').length).toBe(8)
    c.innerHTML = ''
    cambiarAjustes({ reducirMovimiento: true })
    lanzarAterrizaje(c, 1, 1, 'hojas'); lanzarAterrizaje(c, 1, 1, 'agua')
    expect(c.children.length).toBe(0)
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
  it('luciérnagas y fuego se apagan con menos movimiento (sistema y Ajustes) y se pausan con la pestaña oculta', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{[^}]*\.esc-luci[^}]*\.esc-fuego\{animation:none\}/)
    expect(css).toMatch(/html\[data-movimiento="reducido"\] \.esc-luci/)
    expect(css).toMatch(/html\.pestana-oculta \.esc-luci/)
  })
  it('las hojas también se ocultan con menos movimiento', () => {
    const comp = leer('src/styles/componentes.css')
    expect(comp).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\.hoja-aterriza\{display:none\}/)
    expect(comp).toMatch(/html\[data-movimiento="reducido"\] \.hoja-aterriza\{display:none\}/)
  })
})
