# Rediseño visual «Aventura» — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el aspecto del juego por la dirección «Aventura» aprobada (mundos por categoría, paisaje animado, botones 3D, tipografías propias, emojis Fluent 3D, tema claro de día) sin tocar reglas ni puntajes.

**Architecture:** Cada mundo es un dato (`MUNDOS`) con dos paletas, noche y día. Un módulo dibuja el paisaje (capas SVG) desde ese dato y un atributo de `<html>` (`data-cielo`) elige la paleta; las pantallas solo consumen variables CSS (`--cielo-*`, `--colina-*`, `--acento`). Los emojis pasan a imágenes locales mediante una función central que devuelve nodos del DOM. Es una capa de presentación: no cambia la lógica de las pantallas.

**Tech Stack:** Vite 5, TypeScript estricto, DOM sin framework, CSS propio, vitest, Playwright MCP (verificación manual en navegador).

**Spec:** `docs/superpowers/specs/2026-10-30-rediseno-visual-aventura-design.md` (maquetas en `docs/superpowers/specs/rediseno-visual-aventura/`; mandan sobre el texto en paletas y disposición).

## Global Constraints

- Nada de recursos de terceros en ejecución: fuentes, ilustraciones, íconos y emojis dentro del propio sitio (`public/`); el juego arranca con el servidor apagado.
- No cambiar reglas, puntajes, velocidades, tiempos ni dificultad. Los ajustes (`src/storage/ajustes.ts`) siguen mandando: tema auto/claro/oscuro, alto contraste, reducir movimiento (también el del sistema), tamaño de palabras, fondo y stickers.
- Contraste de texto ≥ 4,5:1 **medido**; blancos táctiles ≥ 44 px; foco visible; nada solo por color; palabras que caen ≥ 18 px (test existente en `src/accesibilidad.test.ts`).
- Ninguna pantalla puede quedar sin scroll si el contenido no entra.
- Presupuesto: emojis ≤ 250 kB; ilustración propia ≤ 100 kB; las dos tipografías ≤ 90 kB entre ambas; JS+CSS sin saltos grandes (hoy JS 192 kB, CSS 38 kB); 60 fps en celular viejo; animaciones de fondo en pausa con la pestaña oculta.
- Textos en voseo; un solo `<main>`; todo texto de otro jugador con `textContent` y **nunca** por la función de emojis.
- Un commit por tarea, sin pushear; mensaje en español y terminado con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nada se despliega sin el OK del docente.
- Cada tarea cierra con: `npx vitest run` verde, `npx tsc --noEmit` sin errores, `npx eslint .` con 0 errores, `npx vite build` sin errores, y el juego **abierto y jugado** en un navegador con el sonido apagado (`localStorage['cdp:ajustes'] = {"sonido":false}` antes de cargar), `document.title === 'Cazador de Palabras'`, consola sin errores. Capturas en 1280×720, 390×740 y 360×640.
- Datos de prueba: jugador `ZZTEST_…`; borrarlos del `localStorage` al terminar.

## Review Focus

Entradas o condiciones que el spec implica y que ninguna tarea prueba por sí sola; cada una tiene su test en la tarea indicada.

1. Nombre de alumno con HTML o emoji (`<img onerror=…>`, `🎯`) en ranking, sala y duelo: se ve como texto, nunca como imagen ni como HTML (Tarea 2).
2. Un archivo de emoji que da 404 (o un navegador sin webp): se ve el emoji del sistema, no un recuadro roto (Tarea 2).
3. Palabra larga (`responsabilidad`-like, 14+ letras) con tamaño «Muy grande» en 360 px: no se sale de la pantalla (Tarea 8).
4. Con «Reducir movimiento» (Ajustes o sistema) o fondo apagado: ningún `animation`/confeti corre, y con alto contraste no hay paisaje (Tarea 6).
5. Sin red: el juego carga con fuentes y emojis desde el service worker (Tarea 13).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `public/fonts/*.woff2`, `public/emoji/*.webp` | assets propios (Tarea 1) |
| `tools/emoji-inventario.mjs`, `tools/preparar-assets.mjs` | inventario de emojis usados y preparación única de assets (no son dependencias del juego) |
| `src/ui/emoji.ts` | emoji → imagen local (nodos DOM), hidratación del HTML estático |
| `src/ui/contraste.ts` | razón de contraste WCAG (se usa en tests y nada más) |
| `src/data/mundos.ts` | los 9 mundos + `inicio`, cada uno con paleta noche y día |
| `src/ui/paisaje.ts` | dibuja las capas del paisaje en un contenedor desde un `Mundo` |
| `src/ui/aplicarMundo.ts` | pone las variables CSS del mundo activo en `<html>` |
| `src/styles/{fuentes,tokens,componentes}.css` | `@font-face`, variables, botones 3D / placas / título cartel |
| `src/styles/{base,screens,responsive,a11y,ajustes}.css` | se migran pantalla por pantalla |
| `src/ui/DecoBackground.ts` | se reemplaza por el paisaje (Tarea 6) |

