# Migraciones de PocketBase — cazador-de-palabras

Estas migraciones se aplican en el VPS (`https://aulaplay.duckdns.org`), no en
este repo. Se versionan acá para tener el historial del backend junto al código
que depende de él.

La instancia es **compartida** entre varios juegos. Estas migraciones tocan sólo
las colecciones `cdp_*`. Las de `choque-civilizaciones` y `mitos-y-leyendas`
viven en sus repos, y la numeración no se pisa.

| Migración | Aplicada | Qué hace |
|---|---|---|
| `1788600000_cdp_device_hashes.js` | ✅ 2026-09-05 | Agrega `creator_device_hash` y `device_hash`. Bloquea la mutación de identidad y `code` por UPDATE. Aditiva. |
| `1788700000_cdp_drop_raw_device_id.js` | ❌ **pendiente** | Elimina `creator_device_id` y `device_id`. **Cierra la exposición.** |

## El problema

`getDeviceId()` genera un UUID en localStorage que define la propiedad de las
salas. Ese UUID se guardaba en `cdp_salas.creator_device_id` y en
`cdp_scores.device_id`, y **ambas colecciones tienen lectura pública**.

Cualquiera podía listar la colección, copiar el UUID del docente a su propio
localStorage y quedar como dueño de sus salas: verlas en "mis salas",
desactivarlas y borrarlas. Sin escribir una línea de código, sólo editando
localStorage desde el navegador.

Además `cdp_scores` publica el mismo UUID junto al nombre del jugador, así que
también servía para correlacionar todos los puntajes de un dispositivo.

## Por qué la segunda está pendiente

El cliente está en modo dual: escribe hash y UUID viejo, y consulta por
`(hash OR uuid)` para que las salas creadas antes sigan siendo administrables.

Comprobado end-to-end: robando el hash no se consigue nada, pero **robando el
UUID en crudo la suplantación todavía funciona**. La segunda migración es la que
cierra el agujero.

**Antes de aplicarla:** desplegar el cliente nuevo, crear una sala, cerrar y
reabrir el navegador y confirmar que sigue apareciendo en "mis salas".

**Ojo con las salas viejas:** las creadas antes del paso 1 sólo tienen el UUID,
sin hash. Al eliminar la columna quedan huérfanas y nadie va a poder
administrarlas. Si hay salas activas que importen, conviene recrearlas antes.
