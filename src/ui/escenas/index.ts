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
import { separarViva, type Dibujo, type Hora } from './dibujo'

export type { Dibujo, Hora } from './dibujo'

/** Cómo aterriza una palabra que se escapa: agua (onda), hojas (follaje), pasto (briznas), nieve (copos) o polvo (arena). */
export type Aterrizaje = TipoAterrizaje

interface Escena {
  dibujar: (hora: Hora, animado: boolean) => Dibujo
  aterrizaje: Aterrizaje
}

export const ESCENAS: Record<EscenaId, Escena> = {
  campamento: { dibujar: (h, a) => separarViva(dibujarCampamento(h, a)), aterrizaje: 'agua' },
  bosque: { dibujar: (h, a) => separarViva(dibujarBosque(h, a)), aterrizaje: 'hojas' },
  estepa: { dibujar: (h, a) => separarViva(dibujarEstepa(h, a)), aterrizaje: 'pasto' },
  montana: { dibujar: (h, a) => separarViva(dibujarMontana(h, a)), aterrizaje: 'nieve' },
  humedal: { dibujar: (h, a) => separarViva(dibujarHumedal(h, a)), aterrizaje: 'agua' },
  paramo: { dibujar: (h, a) => separarViva(dibujarParamo(h, a)), aterrizaje: 'pasto' },
  canon: { dibujar: (h, a) => separarViva(dibujarCanon(h, a)), aterrizaje: 'polvo' },
  taiga: { dibujar: (h, a) => separarViva(dibujarTaiga(h, a)), aterrizaje: 'nieve' },
  desierto: { dibujar: (h, a) => separarViva(dibujarDesierto(h, a)), aterrizaje: 'polvo' },
  valle: { dibujar: (h, a) => separarViva(dibujarValle(h, a)), aterrizaje: 'agua' },
}

const HORAS: readonly Hora[] = ['amanecer', 'dia', 'noche']

/** La hora del día de un nivel: 1 amanecer, 2 día, 3 noche (y vuelve a empezar si hubiera más). */
export function horaDeNivel(nivel: number): Hora {
  const n = Number.isFinite(nivel) ? Math.trunc(nivel) : 1
  return HORAS[(((n - 1) % 3) + 3) % 3]!
}

/** De la hora al cielo de dos valores que usan el paisaje de colinas y el texto sobre el cielo. */
export const cieloDeHora = (h: Hora): 'noche' | 'dia' => (h === 'noche' ? 'noche' : 'dia')