---

### Task 1: Assets propios (tipografías y emojis) con sus presupuestos

**Files:**
- Create: `tools/emoji-inventario.mjs`, `tools/preparar-assets.mjs`, `public/fonts/lilita-one-latin.woff2`, `public/fonts/baloo-2-latin.woff2`, `public/emoji/<codigo>.webp` (uno por emoji usado), `src/assets.test.ts`
- Modify: `.gitignore` (nada que ignorar; solo confirmar que `public/` no está excluido)

**Interfaces:**
- Produces: `emojisUsados(): string[]` (exportada por `tools/emoji-inventario.mjs`; recorre `src/**/*.ts` sin tests, `src/**/*.css` y `index.html`, devuelve cada emoji distinto con su variación `U+FE0F` si la trae); convención de archivo `public/emoji/<codepoints en minúscula unidos por "-", sin "fe0f">.webp`; fuentes `public/fonts/lilita-one-latin.woff2` y `public/fonts/baloo-2-latin.woff2` (variable, peso 400–800).

- [ ] **Step 1: Test que falla** — `src/assets.test.ts`: (a) cada emoji de `emojisUsados()` tiene `public/emoji/<codigo>.webp`; (b) cada `.webp` empieza con `RIFF....WEBP` y mide ≤ 144×144; (c) `public/emoji` pesa ≤ `250 * 1024`; (d) `public/fonts` pesa ≤ `90 * 1024` y contiene los dos `.woff2`; (e) ningún emoji de `emojisUsados()` falta ni sobra respecto de los archivos (no hay webp huérfanos).
- [ ] **Step 2: Verlo fallar** — `npx vitest run src/assets.test.ts` → FAIL (faltan archivos).
- [ ] **Step 3: `emojisUsados()`** en `tools/emoji-inventario.mjs` con la expresión `/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*/gu`; ignora `*.test.ts` y `src/data/contextos.ts` no (se incluye todo lo que no sea test).
- [ ] **Step 4: `tools/preparar-assets.mjs`** (corrida **única**, el docente autorizó las descargas): baja a una carpeta temporal **fuera del repo** el webp de cada emoji de `https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/<codigo>.webp` (probar `<codigo>` y `<codigo>-fe0f`), lo reduce a 128×128 con `npx --yes sharp-cli` (sin agregarlo a `package.json`) y lo guarda en `public/emoji/`; baja desde Google Fonts (CSS con `User-Agent` de Chrome) el subconjunto `latin` de Lilita One y de Baloo 2 variable a `public/fonts/`. Dejar anotado en el script la versión y la licencia (MIT; OFL).
- [ ] **Step 5: Correr el script y el test** — `node tools/preparar-assets.mjs` y luego `npx vitest run src/assets.test.ts` → PASS. Si `public/emoji` supera 250 kB, bajar a 112 px o calidad 75 y repetir; anotar el tamaño final en el mensaje de commit.
- [ ] **Step 6: Commit** — `feat(assets): tipografias Lilita One y Baloo 2 y emojis Fluent 3D propios`.

### Task 2: Emojis como imágenes locales (función central)

**Files:**
- Create: `src/ui/emoji.ts`, `src/ui/emoji.test.ts`, estilo `.emo` en `src/styles/componentes.css` (se crea en esta tarea con solo esa regla: `display:inline-block; vertical-align:-.2em; width:1.15em; height:1.15em`)
- Modify: `src/main.ts` (llamar `hidratarEmojis()` tras `initDialog()` y antes de los `init*Screen`), `src/screens/CategoryScreen.ts`, `src/screens/AchievementsScreen.ts`, `src/screens/ResultScreen.ts`, `src/ui/StickerSystem.ts`, `src/game/GameEngine.ts` y todo `src/**/*.ts` donde el inventario encuentre un emoji dentro de una plantilla `innerHTML` o un `textContent` de **datos del juego**

