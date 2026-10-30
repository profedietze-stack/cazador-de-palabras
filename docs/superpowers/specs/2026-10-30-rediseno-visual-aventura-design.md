# Rediseño visual «Aventura» — Cazador de Palabras

Fecha: 30-oct-2026. Estado: **a la espera de aprobación del docente**. Maquetas de referencia (abrir en un navegador, necesitan internet solo para las tipografías y los emojis de muestra):
`docs/superpowers/specs/rediseno-visual-aventura/menu-direcciones.html` (las tres direcciones del menú; la elegida es la B) y `aventura-pantallas.html` (categorías, partida, final y ajustes en la dirección elegida).

## 1. Intención

El docente (autor del juego) siente que el juego «se ve demasiado básico». Lo que más le molesta, en sus palabras: **el fondo estático, las tipografías, el diseño de los botones y el título insulso.** Quiere que el juego tenga identidad visual propia y se vea como un producto cuidado para chicos de secundaria, sin perder legibilidad ni rendimiento.

Se eligió la dirección **B · Aventura**: una noche de selva ilustrada, con colinas en capas que se desplazan, luna y luciérnagas; título de cartel con volumen; botones 3D que se hunden al tocarlos; emojis **Fluent 3D** (Microsoft, MIT). El docente aprobó además el resto de las pantallas de la maqueta («me gusta»).

## 2. Objetivos

1. Reemplazar el fondo degradado liso por fondos ilustrados y animados, propios del juego.
2. Tipografía con carácter para títulos y muy legible para las palabras que caen.
3. Botones con volumen, estados (reposo, hover, presionado, deshabilitado, foco) y microanimación.
4. Título del juego con presencia (cartel con volumen).
5. **Cada una de las 9 categorías es un «mundo»** con su paisaje y su paleta; la paleta se usa en la selección de categoría y en la partida.
6. Pantalla final con celebración proporcional al resultado (medalla 3D, rayos, confeti discreto) y el repaso de errores **plegado** por defecto.
7. Los emojis y stickers de todo el juego pasan a Fluent 3D servido desde el propio sitio.
8. Pantallas de ajustes, resultados de sala, duelo, medallas y logros, info y ranking con el mismo lenguaje.

## 3. No objetivos

- No cambiar reglas, puntajes, velocidades, tiempos, dificultad ni el contenido didáctico.
- No agregar mecánicas ni pantallas nuevas.
- No rehacer la lógica de las pantallas: es una capa de presentación (CSS, SVG, imágenes y los pocos puntos del DOM que haya que ajustar).
- No incluir en esta etapa los fondos «más trabajados» (ver §7).

## 4. Anti-objetivos (fracaso aunque «funcione»)

- Que las palabras que caen se lean peor sobre el nuevo fondo, o que el fondo compita con ellas.
- Que el juego se sienta lento o mareante en un celular viejo o en una tablet de escuela.
- Que se pierdan los ajustes de accesibilidad: alto contraste, reducir movimiento (también el del sistema), tamaño de palabras, fondo y stickers apagables deben seguir mandando.
- Que alguna pantalla quede sin scroll cuando el contenido no entra (ya pasó una vez).
- Cualquier recurso de terceros en ejecución (fuentes, imágenes, emojis desde un CDN).
- Que quede un estilo viejo mezclado con el nuevo en alguna pantalla.

## 5. Restricciones

**Técnicas.** Vite + TypeScript, DOM sin framework, CSS propio. Archivos de estilo actuales: `src/styles/{base,animations,components,screens,responsive,a11y,ajustes}.css`; variables en `:root` de `base.css`; fondo decorativo en `src/ui/DecoBackground.ts`; stickers en `src/ui/StickerSystem.ts`; ajustes en `src/storage/ajustes.ts` y `src/ui/aplicarAjustes.ts`.

**Privacidad y autonomía.** Fuentes (woff2), ilustraciones, íconos y emojis dentro del propio sitio. Los archivos nuevos van al precache del service worker (hay un test del sello de caché que falla si cambia lo precacheado sin renombrar la caché). El juego debe seguir arrancando sin internet.

**Rendimiento.** Hoy: JS 192 kB, CSS 38 kB. Presupuesto orientativo de imágenes ≈ 400 kB en total (SVG o webp optimizado). Primera carga sin saltos de layout. Objetivo 60 fps en un celular viejo; las animaciones de fondo se pausan con la pestaña oculta y se apagan con «reducir movimiento».

**Accesibilidad.** Contraste de texto ≥ 4,5:1 (**se mide, no se supone**), blancos táctiles ≥ 44 px, foco visible, nada que dependa solo del color, las palabras que caen siguen ≥ 18 px (hay un test). Los emojis pasan a imágenes con `alt` correcto. Un solo `<main>`.

**Contenido.** Textos en voseo. Todo texto de otro jugador se muestra con `textContent`.

