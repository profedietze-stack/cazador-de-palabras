import { describe, it, expect } from 'vitest'
import {
  AJUSTES_DE_FABRICA as F, normalizarAjustes, leerAjustes, ganancia, patronVibracion,
  oscuroEfectivo, MULTIPLICADOR_TAMANO, CLAVE_AJUSTES, POR_QUE_OPCIONES,
} from './ajustes'

describe('ajustes: lectura campo por campo', () => {
  it('sin nada guardado: valores de fábrica', () => {
    expect(normalizarAjustes(undefined)).toEqual(F)
    expect(normalizarAjustes(null)).toEqual(F)
    expect(normalizarAjustes('hola')).toEqual(F)
    expect(normalizarAjustes([])).toEqual(F)
  })

  it('un campo con el tipo cambiado cae en el de fábrica y no arrastra al resto', () => {
    const a = normalizarAjustes({ volGeneral: 'alto', musica: 'si', tema: 'oscuro', vibIntensidad: 7, tamanoPalabras: 'enorme' })
    expect(a.volGeneral).toBe(F.volGeneral)
    expect(a.musica).toBe(F.musica)
    expect(a.vibIntensidad).toBe(F.vibIntensidad)
    expect(a.tamanoPalabras).toBe(F.tamanoPalabras)
    expect(a.tema).toBe('oscuro')            // el campo bueno se conserva
  })

  it('los volúmenes se acotan a 0-100 y se redondean; NaN e Infinity no pasan', () => {
    expect(normalizarAjustes({ volMusica: 250 }).volMusica).toBe(100)
    expect(normalizarAjustes({ volMusica: -5 }).volMusica).toBe(0)
    expect(normalizarAjustes({ volMusica: 33.6 }).volMusica).toBe(34)
    expect(normalizarAjustes({ volMusica: NaN }).volMusica).toBe(F.volMusica)
    expect(normalizarAjustes({ volMusica: Infinity }).volMusica).toBe(F.volMusica)
  })

  it('«¿Por qué?» solo admite las duraciones ofrecidas', () => {
    for (const s of POR_QUE_OPCIONES) expect(normalizarAjustes({ porQueSeg: s }).porQueSeg).toBe(s)
    expect(normalizarAjustes({ porQueSeg: 4 }).porQueSeg).toBe(F.porQueSeg)
    expect(normalizarAjustes({ porQueSeg: '8' }).porQueSeg).toBe(F.porQueSeg)
  })

  it('un guardado que no es JSON cae en los de fábrica', () => {
    expect(leerAjustes('{roto', null, null)).toEqual(F)
  })

  it('el guardado nuevo gana sobre los botones viejos', () => {
    const g = JSON.stringify({ sonido: true, tema: 'claro' })
    expect(leerAjustes(g, '0', 'dark')).toMatchObject({ sonido: true, tema: 'claro' })
  })

  it('sin guardado nuevo se heredan el silencio y el tema oscuro de los botones viejos', () => {
    expect(leerAjustes(null, '0', 'dark')).toMatchObject({ sonido: false, tema: 'oscuro' })
    expect(leerAjustes(null, '1', 'light')).toMatchObject({ sonido: true, tema: 'claro' })
    expect(leerAjustes(null, null, null)).toEqual(F)
  })

  it('la clave de guardado no puede coincidir con la de un jugador (cdp_ + nombre)', () => {
    expect(CLAVE_AJUSTES.startsWith('cdp_')).toBe(false)
  })
})

describe('ajustes: sonido', () => {
  it('la ganancia es general × propio, y 0 si algo está apagado', () => {
    expect(ganancia({ ...F, volGeneral: 50, volMusica: 50 }, 'musica')).toBeCloseTo(0.25)
    expect(ganancia({ ...F, volGeneral: 100, volEfectos: 100 }, 'efectos')).toBe(1)
    expect(ganancia({ ...F, sonido: false }, 'efectos')).toBe(0)
    expect(ganancia({ ...F, sonido: false }, 'musica')).toBe(0)
    expect(ganancia({ ...F, musica: false }, 'musica')).toBe(0)
    expect(ganancia({ ...F, musica: false }, 'efectos')).toBeGreaterThan(0)
    expect(ganancia({ ...F, efectos: false }, 'efectos')).toBe(0)
    expect(ganancia({ ...F, volGeneral: 0 }, 'efectos')).toBe(0)
  })
})

describe('ajustes: vibración', () => {
  it('apagada: nunca vibra', () => {
    for (const e of ['acierto', 'error', 'combo'] as const) {
      expect(patronVibracion({ ...F, vibracion: false, vibAcierto: true, vibError: true, vibCombo: true }, e)).toBeNull()
    }
  })

  it('cada evento respeta su interruptor', () => {
    const a = { ...F, vibracion: true, vibAcierto: false, vibError: true, vibCombo: false }
    expect(patronVibracion(a, 'acierto')).toBeNull()
    expect(patronVibracion(a, 'error')).not.toBeNull()
    expect(patronVibracion(a, 'combo')).toBeNull()
  })

  it('la intensidad escala las vibraciones pero no las pausas', () => {
    const base = { ...F, vibracion: true, vibCombo: true }
    const suave = patronVibracion({ ...base, vibIntensidad: 'suave' }, 'combo')!
    const media = patronVibracion({ ...base, vibIntensidad: 'media' }, 'combo')!
    const fuerte = patronVibracion({ ...base, vibIntensidad: 'fuerte' }, 'combo')!
    expect(suave[0]!).toBeLessThan(media[0]!)
    expect(media[0]!).toBeLessThan(fuerte[0]!)
    expect(suave[1]).toBe(media[1])
    expect(media[1]).toBe(fuerte[1])
    expect(fuerte.every(n => n > 0 && n <= 200)).toBe(true)   // nada que moleste de verdad
  })
})

describe('ajustes: aspecto', () => {
  it('«auto» sigue al sistema; claro y oscuro lo ignoran', () => {
    expect(oscuroEfectivo({ ...F, tema: 'auto' }, true)).toBe(true)
    expect(oscuroEfectivo({ ...F, tema: 'auto' }, false)).toBe(false)
    expect(oscuroEfectivo({ ...F, tema: 'claro' }, true)).toBe(false)
    expect(oscuroEfectivo({ ...F, tema: 'oscuro' }, false)).toBe(true)
  })

  it('los tamaños de palabra crecen y el normal no cambia nada', () => {
    expect(MULTIPLICADOR_TAMANO.normal).toBe(1)
    expect(MULTIPLICADOR_TAMANO.grande).toBeGreaterThan(1)
    expect(MULTIPLICADOR_TAMANO.muygrande).toBeGreaterThan(MULTIPLICADOR_TAMANO.grande)
  })

  it('los ajustes no incluyen nada que cambie la dificultad ni el puntaje', () => {
    const claves = Object.keys(F)
    expect(claves.filter(k => /veloc|tiempo|punt|nivel|dificult|objetivo/i.test(k))).toEqual([])
  })
})