**Interfaces:**
- Produces:
  - `codigoEmoji(e: string): string` — `'🎯' → '1f3af'`, `'⚔️' → '2694'`.
  - `urlEmoji(e: string): string` — `` `${import.meta.env.BASE_URL}emoji/${codigoEmoji(e)}.webp` ``.
  - `emojiNodo(e: string, px?: number): HTMLElement` — `<img class="emo" alt=e width height decoding="async">`; si la imagen da error (`onerror`) se reemplaza por un nodo de texto con el emoji.
  - `emojiHtml(e: string): string` — para plantillas con constantes del juego; **lanza** si `e` no es exactamente un emoji (regex de `emoji-inventario`).
  - `hidratarEmojis(raiz?: ParentNode): void` — recorre nodos de texto bajo `raiz` (por defecto `document.body`) y reemplaza cada emoji por `emojiNodo`; **omite** todo lo que esté dentro de `[data-sin-emoji]`, `script`, `style`, `textarea`, `input`, `[contenteditable]`.
- Consumes: archivos de la Tarea 1.

- [ ] **Step 1: Tests que fallan** (`src/ui/emoji.test.ts`, entorno jsdom ya configurado en vitest; si no lo está, usar `// @vitest-environment jsdom`):
  - `codigoEmoji('🎯') === '1f3af'` y `codigoEmoji('⚔️') === '2694'`.
  - `emojiNodo('🏆')` devuelve un `IMG` con `alt === '🏆'`; al disparar `error` queda un nodo de texto `'🏆'` (Review Focus 2).
  - `emojiHtml('<img src=x onerror=alert(1)>')` y `emojiHtml('hola')` lanzan; `emojiHtml('🏆')` no.
  - `hidratarEmojis` sobre `<p>🚀 Iniciar</p>` deja `<img alt="🚀">` + texto « Iniciar»; sobre `<p data-sin-emoji>🚀</p>` no toca nada.
  - Nombre de alumno `<b>🎯</b>` renderizado con `textContent` dentro de `[data-sin-emoji]` queda como texto (Review Focus 1).
  - Barrido con `import.meta.glob('../**/*.ts', { query: '?raw', eager: true })` (sin listar archivos a mano): en ningún archivo de `src` (salvo tests y `emoji.ts`) aparece un emoji dentro de una plantilla con `innerHTML` que no pase por `emojiHtml(`.
- [ ] **Step 2: Fallo** — `npx vitest run src/ui/emoji.test.ts` → FAIL.
- [ ] **Step 3: Implementar** las cuatro funciones en `src/ui/emoji.ts`. `emojiNodo` usa `document.createElement('img')`; nada de `innerHTML` con texto no constante.
- [ ] **Step 4: Migrar los usos.** Para cada emoji que `tools/emoji-inventario.mjs` encuentre en `.ts`: constantes de datos (`CATS[k].icon`, `achievements`, stickers, medallas) se renderizan con `emojiNodo`/`emojiHtml`; el HTML estático de `index.html` se resuelve con `hidratarEmojis()` en el arranque. **Marcar con `data-sin-emoji`** los contenedores donde se renderiza texto de otros jugadores (nombres en `RankingScreen`, `SalaScreen`, `ResultadosSalaScreen`, `DuelLobbyScreen`, `DuelGameScreen`, `DuelResultScreen`).
- [ ] **Step 5: Todo verde** + abrir el juego: ningún emoji del sistema visible en menú, categorías, partida, final y medallas; consola sin 404 de `emoji/*.webp`.
- [ ] **Step 6: Commit** — `feat(ui): los emojis del juego son imagenes propias (Fluent 3D) con respaldo de texto`.

### Task 3: Tokens, tipografía y atributo de cielo

**Files:**
- Create: `src/styles/fuentes.css`, `src/styles/tokens.css`, `src/ui/aplicarAjustes.test.ts` (si no existe)
- Modify: `src/main.ts` (importar `fuentes.css` y `tokens.css` antes de `base.css`), `src/styles/base.css`, `src/ui/aplicarAjustes.ts`