**Proceso.** Un commit por tanda, sin pushear. Nada se despliega sin el OK del docente. Cada tanda: tests, `tsc`, lint (0 errores), build, y el juego abierto y **jugado** en un navegador (título correcto, consola sin errores, silenciado), con capturas en 1280×720, 390×740 y 360×640, en tema claro y oscuro y con alto contraste y reducir movimiento activados.

## 6. Decisiones tomadas

Del docente: dirección B · Aventura; emojis Fluent 3D; mundos por categoría; las pantallas de la maqueta (categorías, partida, final, ajustes) le gustan.

De la maqueta, que el builder puede tomar como punto de partida visual (son mías y están sujetas a ajuste):
- **Tipografías:** títulos **Lilita One**, texto y palabras **Baloo 2** (800 para botones y palabras). Ambas con licencia OFL, a incluir como woff2 propio con `font-display: swap` y subconjunto latino.
- **Título:** amarillo con contorno marrón y extrusión en capas de sombra (efecto cartel).
- **Botones 3D:** cuerpo con borde inferior grueso más oscuro y sombra; al presionar bajan 4 px y se achata el borde. Variantes: secundario (verde azulado), principal (naranja), confirmar (verde).
- **Palabras que caen:** placa crema con letra marrón oscura y borde inferior; acierto en verde claro.
- **Placas del HUD y estadísticas:** oscuras, translúcidas, con borde claro.
- **Selección de categoría:** cuadrícula de 9 tarjetas con paisaje propio, ícono 3D y estrellas de progreso.
- **Final:** medalla 3D con rayos que giran, confeti, estadísticas en placas, repaso plegado (se abre al tocar), logro en placa amarilla, botones Menú / Reintentar / Siguiente.
- **Ajustes:** paneles tipo pergamino con interruptores y deslizadores grandes.
- **Mundos** (paleta propuesta; cielo superior → inferior y tres capas de colinas; **a refinar y medir**): Sustantivos selva verde azulado; Adjetivos jardín al atardecer (rosa/violeta); Verbos río y cielo (azules); Adverbios costa (turquesa y arena); Artículos montañas (violeta); Pronombres bosque rosado; Preposiciones pradera (verdes claros); Conjunciones volcán al ocaso (naranjas y rojos); Interjecciones tormenta (amarillo y verde). Los valores exactos están en `aventura-pantallas.html`.

## 7. Etapa posterior (fuera de este alcance, pero hay que no cerrarle la puerta)

El docente quiere, **más adelante**, fondos más trabajados por mundo, **manteniéndolos abstractos**: por ejemplo uno con montañas, uno con bosque, uno de playa, con animaciones. Para no rehacer nada después, la implementación debe definir cada mundo como **datos** (nombre, paleta, capas de paisaje, partículas) en un solo lugar, y dibujar el paisaje desde esa definición, de modo que cambiar el paisaje de un mundo no toque las pantallas. En esta etapa todos los mundos usan el mismo estilo de colinas con paleta propia.

## 8. Lo que queda al criterio del builder

- Cómo generar y animar las capas (SVG inline, CSS, canvas) mientras cumpla rendimiento y reducir movimiento.
- Valores finales de color (con contraste medido), sombras, radios y duraciones.
- Pipeline y formato de los emojis (webp de Fluent 3D incluidos en `public/`, subconjunto de los realmente usados, función central emoji → `<img>` con `alt`, y un test que verifique que cada emoji usado tiene su archivo).
- Orden exacto de las tandas dentro de la secuencia sugerida: tokens y tipografía → componentes (botón, placa, título) → menú → categorías → partida → pantalla final → ajustes → resto (medallas y logros, ranking, info, sala docente, duelo).
- Qué íconos usar donde la maqueta puso emojis provisorios: **el juego ya tiene un ícono por categoría** (🏠 🎨 ⚡ 📍 📌 👤 🔗 🔀 💬) y por logro; se pasa cada uno a su equivalente Fluent 3D, no se cambian por otros.

## 9. Criterios de aceptación

- Todas las pantallas del juego usan el lenguaje nuevo; ninguna conserva el degradado liso ni la tipografía anterior.
- Tests, `tsc`, lint (0 errores) y build en verde; los tests de accesibilidad existentes siguen pasando (18 px mínimo, scroll, etc.).
- Contraste ≥ 4,5:1 medido para texto en cada mundo y en tema oscuro y alto contraste.
- Sin ningún recurso de red de terceros (verificable con la pestaña Red del navegador) y juego funcional con el servidor apagado.
- Una partida completa jugada de principio a fin en cada tamaño de pantalla, sin errores de consola y con el título correcto.
- Presupuesto de peso respetado, o desvío explicado.
- Con «reducir movimiento» (del sistema o de Ajustes) no hay animación de fondo ni confeti.
- Tabla antes/después por pantalla y lista de lo que **no** se pudo verificar.

## 10. Aclaraciones tras la revisión del documento

