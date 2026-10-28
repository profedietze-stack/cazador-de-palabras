// Resumen para el docente a partir de los registros de cdp_errores (DID-13).
// Puro y sin DOM. Lo que llega lo escribió un alumno: quien lo dibuje tiene que
// escapar (acá solo se agrupa y se cuenta).

export interface RegistroErrores {
  jugador: string
  cat: string
  nivel: number
  cazadas: number
  erradas: number
  fallos: Record<string, number>
}

export interface Panel {
  intentos: number
  porCategoria: Array<{ cat: string; intentos: number; precision: number }>
  palabras: Array<{ palabra: string; cat: string; veces: number; alumnos: number }>
  alumnos: Array<{
    jugador: string
    intentos: number
    precision: number
    porCategoria: Record<string, number>
    palabras: string[]
    necesitaAyuda: boolean
  }>
}

/** Debajo de esta precisión en al menos 2 intentos, el alumno «necesita ayuda». */
export const UMBRAL_AYUDA = 60
export const INTENTOS_PARA_AYUDA = 2

const pct = (c: number, e: number): number => (c + e > 0 ? Math.round(c / (c + e) * 100) : 100)
const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)

export function resumirSala(registros: readonly RegistroErrores[]): Panel {
  const cats = new Map<string, { c: number; e: number; n: number }>()
  const pal = new Map<string, { palabra: string; cat: string; veces: number; alumnos: Set<string> }>()
  const alum = new Map<string, {
    jugador: string; n: number; c: number; e: number; bajos: number
    cats: Map<string, { c: number; e: number }>; pal: Map<string, number>
  }>()

  for (const r of registros) {
    const c = num(r.cazadas), e = num(r.erradas)
    const k = r.jugador
    const cc = cats.get(r.cat) ?? { c: 0, e: 0, n: 0 }
    cc.c += c; cc.e += e; cc.n++; cats.set(r.cat, cc)

    const a = alum.get(k) ?? { jugador: k, n: 0, c: 0, e: 0, bajos: 0, cats: new Map(), pal: new Map() }
    a.n++; a.c += c; a.e += e
    if (pct(c, e) < UMBRAL_AYUDA) a.bajos++
    const ac = a.cats.get(r.cat) ?? { c: 0, e: 0 }; ac.c += c; ac.e += e; a.cats.set(r.cat, ac)
    alum.set(k, a)

    if (r.fallos && typeof r.fallos === 'object') {
      for (const [w, v] of Object.entries(r.fallos)) {
        const veces = num(v)
        if (veces === 0) continue
        const pk = r.cat + '|' + w
        const p = pal.get(pk) ?? { palabra: w, cat: r.cat, veces: 0, alumnos: new Set<string>() }
        p.veces += veces; p.alumnos.add(k); pal.set(pk, p)
        a.pal.set(w, (a.pal.get(w) ?? 0) + veces)
      }
    }
  }

  return {
    intentos: registros.length,
    porCategoria: [...cats].map(([cat, v]) => ({ cat, intentos: v.n, precision: pct(v.c, v.e) }))
      .sort((x, y) => x.precision - y.precision),
    palabras: [...pal.values()].map(p => ({ palabra: p.palabra, cat: p.cat, veces: p.veces, alumnos: p.alumnos.size }))
      .sort((x, y) => y.veces - x.veces || y.alumnos - x.alumnos).slice(0, 10),
    alumnos: [...alum.values()].map(a => ({
      jugador: a.jugador,
      intentos: a.n,
      precision: pct(a.c, a.e),
      porCategoria: Object.fromEntries([...a.cats].map(([cat, v]) => [cat, pct(v.c, v.e)])),
      palabras: [...a.pal].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([w]) => w),
      necesitaAyuda: a.bajos >= INTENTOS_PARA_AYUDA,
    })).sort((x, y) => Number(y.necesitaAyuda) - Number(x.necesitaAyuda) || x.precision - y.precision),
  }
}