**Interfaces:**
- Produces: variables CSS `--font-titulo: 'Lilita One', 'Baloo 2', system-ui, sans-serif`, `--font-texto: 'Baloo 2', system-ui, sans-serif`, escala `--r-sm/--r-md/--r-lg`, `--sombra-placa`, `--borde-3d` (6 px), y el atributo `data-cielo="noche"|"dia"` en `<html>`.
- Consumes: `oscuroEfectivo(a, sistemaOscuro)` de `src/storage/ajustes.ts`.

- [ ] **Step 1: Tests** — `aplicarAjustes({ tema:'oscuro' })` deja `data-cielo="noche"`; `{ tema:'claro' }` deja `"dia"`; `{ tema:'auto' }` sigue a `matchMedia('(prefers-color-scheme: dark)')`; los atributos existentes (`data-contraste`, `data-movimiento`, `data-fondo`, `data-tamano`) no cambian. Test de CSS: `fuentes.css` declara `@font-face` para las dos familias con `font-display: swap` y `src: url(...)` apuntando a archivos que existen en `public/fonts`.
- [ ] **Step 2: Fallo → Step 3: Implementar** `data-cielo` en `aplicarAjustes`; `fuentes.css` con `@font-face` (Baloo 2 `font-weight: 400 800`); `tokens.css`; `body { font-family: var(--font-texto) }` en `base.css`.
- [ ] **Step 4: Verde + abrir el juego**: el texto sale en Baloo 2 y los títulos en Lilita One (`document.fonts.check('700 16px "Lilita One"')` es `true`), sin salto de layout apreciable.
- [ ] **Step 5: Commit** — `feat(estilo): tipografias propias, tokens y cielo noche/dia`.

### Task 4: Mundos como datos y contraste medido

**Files:**
- Create: `src/data/mundos.ts`, `src/data/mundos.test.ts`, `src/ui/contraste.ts`, `src/ui/contraste.test.ts`

**Interfaces:**
- Produces:
  - `type MundoId = CategoryKey | 'inicio'`
  - `interface Paleta { cieloAlto: string; cieloBajo: string; colinas: [string, string, string]; acento: string; astro: string }` (todos `#rrggbb`)
  - `interface Mundo { id: MundoId; nombre: string; noche: Paleta; dia: Paleta }`
  - `MUNDOS: Record<MundoId, Mundo>`; `mundoDe(cat: CategoryKey | null): Mundo` (`null` → `MUNDOS.inicio`)
  - `razonContraste(a: string, b: string): number` (WCAG 2.x, hex de 6 dígitos) en `src/ui/contraste.ts`.
- Valores: las **paletas noche** salen de `aventura-pantallas.html` (`M` y `SEL`): `inicio` y `sustantivos` = selva (`#0e3b43`→`#1c6b5f`, colinas `#14564f #1d7a5f #2a9a6a`); el resto del array `M`. Las **paletas día** se definen aquí como cielos claros del mismo matiz (más luminosos, colinas más saturadas, `astro` = sol `#ffd23f`); se ajustan hasta pasar los tests de la Tarea 12 (en esta tarea `dia` puede ser una copia provisoria de `noche` marcada con `// TODO Tarea 12` y el test de día salteado con `it.skip`).

- [ ] **Step 1: Tests** — `razonContraste('#000000','#ffffff') ≈ 21` y `razonContraste('#777777','#777777') === 1`. Mundos: hay exactamente 10 entradas (`inicio` + las 9 de `CATS`), con `id` igual a la clave y todas las claves de `CATS` presentes; cada color cumple `/^#[0-9a-f]{6}$/i`. Contraste noche (para **cada** mundo): texto blanco `#ffffff` sobre la placa oscura compuesta (`rgba(8,40,44,.72)`) sobre `cieloAlto` y sobre `cieloBajo` ≥ 4,5; texto `#3a2200` sobre la placa crema `#fff6dc` ≥ 4,5 (independiente del mundo).
- [ ] **Step 2: Fallo → Step 3: Implementar** `contraste.ts` (luminancia relativa; composición alfa simple) y `mundos.ts`.
- [ ] **Step 4: Verde.** Si un mundo falla, **cambiar su paleta** (más oscuro el cielo), no el umbral.
- [ ] **Step 5: Commit** — `feat(mundos): paletas de los nueve mundos como datos, con contraste medido`.

