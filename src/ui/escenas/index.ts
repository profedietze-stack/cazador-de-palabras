import type { EscenaId } from '../../data/mundos'
import type { TipoAterrizaje } from '../../game/caida'
import { dibujarBosque } from './bosque'
import { dibujarCampamento } from './campamento'
import { dibujarCanon } from './canon'
import { dibujarDesierto } from './desierto'
import { dibujarParamo } from './paramo'
import { dibujarTaiga } from './taiga'
import { dibujarValle } from './valle'
import { dibujarEstepa } from './estepa'
import { dibujarHumedal } from './humedal'
import { dibujarMontana } from './montana'
import type { Dibujo, Hora } from './dibujo'

export type { Dibujo, Hora } from './dibujo'

/** Cómo aterriza una palabra que se escapa: agua (onda), hojas (follaje), pasto (briznas), nieve (copos) o polvo (arena). */
export type Aterrizaje = TipoAterrizaje

interface Escena {
  dibujar: (hora: Hora, animado: boolean) => Dibujo
  aterrizaje: Aterrizaje
}

export const ESCENAS: Record<EscenaId, Escena> = {
  campamento: { dibujar: dibujarCampamento, aterrizaje: 'agua' },
  bosque: { dibujar: dibujarBosque, aterrizaje: 'hojas' },
  estepa: { dibujar: dibujarEstepa, aterrizaje: 'pasto' },
  montana: { dibujar: dibujarMontana, aterrizaje: 'nieve' },
  humedal: { dibujar: dibujarHumedal, aterrizaje: 'agua' },
  paramo: { dibujar: dibujarParamo, aterrizaje: 'pasto' },
  canon: { dibujar: dibujarCanon, aterrizaje: 'polvo' },
  taiga: { dibujar: dibujarTaiga, aterrizaje: 'nieve' },
  desierto: { dibujar: dibujarDesierto, aterrizaje: 'polvo' },
  valle: { dibujar: dibujarValle, aterrizaje: 'agua' },
}

const HORAS: readonly Hora[] = ['amanecer', 'dia', 'noche']

/** La hora del día de un nivel: 1 amanecer, 2 día, 3 noche (y vuelve a empezar si hubiera más). */
export function horaDeNivel(nivel: number): Hora {
  const n = Number.isFinite(nivel) ? Math.trunc(nivel) : 1
  return HORAS[(((n - 1) % 3) + 3) % 3]!
}

/** De la hora al cielo de dos valores que usan el paisaje de colinas y el texto sobre el cielo. */
export const cieloDeHora = (h: Hora): 'noche' | 'dia' => (h === 'noche' ? 'noche' : 'dia')
