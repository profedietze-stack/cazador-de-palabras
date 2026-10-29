import { defineConfig } from 'vite'
import { sellarServiceWorker } from './tools/sellar-sw.mjs'

/* GitHub Pages sirve el juego en /cazador-de-palabras/, no en la raíz del
   dominio. Vite tiene que escribir esa ruta en los <script>/<link> del build
   o el navegador pide /assets/... y recibe 404. Fuera de Actions (dev local,
   cualquier otro hosting) sigue siendo '/'. */
const base = process.env.GITHUB_ACTIONS ? '/cazador-de-palabras/' : '/'

export default defineConfig({
  base,
  plugins: [sellarServiceWorker()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