### Task 5: Paisaje y aplicación del mundo

**Files:**
- Create: `src/ui/paisaje.ts`, `src/ui/paisaje.test.ts`, `src/ui/aplicarMundo.ts`, `src/ui/aplicarMundo.test.ts`, `src/styles/paisaje.css`
- Modify: `src/main.ts` (importar `paisaje.css`)

**Interfaces:**
- Produces:
  - `interface OpcionesPaisaje { animado: boolean; particulas: boolean; cielo: 'noche' | 'dia'; apagarTodo?: boolean }`
  - `montarPaisaje(el: HTMLElement, mundo: Mundo, op: OpcionesPaisaje): () => void` — vacía `el`, agrega: astro (luna o sol), 3 capas de colinas (SVG, `preserveAspectRatio="none"`), y si `particulas` ≈ 12 luciérnagas (noche) o destellos (día); devuelve una función `desmontar` que cancela todo. Con `animado:false` las capas llevan la clase `quieto` y no hay `animation`. Con `apagarTodo:true` no agrega capas (fondo liso del mundo).
  - `aplicarMundo(mundo: Mundo, cielo: 'noche' | 'dia'): void` — escribe en `<html>` las variables `--cielo-alto`, `--cielo-bajo`, `--colina-1`, `--colina-2`, `--colina-3`, `--acento`.
  - `opcionesDesdeAjustes(a: Ajustes, sistemaReduce: boolean, cielo): OpcionesPaisaje` — `animado = !a.reducirMovimiento && !sistemaReduce && a.fondoDecorativo`; `particulas = animado`; `apagarTodo = a.altoContraste`.
- Consumes: `Mundo`/`MUNDOS` (Tarea 4), `Ajustes` (`src/storage/ajustes.ts`), `reducirMovimientoActivo()` (`src/utils/movimiento.ts`).

- [ ] **Step 1: Tests** — `montarPaisaje` crea 3 `svg` de colina y un astro; con `animado:false` ninguna capa tiene `animation` (leer `style`/clases) y no hay luciérnagas; con `apagarTodo:true` el contenedor queda sin hijos; `desmontar()` lo vacía; llamar dos veces no duplica capas (Review Focus 4). `aplicarMundo(MUNDOS.verbos,'noche')` fija `--cielo-alto` al valor de la paleta. `opcionesDesdeAjustes` cubre las 4 combinaciones (reducir del alumno, del sistema, fondo apagado, alto contraste).
- [ ] **Step 2: Fallo → Step 3: Implementar.** Colinas: función `onda(a,b)` de la maqueta (`aventura-pantallas.html`) generando `path` SVG; desplazamiento con `@keyframes desliza` en `paisaje.css` (45,4 % de traslación horizontal, duraciones 60/38/24 s); `@media (prefers-reduced-motion: reduce)` y `html[data-movimiento="reducido"]` los apagan; `document.hidden` pausa (`animation-play-state: paused` vía clase en `<html>` desde un listener de `visibilitychange`).
- [ ] **Step 4: Verde + prueba visual**: una página temporal no commiteada, o la pantalla de ajustes, muestra el paisaje de Sustantivos; capturar.
- [ ] **Step 5: Commit** — `feat(paisaje): capas de paisaje animadas desde datos del mundo`.

### Task 6: Menú de inicio «Aventura» y fondo

**Files:**
- Modify: `index.html` (`#menuPrincipal`), `src/screens/MenuScreen.ts`, `src/screens/ScreenManager.ts`, `src/ui/DecoBackground.ts` → **eliminar** lo que reemplaza el paisaje (el archivo queda solo si conserva las palabras flotantes como detalle), `src/styles/{base,screens,components,ajustes}.css`
- Create: `src/styles/componentes.css` (ampliar) con `.btn3d`, `.btn3d--principal`, `.btn3d--confirmar`, `.titulo-cartel`, `.placa`; `src/screens/menu.test.ts`

