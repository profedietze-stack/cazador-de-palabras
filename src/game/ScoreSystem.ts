import type { GameRecord, AchievementRecord } from '../types'
import { LOGROS_DEF, TITULOS } from '../data/achievements'
import { CATS } from '../data/categories'
import { cargarDatos, getLogros, setLogros } from '../storage/GameStorage'

export function checkLogros(p: GameRecord): typeof LOGROS_DEF {
  const data = cargarDatos()
  const logros = data.logros ?? []
  const partidas = data.partidas ?? []
  const nuevos: typeof LOGROS_DEF = []

  const yaT = (id: number) => logros.find(l => l.id === id)
  const add = (id: number) => {
    if (!yaT(id)) {
      const def = LOGROS_DEF.find(d => d.id === id)!
      logros.push({ id, fecha: new Date().toISOString() })
      nuevos.push(def)
    }
  }

  const cats = Object.keys(CATS)

  if (partidas.length >= 1) add(1)

  cats.forEach(cat => {
    const ps = partidas.filter(x => x.cat === cat && x.medalla)
    if ([1, 2, 3].every(nv => ps.find(x => x.nivel === nv))) add(2)
  })

  if (partidas.filter(x => x.medalla === 'ORO').length >= 5) add(3)
  if (p.erradas === 0 && p.medalla) add(4)
  if (p.tiempoUsado < 120 && p.medalla) add(5)

  const total = partidas.reduce((s, x) => s + x.pts, 0)
  if (total >= 10000) add(6)

  const catsJugadas = new Set(partidas.filter(x => x.medalla).map(x => x.cat))
  if (catsJugadas.size >= 5) add(7)

  const todosNiveles = cats.every(cat =>
    [1, 2, 3].every(nv => partidas.find(x => x.cat === cat && x.nivel === nv && x.medalla))
  )
  if (todosNiveles) add(8)

  if (partidas.length >= 3) {
    const ult = partidas.slice(-3)
    if (ult.every(x => x.precision >= 95 && x.medalla)) add(9)
  }

  const todosOro = cats.every(cat =>
    [1, 2, 3].every(nv => partidas.find(x => x.cat === cat && x.nivel === nv && x.medalla === 'ORO'))
  )
  if (todosOro) add(10)

  setLogros(logros)
  return nuevos
}

export function calcularTitulo(): string {
  const n = getLogros().length
  let titulo = TITULOS[0]!.t
  TITULOS.forEach(t => { if (n >= t.req) titulo = t.t })
  return titulo
}
