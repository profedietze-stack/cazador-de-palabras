export interface Archivo { ruta: string; contenido: Buffer }
export function listarArchivos(dir: string, base?: string, acc?: Archivo[]): Archivo[]
export function huella(archivos: Archivo[]): string
export function sellar(textoSw: string, archivos: Archivo[]): string
export function sellarServiceWorker(): import('vite').Plugin