**Interfaces:**
- Produces: clases `.btn3d` (+ `--principal`, `--confirmar`), `.titulo-cartel`, `.placa`, `.placa--crema`; contenedor `#fondoMundo` en cada pantalla con fondo (hijo de `.screen`, `position:absolute; inset:0; z-index:0`).
- Consumes: `montarPaisaje`, `opcionesDesdeAjustes`, `aplicarMundo`, `mundoDe`.

- [ ] **Step 1: Tests** — el `index.html` tiene `#fondoMundo` dentro de `#menuPrincipal`; los botones del menú usan `.btn3d` y el de «Iniciar» `.btn3d--principal`; `.btn3d` define `border-bottom` de 6 px, `min-height: 44px` y estados `:active`, `:disabled` y `:focus-visible` (test de CSS por texto). Con `fondoDecorativo:false` el paisaje queda **quieto** (no liso) y con `altoContraste:true` queda liso (Review Focus 4). El título tiene la clase `.titulo-cartel` y mantiene `Cazador` / `de Palabras`.
- [ ] **Step 2: Fallo → Step 3: Implementar** según `menu-direcciones.html` (opción B): título cartel (amarillo con contorno y extrusión), logo `🎯` con rebote, botones 3D, palabras de ejemplo no. `ScreenManager.activate` llama `montarPaisaje` en el `#fondoMundo` de la pantalla activa (desmontando el anterior) con `mundoDe(null)` en el menú. Reaccionar a `alCambiarAjustes` para remontar.
- [ ] **Step 3b:** el botón ⚙️ (`.aj-btn`) toma el estilo 3D.
- [ ] **Step 4: Verde + jugar**: menú en 1280×720, 390×740 y 360×640, claro y oscuro (el claro aún se ve de noche: lo resuelve la Tarea 12), con alto contraste y reducir movimiento; capturas.
- [ ] **Step 5: Commit** — `feat(menu): menu de inicio Aventura con paisaje, titulo cartel y botones 3D`.

### Task 7: Selección de categoría («mundos») y pantalla previa

**Files:**
- Modify: `src/screens/CategoryScreen.ts`, `src/screens/PreLevelScreen.ts`, `index.html` (`#seleccionCategoria`, `#preNivel`), `src/styles/screens.css`, `src/styles/responsive.css`
- Test: `src/screens/categorias.test.ts`

**Interfaces:**
- Consumes: `MUNDOS`, `mundoDe`, `aplicarMundo`, `emojiNodo`, `CATS[k].icon`.
- Produces: tarjeta `.mundo` por categoría (`data-cat`) con mini-paisaje SVG, ícono de la categoría (el que ya tiene el juego, no el provisorio de la maqueta), nombre, y tres botones de nivel `.nv-btn` (mantienen `data-cat`/`data-niv`); la pre-pantalla se pinta con el mundo de `G.cat`.

- [ ] **Step 1: Tests** — `mostrarSeleccionCategoria()` crea 9 `.mundo`, cada uno con 3 `.nv-btn` y `data-cat` ∈ `CATS`; el texto visible no pierde `Niv 1/2/3`; al llamar `mostrarPreNivel()` con `G.cat='verbos'` el `<html>` tiene `--cielo-alto` de Verbos. Blancos táctiles: `.nv-btn` con `min-height:44px` (test de CSS).
- [ ] **Step 2–4:** fallo, implementar según la maqueta («Elegí un mundo»), verde. En 360 px la grilla queda 2 columnas y se puede scrollear hasta «Volver al menú» (medido).
- [ ] **Step 5: Commit** — `feat(categorias): nueve mundos con su paisaje en la seleccion y la previa`.

### Task 8: Partida

**Files:**
- Modify: `index.html` (`#gameScreen`), `src/game/WordSpawner.ts` (solo clases/estilos, **no** la lógica), `src/game/GameEngine.ts` (solo clases de presentación y el aviso `#porQue`), `src/game/ComboSystem.ts` (banner), `src/styles/screens.css`, `src/styles/a11y.css`
- Test: `src/game/presentacion.test.ts`

**Interfaces:**
- Consumes: `aplicarMundo(mundoDe(G.cat), cielo)` al iniciar la partida (`iniciarJuego`), `montarPaisaje` con `particulas:false` (la partida no lleva luciérnagas), clases de la Tarea 6.
- Produces: `.palabra` como placa crema (`#fff6dc`, texto `#3a2200`, `border-bottom` de 4 px), `.palabra.hit-ok` verde claro, HUD con `.placa`, viñeta `.vineta` sobre el paisaje, `#porQue` como panel crema con borde naranja a la izquierda.

