# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Client (root)
npm run dev          # Vite dev server — port 5174
npm run build        # TypeScript compile + Vite bundle → dist/
npm run typecheck    # tsc --noEmit (no bundle)
npm run preview      # Serve dist/ locally

# Server (server/)
cd server
npm run dev          # ts-node src/index.ts (port 3001)
npm run build        # tsc → dist/
npm start            # node dist/index.js
```

No test suite exists.

## Architecture

Single-page app: **Vite 5 + TypeScript (vanilla, no framework)**. One HTML file, one CSS bundle, one JS bundle. Entry: `src/main.ts`.

### Client structure

```
src/
  main.ts              # Imports all CSS, initialises all screens, theme/volume/SW
  types.ts             # Shared types: CategoryKey, GameState, GameRecord, etc.
  types/duel.ts        # Duel-specific types: PowerId, DuelWord, POWER_META
  data/                # Static word lists (categories.ts) and achievement defs
  game/
    state.ts           # Singleton G: GameState — mutable game state for solo mode
    duelState.ts       # Singleton D: DuelState — mutable state for Duelo PvP
    GameEngine.ts      # Game loop: spawning, scoring, end-game logic
    WordSpawner.ts     # Timed word physics and DOM chip management
    ComboSystem.ts     # Combo multipliers
    ScoreSystem.ts     # Achievement checks
  screens/             # One file per screen; each exports init*() + mostrar*()
    ScreenManager.ts   # mostrar(ScreenId) — CSS transition between screens
    MenuScreen.ts      # Main menu, name modal
    Duel*Screen.ts     # 4 files for the PvP duel flow
  services/
    DuelService.ts     # Socket.io-client wrapper; singleton duelService
    LeaderboardService.ts  # Supabase calls for global/sala ranking
  storage/
    GameStorage.ts     # localStorage keyed by player name (cdp_<nombre>)
  audio/AudioEngine.ts # Web Audio API synth tones
  ui/                  # Banner, Dialog, DecoBackground, StickerSystem
  styles/              # base.css, animations.css, components.css, screens.css, responsive.css
```

**Screen lifecycle**: every screen div has `id="*Screen"` and class `screen`. `ScreenManager.mostrar(id)` adds CSS class `exiting` to current screen, waits 260 ms, then adds `active` to next. All `init*()` functions are called once in `main.ts` on startup; they only attach event listeners. `mostrar*()` functions populate dynamic content then call `ScreenManager.mostrar`.

**State singletons**: `G` (solo game) and `D` (duel) are plain mutable objects — no Vuex/Redux. Direct mutation is the pattern everywhere.

### Duel (Modo Duelo) flow

```
DuelMenuScreen  →  DuelLobbyScreen  →  DuelGameScreen  →  DuelResultScreen
   createDuel         rival_joined        word_taken           duel_end
   joinDuel           countdown_start     power_effect         rematch_start
                      duel_start          duel_end
```

`DuelService` (singleton) wraps Socket.io. Key design: **`disconnect()` does NOT clear handlers** — all `duelService.on(...)` registrations happen once at `init*()` time and survive reconnects. Guards use `D.phase` to ignore events in wrong states.

Word list is generated **client-side** (by Player A / creator) and sent to server in `create_duel`. Server stores it authoritatively and tracks `takenBy`.

### Server (`server/`)

Node.js + Socket.io 4, TypeScript, CommonJS. Deployed as Docker container on VPS port 3001.

```
server/src/
  types.ts       # RoomState, PlayerState, ActiveEffect
  DuelRoom.ts    # Room CRUD, catchWord logic, power unlock (every 3 catches)
  PowerManager.ts # Server-authoritative cooldowns, effect application
  index.ts       # Socket.io event handlers, room map, endDuel, rematch reset
```

**In-memory only** — no database. All state lost on container restart. Room cleanup: 30 s after `duel_end`, 5 min idle timeout for rooms without a second player.

### Infrastructure

| Service | URL / Location |
|---|---|
| Client (Vercel) | https://cazador-de-palabras.vercel.app |
| Socket.io server | `root@38.45.71.187` · Docker `cazador-duelo` · port 3001 |
| Nginx proxy | `https://aulaplay.duckdns.org/duel/` → `http://localhost:3001/` |
| PocketBase | port 8090 (unrelated, same VPS) |
| Supabase | global/sala leaderboard (anon key in `src/lib/supabase.ts`) |

To redeploy server after changes:
```bash
# Copy changed files and rebuild on VPS
scp -r server/src server/package*.json server/tsconfig.json server/Dockerfile root@38.45.71.187:/opt/cazador-duelo/
ssh root@38.45.71.187 "cd /opt/cazador-duelo && docker build -t cazador-duelo . && docker stop cazador-duelo && docker rm cazador-duelo && docker run -d --name cazador-duelo --restart unless-stopped -p 3001:3001 cazador-duelo"
```

Client deploys automatically on push to `master` via Vercel.

## Key conventions

- **Encoding**: use Python binary writes (not PowerShell `Set-Content`) for any file containing emoji — PowerShell corrupts UTF-8 emoji.
- **CSS variables**: all colours via CSS custom properties (`var(--panel-bg)`, `var(--border)`, etc.) defined in `base.css`. Dark mode via `html[data-theme="dark"]`.
- localStorage keys: all prefixed `cdp_` to avoid collisions.
- All game copy is in Spanish (Argentina).
