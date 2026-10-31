# Fondos de caza — diseño

Fecha: 2026-10-31. Pedido del docente: fondos más elaborados y estéticos, con escenarios de caza
(bosque, montaña, estepa…), uno por tipo de palabra, y **la hora del día cambia con el nivel**.
Muestras aprobadas: `.playwright-mcp/fondos*.png` (no versionadas). Se mantienen abstractos.

## Mapa de escenarios (objetivo final)

| Mundo | Escenario |
|---|---|
| inicio (menú) | Campamento junto a la laguna |
| sustantivos | Bosque |
| adjetivos | Estepa |
| verbos | Montaña nevada |
| adverbios | Humedal (caza de patos) |
| interjecciones | Páramo con tormenta (ciervo, matas, enebros) |
| preposiciones | Cañón con puente colgante |
| artículos / pronombres | Taiga con aurora / desierto de dunas (a confirmar) |
| conjunciones | Valle con dos ríos que se juntan (a confirmar) |

## Hora del día

- Nivel 1 = amanecer, nivel 2 = día, nivel 3 = noche (se repite si hubiera más).
- Pantallas fuera de una partida (menú, ajustes, ranking…) siguen el tema: oscuro = noche, claro = día.
- Los mundos que todavía no tienen escena propia usan el paisaje de colinas de antes con la paleta
  de noche (si la hora es noche) o de día (amanecer y día).

## Arquitectura

- `src/ui/escenas/`: una función pura por escena, `dibujar(hora, animado) → { fondo, izq, der, linea }`
  con cadenas SVG (sin imágenes ni red). Todo con azar sembrado: la escena sale igual cada vez.
- `fondo`: viewBox ancho `-350 0 1000 520`, `preserveAspectRatio="xMidYMax slice"`. El arte cubre
  de -350 a 650, así que en un celular vertical se ve el centro (≈274 unidades) y en una pantalla
  ancha se ve más escena en vez de estirarse.
- `izq` / `der`: dos SVG anclados a los bordes de la pantalla (pinos grandes, carpa y fogata).
- `linea`: altura (en unidades de la escena) donde las palabras aterrizan; se dibuja un
  `<rect class="pa-linea">` invisible y el juego lee su posición real en pantalla. El paisaje viejo
  sigue usando `.pa-agua`.
- Aterrizaje por escena: `agua` (la palabra se hunde con una onda) o `hojas` (se pierde entre el
  follaje con un puñado de hojas). Va en `data-aterrizaje` del contenedor.
- Animación: solo luciérnagas/motas y el fuego, con la misma regla de «menos movimiento» y de
  pestaña oculta que el paisaje anterior. Alto contraste sigue apagando el paisaje.
- Legibilidad: el detalle va en los bordes y abajo; el centro por donde caen las palabras queda calmo.

## Tandas

1. **Sistema + campamento (menú) + bosque (sustantivos)**, con las tres horas y los dos aterrizajes.
2. Estepa, montaña, humedal (más aterrizajes: pasto, nieve).
3. Páramo, cañón, taiga/desierto, valle.
4. Pulido: animaciones sueltas (pájaros, nieve, lluvia), rendimiento en tablets viejas.