- [ ] **Step 1: Tests** — `WordSpawner` sigue con `let size = (18 + Math.random() * 14) * mult` y el tope por ancho (test existente de `accesibilidad.test.ts` debe seguir pasando sin tocarse); `.palabra` define `background:#fff6dc`; la razón de contraste `#3a2200` sobre `#fff6dc` ≥ 4,5. Con `tamanoPalabras:'muygrande'` y `innerWidth=360`, 200 palabras generadas con textos de 14+ letras tienen `left + ancho estimado ≤ 360` (Review Focus 3). Un test de que **ningún** archivo de `src/game/` cambió su lógica: comparar `puntosPorAcierto`, `restaPorError`, `PRECISION_MINIMA` con los valores de `reglas.test.ts` (ya cubiertos; solo verificar que siguen verdes).
- [ ] **Step 2–4:** fallo, implementar según la maqueta («Partida»), verde. Jugar una partida completa en los tres tamaños, con y sin alto contraste: las palabras se leen siempre y el paisaje no compite (viñeta).
- [ ] **Step 5: Commit** — `feat(partida): HUD, palabras y avisos con el estilo Aventura`.

### Task 9: Pantalla final

**Files:**
- Modify: `index.html` (`#resultadoScreen`), `src/screens/ResultScreen.ts`, `src/styles/screens.css`
- Create: `src/ui/confeti.ts`, `src/ui/confeti.test.ts`

**Interfaces:**
- Produces: `lanzarConfeti(contenedor: HTMLElement, cantidad: number): () => void` (devuelve `cancelar`; si `reducirMovimientoActivo()` es `true` no crea nada y devuelve una función vacía); `cantidadConfeti(medalla: Medal | null): number` (`null`→0, `'BRONCE'`→10, `'PLATA'`→18, `'ORO'`→28); `#resRepaso` pasa a `<details>` cerrado por defecto con `<summary>📝 Palabras para repasar (N)</summary>`.
- Consumes: `calcularMedalla` (sin cambios), `explicarError`, `emojiNodo`.

- [ ] **Step 1: Tests** — `cantidadConfeti` por medalla; `lanzarConfeti` con reducir movimiento no agrega nodos (Review Focus 4); `cancelar()` los quita; el repaso es un `<details>` **sin** atributo `open` y su resumen incluye la cantidad real de palabras; sin fallos la sección sigue oculta. Con 5 palabras de repaso en 360×640 el botón «Menú» es alcanzable scrolleando (medir `scrollHeight` y posición tras `scrollTop = scrollHeight`).
- [ ] **Step 2–4:** fallo, implementar (medalla 3D con rayos que giran, confeti discreto, placas de estadísticas, logro en placa amarilla, botones Menú/Reintentar/Siguiente 3D), verde. Jugar hasta el final de un nivel y de un nivel sin medalla (precisión < 70 %).
- [ ] **Step 5: Commit** — `feat(final): pantalla final con medalla, confeti y repaso plegable`.

### Task 10: Ajustes

**Files:**
- Modify: `index.html` (`#ajustesScreen`), `src/styles/ajustes.css`
- Test: `src/ajustesPantalla.test.ts` (existente; debe seguir verde)

- [ ] **Step 1: Tests** — los 18 controles `data-aj` siguen presentes (test existente); `.aj-sec` usa `.placa--crema`; interruptor y deslizador con `min-height:44px`; contraste de las etiquetas ≥ 4,5 (`#3a2200` sobre el crema).
- [ ] **Step 2–4:** implementar según la maqueta (pergamino, interruptores y deslizadores grandes); verde; probar cada control en el navegador (sin sonido).
- [ ] **Step 5: Commit** — `feat(ajustes): panel de ajustes con el estilo Aventura`.

### Task 11: Resto de pantallas y superposiciones

**Files:**
- Modify: `index.html` y `src/screens/{AchievementsScreen,RankingScreen,InfoScreen,SalaScreen,ResultadosSalaScreen,DuelMenuScreen,DuelLobbyScreen,DuelGameScreen,DuelResultScreen}.ts`, `src/ui/{Dialog,Banner,ErrorBanner}.ts`, `src/styles/*.css`
- Test: `src/estiloUnico.test.ts`

