# Diseño: Robustez y Resiliencia — Cazador de Palabras

**Fecha:** 2026-06-30  
**Proyecto:** `C:\Users\nicod\Documents\cazador-de-palabras`  
**Deploy:** cazador-de-palabras.vercel.app  
**Backend:** PocketBase en https://aulaplay.duckdns.org (cdp_scores, cdp_salas)

---

## Alcance

7 áreas de robustez auditadas e implementadas:

1. Red/PocketBase — retry + toasts de error
2. Estado de juego — verificación de guards existentes
3. Nombre de jugador — validación mínima
4. Sala code duplicado — detección específica de error unique constraint
5. localStorage corrupto — wrapping completo con try/catch
6. Duel disconnect — overlay y handlers de desconexión
7. TypeScript strict — activar strictNullChecks + noUncheckedIndexedAccess

---

## 1. Red / PocketBase

### Problema
- `postScore` falla silenciosamente — score perdido si red fluctúa
- `fetchGlobalRanking` / `fetchMisSalas` retornan `[]` sin feedback al usuario

### Solución

**Nuevo helper `src/utils/network.ts`:**
```ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try { return await fn() }
    catch (e) {
      lastErr = e
      if (i < retries - 1) await new Promise(r => setTimeout(r, baseDelayMs * 2 ** i))
    }
  }
  throw lastErr
}
```

**`postScore` en `LeaderboardService.ts`:**
- Envolver llamada a PB con `withRetry(fn, 3, 500)`
- Si falla los 3 intentos: mostrar toast no-bloqueante "Sin conexión — puntaje no registrado en el ranking global"

**`fetchGlobalRanking` / `fetchMisSalas` / `fetchSalaRanking`:**
- En el bloque `catch`, llamar `showToast('Sin conexión — no se pudo cargar el ranking')` antes de retornar `[]`

**Nuevo helper `showToast(msg, durationMs = 3000)`:**
- Implementar en `src/ui/Toast.ts`
- Toast flotante no-bloqueante (bottom center), auto-desaparece
- Sin interferir con el ErrorBanner existente

---

## 2. Estado de juego

### Hallazgo
Guards ya correctos:
- `iniciarTimer`: `if (G.pausado || !G.activo) return` ✓
- `cazarPalabra`: `if (!G.activo || el.dataset.cazada === '1') return` ✓
- `terminarJuego` setea `G.activo = false` antes de limpiar ✓

### Solución
No se requieren cambios de lógica. Agregar comentario inline en `cazarPalabra` y `iniciarTimer` marcando que los guards son intencionales para proteger contra clicks durante animaciones de resultado.

---

## 3. Nombre de jugador

### Problema
`initPreLevelScreen` → click en "Entendido" llama `iniciarJuego()` sin validar `G.jugador`. Se puede jugar con nombre vacío → score se guarda como `""`.

### Solución
En `PreLevelScreen.ts`, antes de llamar `iniciarJuego()`:
```ts
if (G.jugador.trim().length < 2) {
  await showAlert('Ingresá tu nombre (mínimo 2 caracteres) antes de jugar.')
  return
}
```

También verificar en `MenuScreen` cuando el usuario edita el nombre: no permitir guardar menos de 2 caracteres (inline feedback, no alert).

---

## 4. Sala code duplicado

### Problema
`crearSala` atrapa todo con `catch (_) { return false }`. PocketBase retorna `ClientResponseError` con `status: 400` y data de validación cuando el code ya existe (unique constraint). El usuario ve un mensaje genérico sin saber si puede reintentar o necesita otro código.

### Solución

**Cambiar firma de `crearSala`:**
```ts
export async function crearSala(
  code: string, nombre: string, descripcion?: string
): Promise<'ok' | 'duplicate' | 'error'>
```

En el catch:
```ts
catch (e) {
  if (e instanceof ClientResponseError && e.status === 400) {
    const data = e.response?.data as Record<string, unknown> | undefined
    if (data?.code) return 'duplicate'
  }
  return 'error'
}
```

**`SalaScreen.ts`:** leer el resultado y mostrar mensaje específico:
- `'duplicate'` → "Ese código ya existe. Generá uno nuevo."
- `'error'` → "No se pudo crear la sala. Intentá más tarde."

---

## 5. localStorage corrupto

### Problema
Safari private mode lanza excepción en cualquier acceso a `localStorage`. Código sin proteger:
- `guardarDatos()` en `GameStorage.ts` — sin try/catch
- 3 lecturas bare en `main.ts` (tema, sonido, nombre)

### Solución

