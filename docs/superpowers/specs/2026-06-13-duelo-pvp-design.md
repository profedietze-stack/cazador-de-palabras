# Modo Duelo PvP — Cazador de Palabras

**Fecha:** 2026-06-13  
**Estado:** Aprobado

---

## Resumen

Modo de dos jugadores en tiempo real: cada uno en su propio dispositivo, comparten tablero sincronizado via Socket.io. Capturan palabras gramaticales en competencia directa y se lanzan poderes con cooldown para afectar al rival.

---

## Arquitectura

### Stack
- **Socket.io** en VPS (aulaplay.duckdns.org:3001) — Docker container separado de PocketBase
- **Nginx** reverse proxy: `/duel/` → socket.io server
- **Cliente**: Vite+TS, socket.io-client
- **Sin Supabase** para duelos — estado en memoria del servidor (no persiste entre reinicios)

### Salas de duelo
- Código de 4 caracteres alfanumérico generado server-side
- Máximo 2 jugadores por sala
- Sala destruida cuando ambos desconectan o partida termina
- Timeout: sala sin segundo jugador se destruye a los 5 minutos

---

## Flujo de partida

```
Jugador A                    Servidor                    Jugador B
   |                            |                            |
   |── create_duel(config) ───>|                            |
   |<─ duel_created(code) ─────|                            |
   |                            |<── join_duel(code) ───────|
   |<─ rival_joined(nombre) ───|── rival_joined(nombre) ──>|
   |                            |                            |
   |── ready() ───────────────>|<── ready() ───────────────|
   |<─ duel_start(board) ──────|── duel_start(board) ─────>|
   |                            |                            |
   |── word_caught(wordId) ───>|                            |
   |<─ word_taken(wordId,A) ───|── word_taken(wordId,A) ──>|
   |                            |                            |
   |── use_power(FREEZE) ─────>|                            |
   |                 [valida cooldown]                       |
   |<─ power_effect(FREEZE,A) ─|── power_effect(FREEZE,A) >|
   |                            |                            |
   |<─ duel_end(winner,scores)─|── duel_end(winner,scores)>|
```

---

## Tablero compartido

- Generado server-side con seed aleatoria → mismo para ambos jugadores
- Usa categoría gramatical y nivel configurado por Jugador A al crear sala
- Palabras: lista de 20-30 ítems según nivel
- Estado de cada palabra: `libre | tomada_por_A | tomada_por_B`
- Race condition: servidor aplica FIFO — primero en llegar gana; segundo recibe `word_already_taken`

---

## Poderes

Cooldown manejado en servidor (`Map<socketId, Map<powerId, lastUsed: number>>`). Cliente solo muestra UI de cooldown local (no confiar en cliente para validar).

| ID | Nombre | Efecto | Duración | Cooldown |
|----|--------|--------|----------|---------|
| `FREEZE` | ❄️ Congelar | Rival no puede tocar palabras | 3 seg | 25 seg |
| `STEAL` | 🎯 Robar | Próxima captura del rival suma puntos a vos en cambio | 1 captura | 20 seg |
| `DECOY` | 👻 Señuelo | 4 palabras falsas aparecen en tablero del rival | 8 seg | 30 seg |
| `SHIELD` | 🛡️ Escudo | Absorbe el próximo poder recibido | 1 uso | 22 seg |
| `DOUBLE` | ⚡ Combo x2 | Tu próxima captura vale el doble | 1 captura | 18 seg |

### Interacciones entre poderes
- `FREEZE` + `SHIELD` activo → bloqueado, rival recibe `power_blocked`
- `STEAL` + `SHIELD` activo → bloqueado
- `DECOY` + `SHIELD` activo → bloqueado (consume el escudo)
- `DOUBLE` no puede ser bloqueado (efecto propio, no afecta rival)

### Carga de poderes
- Jugadores empiezan sin poderes
- Cada N palabras cazadas desbloquea un poder aleatorio (N=3)
- Máximo 2 poderes en inventario simultáneamente
- Si inventario lleno, siguiente captura no otorga poder

---

## Puntuación