- [ ] **Step 1: Test** — barrido con `import.meta.glob` sobre `src/styles/*.css` e `index.html`: no queda `linear-gradient(135deg,var(--bg1),var(--bg2))` como fondo de pantalla, ni la tipografía `'Segoe UI'` fuera de `fuentes.css`/`tokens.css`; cada `.screen` del HTML tiene `#fondoMundo` (salvo `gameScreen`, que lo monta por código). Es la lista cerrada de «ningún estilo viejo mezclado».
- [ ] **Step 2: Fallo.**
- [ ] **Step 3: Aplicar** el mismo lenguaje (placas, `.btn3d`, título cartel, mundo `inicio`) a las diez pantallas y a los diálogos/avisos. Sin mecánicas nuevas; el contenido de otros jugadores sigue con `textContent` y bajo `data-sin-emoji`.
- [ ] **Step 4: Verde + recorrer** cada pantalla en los tres tamaños con datos `ZZTEST_` (una sala, un puntaje, un duelo con dos pestañas). Mostrar capturas al docente **por pantalla** antes de seguir.
- [ ] **Step 5: Commit** — `feat(ui): resto de pantallas y avisos con el estilo Aventura` (un commit por grupo si son muchos: medallas+ranking+info; sala; duelo; diálogos+avisos).

### Task 12: Tema claro = día

**Files:**
- Modify: `src/data/mundos.ts` (paletas `dia` definitivas), `src/ui/paisaje.ts` (sol, destellos, nubes), `src/styles/*.css` (placas y títulos en día)
- Test: `src/data/mundos.test.ts` (quitar el `it.skip`)

- [ ] **Step 1: Test** — para los 10 mundos en `dia`: texto `#3a2200` sobre la placa crema ≥ 4,5; texto blanco sobre la placa oscura compuesta sobre `cieloAlto` y `cieloBajo` ≥ 4,5; las colinas más cercanas contrastan ≥ 3:1 con `cieloBajo` (que el paisaje se distinga); `astro` de día es `#ffd23f` y de noche un tono claro de luna; `dia` ≠ `noche` en cada mundo.
- [ ] **Step 2–4:** fallo, definir las paletas de día (mismo matiz, cielo claro), verde. Probar `tema: claro`, `oscuro` y `auto` (emulando `prefers-color-scheme`) en menú, categorías, partida y final; alto contraste en ambos cielos.
- [ ] **Step 5: Commit** — `feat(tema): el tema claro es de dia, con paleta propia por mundo`.

### Task 13: Cierre y verificación

**Files:**
- Modify: `public/sw.js` solo si hace falta; `README`/docs: nota breve de cómo agregar un mundo
- Create: `docs/superpowers/specs/rediseno-visual-aventura/antes-despues.md`

- [ ] **Step 1: Offline** — `npx vite build`; servir `dist/` con un servidor estático, visitar dos veces (instala el service worker), **apagar el servidor** y recargar: el menú, las fuentes y los emojis cargan (Chromium real por Playwright; el Browser pane no registra service workers, ver `~/.claude/juegos-checklist.md` §2.1). Test de `src/sw.test.ts` sigue verde; el sello de caché cambió.
- [ ] **Step 2: Peso** — `public/emoji` ≤ 250 kB, `public/fonts` ≤ 90 kB, ilustración ≤ 100 kB, JS/CSS finales; anotar cifras. Rendimiento: medir fotogramas en la partida con CPU ×4 (Performance de DevTools) y anotar el resultado.
- [ ] **Step 3: Matriz** — 15 pantallas × {1280×720, 390×740, 360×640} × {noche, día} × {normal, alto contraste, reducir movimiento}: marcar en `antes-despues.md` qué se verificó y qué **no** (lo que no se pudo correr se dice).
- [ ] **Step 4: Tabla antes/después** por pantalla con capturas.
- [ ] **Step 5: Limpieza** — borrar `ZZTEST_` del `localStorage`, apagar servidores de prueba y el servidor de maquetas (`stop-server.sh`).
- [ ] **Step 6: Commit** — `docs(diseno): verificacion y tabla antes-despues del rediseno Aventura`. **No desplegar** sin el OK del docente.
