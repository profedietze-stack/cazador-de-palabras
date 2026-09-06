import { describe, it, expect } from 'vitest'
import {
  codigoSala, nombreJugador, tableroDePalabras, categorias, numeroEnRango,
  MAX_WORDS, MAX_NOMBRE,
} from '../validate'

// Regresión del fallo que tumbaba el servidor: `join_duel` con un `code` que
// no era texto hacía `data.code.toUpperCase()`, tiraba TypeError y mataba el
// proceso. Un paquete desde cualquier navegador cortaba los duelos de todos.

describe('codigoSala', () => {
  it('rechaza lo que no es texto en vez de explotar', () => {
    for (const v of [12345, null, undefined, {}, [], true, () => {}]) {
      expect(codigoSala(v)).toBeNull()
    }
  })

  it('acepta un código válido y lo normaliza', () => {
    expect(codigoSala('kuf4l')).toBe('KUF4L')
    expect(codigoSala('  AB3D  ')).toBe('AB3D')
  })

  it('rechaza caracteres fuera del alfabeto del servidor', () => {
    // I, O, 0 y 1 no se generan nunca: se prestan a confusión al dictarlos.
    expect(codigoSala('AB0D')).toBeNull()
    expect(codigoSala('AB<D')).toBeNull()
    expect(codigoSala('AB')).toBeNull()
    expect(codigoSala('ABCDEFGHIJ')).toBeNull()
  })
})

describe('nombreJugador', () => {
  it('nunca devuelve algo que no sea texto', () => {
    for (const v of [null, undefined, 42, {}, []]) {
      expect(typeof nombreJugador(v)).toBe('string')
    }
  })

  it('limita el largo', () => {
    expect(nombreJugador('a'.repeat(200)).length).toBe(MAX_NOMBRE)
  })

  it('saca caracteres de control', () => {
    expect(nombreJugador('An\u0000a\u001F')).toBe('Ana')
  })

  it('da un nombre por defecto si queda vacío', () => {
    expect(nombreJugador('')).toBe('Jugador')
    expect(nombreJugador('   ')).toBe('Jugador')
  })
})

describe('tableroDePalabras', () => {
  it('rechaza lo que no es un array', () => {
    for (const v of ['muchas', 42, null, undefined, {}]) {
      expect(tableroDePalabras(v)).toBeNull()
    }
  })

  it('descarta entradas inservibles y conserva las buenas', () => {
    const r = tableroDePalabras([
      { text: 'sol', isCorrect: true },
      null,
      { text: '' },
      'no soy un objeto',
      { text: 'azul' },
    ])
    expect(r).not.toBeNull()
    expect(r!.map(w => w.text)).toEqual(['sol', 'azul'])
    expect(r![0]!.isCorrect).toBe(true)
    expect(r![1]!.isCorrect).toBe(false)
  })

  it('reasigna ids correlativos, sin confiar en los del cliente', () => {
    const r = tableroDePalabras([
      { id: 'evil', text: 'sol' },
      { id: 'evil', text: 'mar' },
    ])
    expect(r!.map(w => w.id)).toEqual(['0', '1'])
  })

  it('pone tope a la cantidad, para que nadie llene la memoria', () => {
    const enormes = Array.from({ length: 5000 }, (_, i) => ({ text: 'p' + i }))
    expect(tableroDePalabras(enormes)!.length).toBe(MAX_WORDS)
  })

  it('devuelve null si no quedó ninguna palabra usable', () => {
    expect(tableroDePalabras([{ text: '' }, null])).toBeNull()
    expect(tableroDePalabras([])).toBeNull()
  })
})

describe('numeroEnRango', () => {
  it('acota y no deja pasar basura', () => {
    expect(numeroEnRango(9999, 10, 600, 60)).toBe(600)
    expect(numeroEnRango(-5, 10, 600, 60)).toBe(10)
    expect(numeroEnRango('infinito', 10, 600, 60)).toBe(60)
    expect(numeroEnRango(NaN, 10, 600, 60)).toBe(60)
    expect(numeroEnRango(Infinity, 10, 600, 60)).toBe(60)
    expect(numeroEnRango(30, 10, 600, 60)).toBe(30)
  })
})

describe('categorias', () => {
  it('acepta el formato nuevo y el viejo', () => {
    expect(categorias(['sust', 'adj'], undefined)).toEqual(['sust', 'adj'])
    expect(categorias(undefined, 'sust')).toEqual(['sust'])
  })

  it('no explota con basura', () => {
    expect(categorias(42, null)).toEqual([])
    expect(categorias(undefined, undefined)).toEqual([])
  })
})
