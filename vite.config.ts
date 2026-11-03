import { defineConfig } from 'vite'
import { sellarServiceWorker } from './tools/sellar-sw.mjs'
import { emojisUsados, codigoDeArchivo } from './tools/emoji-inventario.mjs'

/* GitHub Pages sirve el juego en /cazador-de-palabras/, no en la raíz del
   dominio. Vite tiene que escribir esa ruta en los <script>/<link> del build
   o el navegador pide /assets/... y recibe 404. Fuera de Actions (dev local,
   cualquier otro hosting) sigue siendo '/'. */
const base = process.env.GITHUB_ACTIONS ? '/cazador-de-palabras/' : '/'

export default defineConfig({
  base,
  // Los emojis que usa el juego (los mismos que public/emoji): la pantalla de carga los baja de verdad.
  define: { __EMOJIS__: JSON.stringify(emojisUsados().map(codigoDeArchivo)) },
  plugins: [sellarServiceWorker()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
