// «¿Por qué?» (DID-9): lo que se le dice al alumno cuando toca una palabra que
// no es de la categoría. Antes solo había un «-N» rojo: perdía puntos sin saber
// qué era la palabra ni cómo reconocerlo.

import { CATS } from '../data/categories'
import type { CategoryKey } from '../types'

const UN: Record<CategoryKey, string> = {
  sustantivos: 'un sustantivo', adjetivos: 'un adjetivo', verbos: 'un verbo', adverbios: 'un adverbio',
  articulos: 'un artículo', pronombres: 'un pronombre', preposiciones: 'una preposición',
  conjunciones: 'una conjunción', interjecciones: 'una interjección',
}

const PISTA: Record<CategoryKey, string> = {
  sustantivos: 'nombra personas, animales, cosas o ideas',
  adjetivos: 'dice cómo es el sustantivo',
  verbos: 'expresa una acción, un estado o un proceso',
  adverbios: 'dice cómo, dónde, cuándo o cuánto se hace algo',
  articulos: 'va antes del sustantivo e indica si es conocido o no',
  pronombres: 'reemplaza al sustantivo',
  preposiciones: 'une palabras e indica una relación (en, de, con)',
  conjunciones: 'une palabras u oraciones (y, pero, porque)',
  interjecciones: 'expresa una emoción',
}

// Palabras que se enseñan a propósito como «no es de esta categoría».
const ESPECIALES: Record<string, string> = {
  mi: 'acompaña al sustantivo (mi casa): es un determinante posesivo, no un pronombre',
  tu: 'acompaña al sustantivo (tu libro): es un determinante posesivo; el pronombre es «tú», con tilde',
  su: 'acompaña al sustantivo (su perro): es un determinante posesivo, no un pronombre',
  cada: 'acompaña al sustantivo (cada día): es un determinante indefinido',
  donde: 'indica lugar: es un adverbio relativo, no une dos oraciones por sí sola',
}

function categoriaCorrecta(w: string): CategoryKey | null {
  for (const [k, c] of Object.entries(CATS)) if (c.ok.includes(w)) return k as CategoryKey
  return null
}

const limpio = (w: string): string => w.replace(/[¡!]/g, '')

/** Frase corta para el alumno: qué es la palabra y cómo reconocerlo. */
export function explicarError(palabra: string, catJugada: CategoryKey): string {
  const w = limpio(palabra)
  const esp = ESPECIALES[palabra]
  if (esp) return `«${w}» ${esp}.`
  const real = categoriaCorrecta(palabra)
  if (real && real !== catJugada) {
    return `«${w}» no es ${UN[catJugada]}: es ${UN[real]} (${PISTA[real]}).`
  }
  return `«${w}» no es ${UN[catJugada]}: ${UN[catJugada]} ${PISTA[catJugada]}.`
}
