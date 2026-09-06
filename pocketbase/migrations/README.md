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
| `1788700000_cdp_drop_raw_device_id.js` | ✅ 2026-09-05 | Elimina `creator_device_id` y `device_id`. **Cierra la exposición.** |
| `1789200000_cdp_clave_por_docente.js` | ✅ 2026-09-05 | Clave por docente y privacidad: cada uno maneja y ve sólo sus salas. Elimina el ranking global. |
| `1790400000_limpieza_pruebas_cdp.js` | ✅ 2026-09-05 | Borra los registros usados para verificar esas reglas. |
| `1790600000_limpieza_xss.js` | ✅ 2026-09-05 | Borra la sala envenenada usada para verificar el arreglo del XSS. |
| `1790900000_cdp_puntajes_plausibles.js` | ✅ 2026-09-06 | El ranking rechaza puntajes imposibles (topes por nivel). |
| `1791000000_cdp_permitir_cero.js` | ✅ 2026-09-06 | Los campos numéricos aceptan 0: la partida perfecta se rechazaba. |
| `1791100000_limpieza_pruebas_plausibles.js` | ✅ 2026-09-06 | Borra los puntajes de esas pruebas. |
| `1791200000_limpieza_por_jugador.js` | ✅ 2026-09-06 | Los que quedaron sin sala, marcados por apodo. |
| `1791300000_cdp_puntajes_de_duelo.js` | ✅ 2026-09-06 | El duelo publica al ranking; campo `modo` y regla por origen. |
| `1791400000_cdp_fecha_puntaje.js` | ✅ 2026-09-06 | Agrega `created`: la columna Fecha nunca mostró nada. |
| `1791500000_limpieza_pruebas_duelo.js` | ✅ 2026-09-06 | Borra los registros de esas pruebas. |

## Estado del servidor que hay que recrear a mano

El servidor de duelos escribe en PocketBase por la **red interna de Docker**.
Esa red se creó con `docker network create` y se conectó con
`docker network connect`, que es estado del runtime: **sobrevive a
`docker restart` pero NO a recrear un contenedor**. Si alguna vez se recrea
`cazador-duelo` o `pocketbase`, hay que volver a correr:

```
docker network create aulaplay
docker network connect aulaplay pocketbase
docker network connect aulaplay cazador-duelo
```

Sin eso, los duelos siguen funcionando pero dejan de publicar al ranking (queda
un error en el log del contenedor, no se rompe la partida).

La otra pieza es que **nginx vacía la cabecera `X-Origen-Duelo`** en las dos
ubicaciones de `/etc/nginx/sites-available/pocketbase`. Eso es lo que impide
que un cliente se haga pasar por el servidor de duelos. Si se rehace esa
configuración, hay que reponerlo.

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
