import type { Achievement, TitleDef } from '../types'

export const LOGROS_DEF: Achievement[] = [
  { id: 1,  e: '🎮', n: 'Cazador Principiante',  d: 'Completar el primer nivel' },
  { id: 2,  e: '🏆', n: 'Cazador Experto',        d: 'Completar todos los niveles de una categoría' },
  { id: 3,  e: '👑', n: 'Maestro de Palabras',    d: 'Obtener 5 medallas de ORO' },
  { id: 4,  e: '💯', n: 'Perfeccionista',          d: '0 errores en un nivel completo' },
  { id: 5,  e: '⚡', n: 'Velocidad Máxima',        d: 'Completar un nivel en menos de 2 minutos' },
  { id: 6,  e: '💎', n: 'Acumulador',              d: '10.000 puntos totales acumulados' },
  { id: 7,  e: '📚', n: 'Lingüista',               d: 'Completar niveles de 5 categorías distintas' },
  { id: 8,  e: '🌟', n: 'Todas las Letras',        d: 'Completar todos los niveles disponibles' },
  { id: 9,  e: '✨', n: 'Sin Errores',             d: '3 niveles seguidos con ≥95% de precisión' },
  { id: 10, e: '🎯', n: 'Campeón',                 d: 'Obtener ORO en todos los niveles' },
]

export const TITULOS: TitleDef[] = [
  { req: 0,  t: 'Aprendiz de Palabras' },
  { req: 1,  t: 'Cazador Novato' },
  { req: 3,  t: 'Cazador Competente' },
  { req: 5,  t: 'Cazador Experto' },
  { req: 7,  t: 'Maestro de Palabras' },
  { req: 9,  t: 'Lingüista Brillante' },
  { req: 10, t: 'Campeón de Palabras' },
]
