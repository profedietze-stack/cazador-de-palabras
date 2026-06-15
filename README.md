# Cazador de Palabras

**Juego educativo de gramática española** — identificá palabras según su clase gramatical antes de que se escapen. Con modo multijugador en tiempo real.

🎮 **[Jugar ahora](https://cazador-de-palabras.vercel.app)**

---

## ¿Qué es?

Cazador de Palabras es un juego de práctica gramatical para hispanohablantes. Aparecen palabras en un tablero y tenés que hacer clic solo en las que pertenecen a la categoría indicada — sustantivos, verbos, adjetivos, etc. — evitando los impostores.

Incluye un **Modo Duelo** PvP online: dos jugadores comparten el mismo tablero y compiten en tiempo real usando poderes especiales.

---

## Características

### Modo Solo

- **9 categorías gramaticales**: Sustantivos, Adjetivos, Verbos, Adverbios, Artículos, Pronombres, Preposiciones, Conjunciones e Interjecciones
- **3 niveles de dificultad** por categoría (más palabras y más impostores al subir)
- **Sistema de puntos y combos** — aciertos consecutivos multiplican el puntaje
- **Medallas** Bronze / Plata / Oro según rendimiento
- **10 logros** desbloqueables y sistema de títulos (Aprendiz → Campeón de Palabras)
- **Tabla de clasificación global** via Supabase
- **Modo oscuro** · **Efectos de sonido** · **Animaciones**
- Progreso guardado localmente por jugador

### Modo Duelo ⚔️

- **PvP online en tiempo real** — sin registro, solo elegís un nombre
- Creás una sala y compartís un código de 4 letras con tu rival
- Tablero compartido: las palabras que atrapa uno no las puede atrapar el otro
- Countdown 3-2-1 antes de empezar
- **5 poderes especiales** que se desbloquean cada 3 aciertos:

| Poder | Efecto |
|-------|--------|
| ❄️ Congelar | Paraliza al rival 3 segundos |
| 🎯 Robar | Te apropiás de la última palabra del rival |
| 👻 Señuelo | Aparecen palabras falsas en el tablero del rival durante 8 segundos |
| 🛡️ Escudo | Bloquea el próximo poder que te lancen |
| ⚡ Combo x2 | Duplica tus puntos por 10 segundos |

- **Revancha** sin salir de la sala
- Duración configurable: 60 / 90 / 120 segundos
- Categoría y nivel elegidos por el creador de la sala

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Cliente | Vite 5 + TypeScript (vanilla, sin framework) |
| Servidor duelo | Node.js + Socket.io 4 + TypeScript |
| Base de datos | Supabase (scores globales) |
| Deploy cliente | Vercel (auto-deploy en push a `master`) |
| Deploy servidor | Docker · VPS · Nginx reverse proxy |

---

## Estructura del proyecto

```
cazador-de-palabras/
├── src/
│   ├── main.ts                  # Entrada: inicializa pantallas y service workers
│   ├── types.ts                 # Tipos compartidos (modo solo)
│   ├── types/duel.ts            # Tipos del modo duelo y POWER_META
│   ├── data/
│   │   ├── categories.ts        # Listas de palabras por categoría (correctas / impostoras)
│   │   └── achievements.ts      # Definición de logros y títulos
│   ├── game/
│   │   ├── state.ts             # Singleton G — estado del modo solo
│   │   ├── duelState.ts         # Singleton D — estado del modo duelo
│   │   ├── GameEngine.ts        # Loop principal, spawning, fin de partida
│   │   ├── WordSpawner.ts       # Física y DOM de chips de palabras
│   │   └── ComboSystem.ts       # Multiplicadores de combo
│   ├── screens/                 # Una pantalla = un archivo (init* + mostrar*)
│   │   ├── ScreenManager.ts
│   │   ├── MenuScreen.ts
│   │   ├── DuelMenuScreen.ts
│   │   ├── DuelLobbyScreen.ts
│   │   ├── DuelGameScreen.ts
│   │   └── DuelResultScreen.ts
│   ├── services/
│   │   ├── DuelService.ts           # Wrapper Socket.io-client (singleton)
│   │   └── LeaderboardService.ts    # Supabase calls
│   ├── audio/AudioEngine.ts         # Síntesis de tonos Web Audio API
│   ├── ui/                          # Banner, Dialog, DecoBackground, Stickers
│   └── styles/                      # base.css · animations.css · components.css · screens.css
└── server/
    └── src/
        ├── index.ts             # Socket.io handlers, mapa de salas, endDuel
        ├── DuelRoom.ts          # CRUD de salas, catchWord, puntajes
        ├── PowerManager.ts      # Cooldowns y efectos de poderes (server-authoritative)
        └── types.ts             # RoomState, PlayerState, ActiveEffect
```

---

## Desarrollo local

### Cliente

```bash
npm install
npm run dev        # Vite en http://localhost:5174
npm run build      # Build de producción → dist/
npm run typecheck  # tsc --noEmit (sin bundle)
```

### Servidor de duelo

```bash
cd server
npm install
npm run dev        # ts-node en http://localhost:3001
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

No hay test suite. El tipo se verifica con `npm run typecheck`.

---

## Infraestructura

| Servicio | URL / Ubicación |
|----------|----------------|
| Cliente (Vercel) | https://cazador-de-palabras.vercel.app |
| Servidor Socket.io | VPS · Docker `cazador-duelo` · puerto 3001 |
| Proxy Nginx | `https://aulaplay.duckdns.org/duel/` → `localhost:3001` |
| Supabase | Tabla de scores global |

### Redeploy del servidor (tras cambios en `server/`)

```bash
scp -r server/src server/package*.json server/tsconfig.json server/Dockerfile root@<VPS_IP>:/opt/cazador-duelo/
ssh root@<VPS_IP> "cd /opt/cazador-duelo && docker build -t cazador-duelo . && docker stop cazador-duelo && docker rm cazador-duelo && docker run -d --name cazador-duelo --restart unless-stopped -p 3001:3001 cazador-duelo"
```

El cliente se redespliega automáticamente con cada push a `master`.

---

## Cómo jugar

### Modo Solo

1. Ingresá tu nombre en la pantalla de inicio
2. Elegí una categoría y un nivel
3. Hacé clic en las palabras correctas antes de que lleguen al borde
4. Evitá los impostores — bajan el puntaje y rompen el combo

### Modo Duelo

1. Hacé clic en **⚔️ Modo Duelo** en el menú
2. **Crear sala**: elegí categoría, nivel y duración → compartí el código de 4 letras con tu rival
3. **Unirse**: ingresá el código que te dio tu rival
4. Ambos presionan **¡Listo!** → countdown → ¡a cazar!
5. Usá los poderes (aparecen al costado del tablero) para sacar ventaja

---

## Créditos

Desarrollado para uso educativo en aulas de español.  
Palabras, definiciones y ejemplos seleccionados para nivel primario/secundario.