**`GameStorage.ts`:** wrappear `guardarDatos` y `getRankingGlobal` (iteración de LS):
```ts
export function guardarDatos(d: PlayerData): void {
  try { localStorage.setItem(storageKey(), JSON.stringify(d)) } catch { /* Safari private */ }
}
```

**`main.ts`:** extraer `initTheme()` e `initPrefs()` como funciones con try/catch interno. Usar `lsGet`/`lsSet` de LeaderboardService (ya protegidos) — mover esos helpers a `src/utils/storage.ts` para uso compartido.

**`src/utils/storage.ts` (nuevo):**
```ts
export function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
export function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch { /* Safari private / quota */ }
}
```

Re-exportar desde `LeaderboardService` para no romper imports existentes.

---

## 6. Duel disconnect

### Problema
`DuelGameScreen` no tiene handler para:
- `disconnect` (socket propio cae mid-duelo → pantalla congelada)
- `rival_disconnected` en phase `playing` (ya manejado en lobby pero no en juego)

### Solución

**HTML (`index.html`):** agregar overlay `duelDisconnectOverlay` (similar a `duelFreezeOverlay`):
```html
<div id="duelDisconnectOverlay" class="duel-overlay" style="display:none">
  <div class="duel-overlay-content">
    <p>⚠️ Conexión perdida</p>
    <button id="btnDuelDisconnectBack">Volver al menú</button>
  </div>
</div>
```

**`DuelGameScreen.ts`:** en `initDuelGameScreen()`:
```ts
duelService.on('disconnect', () => {
  if (D.phase !== 'playing') return
  stopTimer()
  D.phase = 'ended'
  document.getElementById('duelDisconnectOverlay')!.style.display = 'flex'
})

duelService.on('rival_disconnected', () => {
  if (D.phase !== 'playing') return
  stopTimer()
  D.phase = 'ended'
  showAlert('Tu rival se desconectó. El duelo terminó.').then(() => {
    cleanupDuelGame()
    duelService.disconnect()
    mostrar('menuPrincipal')
  })
})
```

**Botón "Volver al menú"** en overlay disconnect: `cleanupDuelGame()`, `duelService.disconnect()`, `mostrar('menuPrincipal')`.

**`cleanupDuelGame()`:** también ocultar `duelDisconnectOverlay`.

---

## 7. TypeScript strict

### Problema
`tsconfig.json`: `strict: false`, `noImplicitAny: false`. Sin `strictNullChecks` los null/undefined no se detectan en compile-time.

### Solución — activación gradual

**Paso 1:** Agregar solo `"strictNullChecks": true` al tsconfig. Corregir todos los errores resultantes (principalmente: operador `!` faltante en getElementById calls ya existentes, y `G.intervaloTiempo` que ya se maneja).

**Paso 2:** Agregar `"noUncheckedIndexedAccess": true`. Corregir accesos a arrays sin null-check (principalmente `COMBOS[G.comboNivel]` en GameEngine que retornará `T | undefined`).

**No activar** `strict: true` completo en esta iteración — demasiado disruptivo. El roadmap es: strictNullChecks → noUncheckedIndexedAccess → strict completo en iteración futura.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/utils/network.ts` | Nuevo — `withRetry` |
| `src/utils/storage.ts` | Nuevo — `lsGet`/`lsSet` compartidos |
| `src/ui/Toast.ts` | Nuevo — toast no-bloqueante |
| `src/services/LeaderboardService.ts` | retry en postScore, toasts en fetch*, firma crearSala |
| `src/screens/SalaScreen.ts` | Leer resultado 'ok'|'duplicate'|'error' |
| `src/screens/PreLevelScreen.ts` | Validar G.jugador >= 2 chars |
| `src/screens/MenuScreen.ts` | Validar nombre al editar |
| `src/screens/DuelGameScreen.ts` | Handlers disconnect + rival_disconnected, cleanup overlay |
| `src/storage/GameStorage.ts` | try/catch en guardarDatos, getRankingGlobal |
| `src/main.ts` | try/catch en lecturas bare de localStorage |
| `index.html` | duelDisconnectOverlay |
| `tsconfig.json` | strictNullChecks + noUncheckedIndexedAccess |

---

## Criterios de éxito

- `postScore` reintenta 3 veces antes de descartar; si falla muestra toast
- Ranking vacío muestra toast "Sin conexión" en vez de tabla vacía
- Código de sala duplicado muestra mensaje específico
- No hay excepción en Safari private mode
- Duelo con socket caído muestra overlay de error, no pantalla congelada
- `tsc --noEmit` pasa con strictNullChecks + noUncheckedIndexedAccess activos