**Las maquetas son el punto de partida visual y mandan sobre este texto** en paletas, disposición de tarjetas, HUD, pantalla final y ajustes (los valores del texto de §6 son un resumen). No se copian tal cual: se reemplazan las fuentes y los emojis de internet por archivos propios y se reescribe todo como CSS/TS del proyecto.

**Pantallas (15):** `menuPrincipal`, `seleccionCategoria`, `preNivel`, `gameScreen`, `resultadoScreen`, `medallasScreen`, `rankingScreen`, `infoScreen`, `salaScreen`, `resultadosSalaScreen`, `duelMenuScreen`, `duelLobbyScreen`, `duelGameScreen`, `duelResultScreen`, `ajustesScreen`. Solo las cuatro de la maqueta (categorías, partida, final, ajustes) y el menú tienen diseño aprobado; para las otras diez el builder aplica el mismo lenguaje (placas, botones 3D, tipografías) sin inventar mecánicas, y las muestra al docente por tanda. **Superposiciones a incluir:** `#dialogOverlay` (diálogos), avisos y banner de errores, `#porQue`, `#comboDisplay` y los puntos flotantes.

**Mundo por defecto.** Menú, ajustes, ranking, info, sala, duelo y logros usan el mundo de Sustantivos (selva, el de la maqueta del menú). La paleta de cada categoría rige en la selección de categoría, en la pre-pantalla del nivel, en la partida y en la pantalla final de esa partida.

**Qué hace cada ajuste con el fondo (decisión del autor del documento, a confirmar):**
- «Fondo» apagado → paisaje **estático** con los colores del mundo (sin movimiento, luciérnagas ni partículas), no un color liso.
- «Reducir movimiento» (del alumno o del sistema) → igual: paisaje estático y sin confeti.
- «Alto contraste» → sin paisaje: fondo liso del mundo, mucho más oscuro, y placas con borde grueso.
- «Stickers y emojis» sigue siendo una capa aparte (stickers del menú y del combo), por encima del fondo, y se apaga sola. Los emojis que forman parte de la interfaz (íconos de botones, categorías, logros) **no** se apagan: son parte del diseño.
- `DecoBackground.ts` (palabras flotantes del menú) se reemplaza por el paisaje; las palabras flotantes pueden quedar como un detalle del menú si se ven bien, sujeto a el ajuste de fondo.

**Emojis.** Son datos estáticos del juego (íconos de categoría, logros, medallas, botones, stickers): pasan a imágenes con `alt`. Una función central devuelve un **nodo del DOM** (no HTML en texto), de modo que el texto de otros jugadores nunca pasa por ella y sigue usando `textContent`; si un nombre de alumno trae un emoji, se muestra como texto del sistema.
- **Fuente de los archivos:** el paquete npm `@lobehub/fluent-emoji-3d@1.1.0` (webp, MIT). Comprobado el 30-oct-2026: de los **88 emojis distintos** que usa el juego, los 88 tienen archivo. No se instala ni se baja nada sin el OK del docente; la copia se hace una sola vez a `public/` y solo del subconjunto usado.
- **Tamaño:** los webp del paquete pesan 5,1 kB de media (≈ 449 kB para 88), que por sí solos pasan el presupuesto. Hay que reducirlos (se muestran como mucho a ~72 px, así que alcanza con 128–144 px) y verificar el total.

**Presupuesto (revisado):** emojis ≤ 250 kB; ilustración propia (paisajes, medalla, rayos) ≤ 100 kB; tipografías aparte, ≤ 90 kB entre las dos (subconjunto latino, solo los pesos usados). Si algo no entra, se explica el desvío en lugar de ocultarlo.

**Colores de botón sobre cada mundo.** Los botones principal (naranja), secundario (verde azulado) y confirmar (verde) pueden chocar con algunos mundos (naranja sobre el volcán). El builder lo revisa mundo por mundo y, si hace falta, el acento del botón se toma de la paleta del mundo.

**Tema claro = mundo de día (decidido por el docente).** El tema de Ajustes manda sobre el cielo: *oscuro* = noche (la de las maquetas: luna y luciérnagas); *claro* = día, el mismo mundo con cielo diurno y sol (en lugar de luna y luciérnagas, nubes o destellos suaves); *auto* sigue al sistema. Cada mundo tiene entonces **dos paletas** (noche y día), con cielo, tres capas de colinas, acento y placas. Las placas de interfaz (crema con letra oscura, o placas oscuras translúcidas) se ajustan para leerse bien en ambos. Los contrastes (≥ 4,5:1) se miden en las 9 × 2 combinaciones y en alto contraste. Se construye primero la noche (que ya está diseñada) y el día como tanda propia, antes de dar el rediseño por terminado.

**Descargas autorizadas.** El docente autorizó traer el paquete de emojis Fluent 3D (`@lobehub/fluent-emoji-3d`) y las tipografías Lilita One y Baloo 2, cuando se apruebe este documento. Solo se copia el subconjunto usado a `public/`; nada se instala como dependencia del juego.
