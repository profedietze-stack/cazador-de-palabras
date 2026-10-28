// Qué distractores salen según el nivel (DID-11).
//
// Antes los tres niveles usaban el mismo pool: el nivel 3 era más rápido, no más
// difícil gramaticalmente. Ahora:
//   nivel 1: palabras de clases lejanas (`mal` sin `malCerca`);
//   nivel 2: mezcla;
//   nivel 3: las que se confunden de verdad (`malCerca`: p. ej. adjetivo↔adverbio).
// La copia del servidor está en server/src/tablero.ts (`distractoresParaNivel`).

import { shuffleArr } from '../utils'

export function distractoresParaNivel(mal: readonly string[], malCerca: readonly string[] | undefined, nivel: number): string[] {
  const cerca = new Set(malCerca ?? [])
  const lejos = mal.filter(w => !cerca.has(w))
  const cercaL = mal.filter(w => cerca.has(w))
  const a = [...lejos], b = [...cercaL]
  shuffleArr(a); shuffleArr(b)
  if (cercaL.length === 0) return a
  // Orden de preferencia: el pool que corresponde al nivel va primero.
  const entrelazado: string[] = []
  const pesoCerca = nivel <= 1 ? 0.15 : nivel === 2 ? 0.5 : 0.85
  let ia = 0, ib = 0
  while (ia < a.length || ib < b.length) {
    const quiereCerca = ib < b.length && (ia >= a.length || Math.random() < pesoCerca)
    entrelazado.push(quiereCerca ? b[ib++]! : a[ia++]!)
  }
  return entrelazado
}

/** Lo que se ve en la ficha: sin los signos de exclamación, que delataban la categoría. */
export function textoVisible(w: string): string {
  return w.replace(/[¡!]/g, '')
}
