// Formato de las filas del ranking que depende del tipo de partida.

/** ¿La fila es de un duelo? El servidor de duelos publica con la categoría «Duelo». */
export function esFilaDeDuelo(cat: string): boolean {
  return cat.trim().toLowerCase() === 'duelo'
}

/**
 * Lo que va en la columna «Precisión». Un duelo no tiene precisión (solo puntos): mostrar «0%»
 * parecía que el alumno había errado todo, así que va «—».
 */
export function celdaPrecision(precision: number, cat: string): string {
  return esFilaDeDuelo(cat) ? '—' : `${precision}%`
}
