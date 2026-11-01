# Servidor (VPS): contenedores y red de Docker

Guía operativa de `aulaplay.duckdns.org`. Está escrita porque los contenedores se crearon a mano y
no quedó registro de cómo: una red mal armada pasó semanas sin que nadie lo notara (ver «Qué pasó»).

## Qué corre

| Contenedor | Qué es | Red de Docker | Puerto en el servidor |
|---|---|---|---|
| `pocketbase` | Base de datos: ranking, salas, errores, claves de docente | `aulaplay` (y `bridge`) | 8090 |
| `cazador-duelo` | Servidor Socket.io de los duelos | `aulaplay` | 3001 |

nginx va por delante y le habla a los dos por `localhost` (`/duel/` → 3001, el resto → 8090).

## La regla: los dos contenedores en la red `aulaplay`

El servidor de duelos le habla a PocketBase **por la red interna de Docker**, por el nombre
`http://pocketbase:8090`, sin pasar por nginx (`server/src/ranking.ts`). Ahí se publican los
resultados de los duelos en el ranking del aula, con una marca (`X-Origen-Duelo`) que nginx borra de
todo pedido público; por eso no puede ir por la dirección pública.

Los nombres de contenedor solo se resuelven **entre contenedores de la misma red definida por el
usuario**. Si están en redes distintas, el servidor de duelos no encuentra a PocketBase y los
resultados no se publican.

## Cómo saber si está bien

```bash
curl -s https://aulaplay.duckdns.org/duel/health
```

Tiene que decir `"pocketbase":"ok"`. `"inalcanzable"` significa que este problema volvió; el log del
servidor de duelos lo dice en voz alta (`docker logs cazador-duelo | grep INALCANZABLE`) y se
comprueba cada 5 minutos. Desde el VPS, además:

```bash
bash recrear-contenedores.sh estado
```

## Qué pasó (31-oct-2026)

`cazador-duelo` estaba en la red `aulaplay` y `pocketbase` en `bridge`. El servidor de duelos tomaba
el error de red como «el aula no existe» y no publicaba, sin ningún aviso. Los duelos se jugaban
bien; sus resultados no aparecían en el ranking del docente. Se arregló conectando PocketBase a la
red `aulaplay`. Desde entonces el servidor distingue «no pude preguntar» de «no existe» y lo avisa.

## Arreglo rápido si vuelve a pasar

```bash
docker network connect aulaplay pocketbase      # o: bash recrear-contenedores.sh red
```

Es reversible (`docker network disconnect aulaplay pocketbase`) y no reinicia nada. La conexión
sobrevive a reinicios del contenedor y del servidor (política `unless-stopped`), pero **se pierde si
el contenedor se recrea** (`docker rm` + `docker run`). Por eso, para recrearlo, usar siempre el
guion y no un `docker run` suelto:

```bash
bash recrear-contenedores.sh pocketbase --si    # copia de los datos + recrea en la red correcta
bash recrear-contenedores.sh duelo t6 --si      # recrea el servidor de duelos desde cazador-duelo:t6 (la última)
```

Estos dos cortan el servicio unos segundos: hacerlo con las aulas vacías. `pocketbase` conserva la
imagen actual (no actualiza PocketBase sin querer) y publica el puerto solo en `127.0.0.1`, para que
8090 no quede abierto al exterior aunque cambie el firewall.

## Desplegar el servidor de duelos

Ver `CLAUDE.md` (compilar, copiar los `.js` y reiniciar). Antes, mirar que no haya partidas:
`curl -s https://aulaplay.duckdns.org/duel/health` (`salas` y `sockets` en 0). Reiniciar corta los
duelos en curso. Guardar antes una copia de lo que corre:
`docker cp cazador-duelo:/app/dist /root/backups/dist-duelo-antes-$(date +%Y%m%d-%H%M%S)`.

**Después de verificar, guardar el estado como imagen nueva** (`docker commit cazador-duelo
cazador-duelo:t7`, con la etiqueta siguiente). `docker cp` cambia el contenedor pero no su imagen: si
no se hace, recrear el contenedor desde la imagen vieja (por ejemplo con
`recrear-contenedores.sh duelo <etiqueta>`) vuelve al código anterior. La última guardada es `t6`
(1-nov-2026: aviso de PocketBase inalcanzable y gracia de reconexión de 20 s).

Después de desplegar: `curl -s https://aulaplay.duckdns.org/duel/health` debe mostrar
`"pocketbase":"ok"` (puede tardar unos segundos en la primera comprobación).

## Verificación completa después de tocar la red o PocketBase

1. `curl -s https://aulaplay.duckdns.org/api/health` responde.
2. `curl -s https://aulaplay.duckdns.org/duel/health` dice `"pocketbase":"ok"`.
3. Puerto 8090 cerrado desde afuera: `curl -m 8 http://38.45.71.187:8090/api/health` no responde.
4. Prueba real: crear una sala de prueba (código `ZZ…`), jugar un duelo de más de 8 s entre dos
   navegadores unidos a esa sala y mirar «Ver ranking de la sala»: tienen que aparecer los dos
   jugadores con categoría «Duelo». Después, el docente elimina la sala (borra también sus puntajes).
