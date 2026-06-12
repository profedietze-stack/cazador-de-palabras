export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      salas: {
        Row: {
          activa: boolean | null
          code: string
          created_at: string | null
          descripcion: string | null
          nombre: string
        }
        Insert: {
          activa?: boolean | null
          code: string
          created_at?: string | null
          descripcion?: string | null
          nombre: string
        }
        Update: {
          activa?: boolean | null
          code?: string
          created_at?: string | null
          descripcion?: string | null
          nombre?: string
        }
      }
      scores: {
        Row: {
          cat: string
          cat_nombre: string
          cazadas: number
          combos: number
          device_id: string
          erradas: number
          fecha: string | null
          id: string
          jugador: string
          medalla: string | null
          nivel: number
          precision: number
          pts: number
          sala_code: string | null
          tiempo_usado: number
        }
        Insert: {
          cat: string
          cat_nombre: string
          cazadas: number
          combos?: number
          device_id: string
          erradas: number
          fecha?: string | null
          id?: string
          jugador: string
          medalla?: string | null
          nivel: number
          precision: number
          pts: number
          sala_code?: string | null
          tiempo_usado: number
        }
        Update: {
          cat?: string
          cat_nombre?: string
          cazadas?: number
          combos?: number
          device_id?: string
          erradas?: number
          fecha?: string | null
          id?: string
          jugador?: string
          medalla?: string | null
          nivel?: number
          precision?: number
          pts?: number
          sala_code?: string | null
          tiempo_usado?: number
        }
      }
    }
  }
}