- Base por palabra: igual al modo normal (según nivel)
- `DOUBLE` activo: x2 sobre puntos base
- `STEAL`: puntos de la captura del rival van al ladrón (rival no suma nada)
- Fin de partida: quien acumuló más puntos gana
- Empate posible → se muestra como tal

---

## Condiciones de fin

1. Timer llega a 0 (duración configurable: 2, 3 o 5 minutos)
2. Todas las palabras del tablero capturadas
3. Un jugador desconecta → rival gana automáticamente (con aviso)

---

## Configuración al crear sala (Jugador A)

- Categoría gramatical (sustantivos, verbos, adjetivos, etc.)
- Nivel (1, 2 o 3)
- Duración (2 / 3 / 5 minutos)
- Nombre de jugador A

---

## Eventos Socket.io

### Cliente → Servidor
```typescript
create_duel(config: { cat: string; nivel: number; duracion: number; nombre: string })
join_duel(code: string, nombre: string)
player_ready()
word_caught(wordId: string)
use_power(powerId: PowerId)
```

### Servidor → Cliente(s)
```typescript
duel_created(code: string)
rival_joined(nombre: string)
duel_start(board: Word[], duracion: number)
word_taken(wordId: string, byPlayer: 'A' | 'B')
word_already_taken(wordId: string)
power_earned(powerId: PowerId)
power_effect(powerId: PowerId, fromPlayer: 'A' | 'B')
power_blocked(powerId: PowerId)   // tu poder fue absorbido por escudo rival
score_update(scores: { A: number; B: number })
duel_end(winner: 'A' | 'B' | 'draw', scores: { A: number; B: number })
rival_disconnected()
error(message: string)
```

---

## Pantallas nuevas (cliente)

1. **DuelMenuScreen** — botones "Crear duelo" / "Unirse a duelo"
2. **DuelLobbyScreen** — muestra código sala, estado de conexión rival, botón Ready
3. **DuelGameScreen** — tablero compartido + HP rival + barra de poderes + cooldown timers
4. **DuelResultScreen** — ganador, puntajes, opción revancha

---

## Servidor Socket.io

- Node.js + Socket.io (TypeScript)
- `src/rooms/` — lógica de sala
- `src/powers/` — validación y cooldowns
- `src/board/` — generación de tablero con seed
- Docker container: `socketio-server` puerto 3001
- Nginx: `location /duel/ { proxy_pass http://localhost:3001; }`

---

## Archivos a crear/modificar

### Servidor (repo separado o carpeta `server/` en mismo repo)
- `server/src/index.ts` — entrada Socket.io
- `server/src/rooms/DuelRoom.ts` — estado de sala
- `server/src/powers/PowerManager.ts` — cooldowns y efectos
- `server/src/board/BoardGenerator.ts` — seed → palabras
- `server/package.json` + `server/tsconfig.json`
- `server/Dockerfile`

### Cliente (src/)
- `src/screens/DuelMenuScreen.ts`
- `src/screens/DuelLobbyScreen.ts`
- `src/screens/DuelGameScreen.ts`
- `src/screens/DuelResultScreen.ts`
- `src/services/DuelService.ts` — wrapper Socket.io client
- `src/types/duel.ts` — tipos compartidos
- `index.html` — nuevas secciones
- `src/styles/screens.css` — estilos duelo
- `src/screens/ScreenManager.ts` — nuevos ScreenId
- `src/screens/MenuScreen.ts` — botón Duelo

---

## Secuencia de implementación

1. Servidor Node.js + Socket.io básico (create/join/start)
2. Docker + Nginx en VPS
3. BoardGenerator con seed
4. DuelMenuScreen + DuelLobbyScreen (cliente)
5. DuelGameScreen con tablero sincronizado (sin poderes)
6. PowerManager server-side + UI poderes cliente
7. DuelResultScreen + revancha
8. Pulido: animaciones freeze/señuelo, sonidos

---

## Decisiones descartadas

- **Mismo dispositivo pantalla dividida**: incómodo en mobile
- **Turno a turno (Supabase)**: pierde tensión del tiempo real
- **PartyKit**: costo adicional; Socket.io en VPS existente = $0
- **Supabase Realtime**: latencia 200-500ms vs 20-50ms Socket.io
