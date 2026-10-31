import type { EscenaId } from '../../data/mundos'
import { dibujarBosque } from './bosque'
import { dibujarCampamento } from './campamento'
import type { Dibujo, Hora } from './dibujo'

export type { Dibujo, Hora } from './dibujo'

/** Cómo aterriza una palabra que se escapa: se hunde con una onda (agua) o se pierde entre el follaje (hojas). */
export type Aterrizaje = 'agua' | 'hojas'

interface Escena {
  dibujar: (hora: Hora, animado: boolean) => Dibujo
  aterrizaje: Aterrizaje
}

export const ESCENAS: Record<EscenaId, Escena> = {
  campamento: { dibujar: dibujarCampamento, aterrizaje: 'agua' },
  bosque: { dibujar: dibujarBosque, aterrizaje: 'hojas' },
}

const HORAS: readonly Hora[] = ['amanecer', 'dia', 'noche']

/** La hora del día de un nivel: 1 amanecer, 2 día, 3 noche (y vuelve a empezar si hubiera más). */
export function horaDeNivel(nivel: number): Hora {
  const n = Number.isFinite(nivel) ? Math.trunc(nivel) : 1
  return HORAS[(((n - 1) % 3) + 3) % 3]!
}

/** De la hora al cielo de dos valores que usan el paisaje de colinas y el texto sobre el cielo. */
export const cieloDeHora = (h: Hora): 'noche' | 'dia' => (h === 'noche' ? 'noche' : 'dia')
