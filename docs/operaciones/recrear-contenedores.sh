#!/usr/bin/env bash
# Operaciones sobre los contenedores del juego en el VPS (aulaplay.duckdns.org).
#
# Por qué existe: los dos contenedores se crearon a mano con `docker run` y no había ningún
# registro de cómo. El 31-oct-2026 se descubrió que el de duelos (red `aulaplay`) y PocketBase
# (red `bridge` por defecto) no se veían: el nombre `pocketbase` no se resolvía y los resultados
# de los duelos nunca llegaban al ranking del docente. Este guion es EL lugar donde está escrito
# cómo se crea cada uno, siempre en la misma red.
#
# Se copia al VPS y se corre allá:
#   scp -i <clave> docs/operaciones/recrear-contenedores.sh root@aulaplay.duckdns.org:/root/
#   ssh -i <clave> root@aulaplay.duckdns.org 'bash /root/recrear-contenedores.sh estado'
#
# Subcomandos:
#   estado              solo lectura: redes de cada contenedor y si el de duelos alcanza a PocketBase
#   red                 arreglo rápido e idempotente: crea la red si falta y conecta PocketBase a ella
#   pocketbase --si     RECREA PocketBase (para actualizar la imagen o cambiar opciones)
#   duelo <etiqueta> --si   RECREA el servidor de duelos desde la imagen cazador-duelo:<etiqueta>
#
# Los subcomandos que recrean piden `--si` y cortan el servicio unos segundos: PocketBase corta el
# ranking y las salas; el de duelos corta los duelos en curso. Hacerlo con las aulas vacías.
#
# No se probó recreando en producción: `estado` y `red` son equivalentes a comandos ya corridos y
# verificados el 31-oct-2026; `pocketbase` y `duelo` están sin ejecutar.

set -euo pipefail

RED=aulaplay
PB=pocketbase
DUELO=cazador-duelo
DATOS_PB=/opt/pocketbase
COPIAS=/root/backups

confirmar() { [[ "${*: -1}" == "--si" ]] || { echo "Falta --si: este subcomando recrea un contenedor y corta el servicio unos segundos."; exit 1; }; }

asegurar_red() {
  if ! docker network inspect "$RED" >/dev/null 2>&1; then
    echo "Creando la red $RED"
    docker network create "$RED" >/dev/null
  fi
}

conectar_pb() {
  if docker inspect "$PB" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw "$RED"; then
    echo "$PB ya esta en la red $RED"
  else
    docker network connect "$RED" "$PB"
    echo "$PB conectado a la red $RED"
  fi
}

# ¿El contenedor de duelos alcanza a PocketBase por su nombre, como lo hace el servidor?
alcanza() {
  docker exec "$DUELO" node -e "
    fetch((process.env.POCKETBASE_URL || 'http://pocketbase:8090') + '/api/health', { signal: AbortSignal.timeout(5000) })
      .then(r => { console.log('PocketBase desde duelos: HTTP', r.status); process.exit(r.ok ? 0 : 1) })
      .catch(e => { console.log('PocketBase desde duelos: NO SE ALCANZA (' + ((e.cause && e.cause.code) || e.name) + ')'); process.exit(1) })"
}

esperar_salud() {
  local url=$1 i
  for i in $(seq 1 30); do
    if curl -fsS -m 3 "$url" >/dev/null 2>&1; then echo "responde: $url"; return 0; fi
    sleep 1
  done
  echo "NO responde tras 30 s: $url"; return 1
}

cmd=${1:-ayuda}
case "$cmd" in
  estado)
    for c in "$PB" "$DUELO"; do
      echo "== $c"
      docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}  red={{$k}} ip={{$v.IPAddress}}{{println}}{{end}}'
    done
    alcanza || echo "-> Corregir con: bash $0 red"
    echo "== /duel/health (campo pocketbase debe decir ok):"
    curl -s -m 10 http://127.0.0.1:3001/health || true
    echo
    ;;

  red)
    asegurar_red
    conectar_pb
    alcanza
    ;;

  pocketbase)
    confirmar "$@"
    asegurar_red
    # Misma imagen que la actual (por su ID): recrear no debe actualizar PocketBase sin querer.
    IMAGEN=$(docker inspect "$PB" --format '{{.Image}}' 2>/dev/null || true)
    : "${IMAGEN:=${IMAGEN_PB:-}}"
    [[ -n "$IMAGEN" ]] || { echo "No existe el contenedor $PB: pasar la imagen en IMAGEN_PB=<id o nombre>"; exit 1; }
    echo "Imagen: $IMAGEN"
    docker stop "$PB" >/dev/null 2>&1 || true
    mkdir -p "$COPIAS"
    COPIA="$COPIAS/pocketbase-antes-de-recrear-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$COPIA" -C "$DATOS_PB" . && echo "Copia de los datos: $COPIA ($(du -h "$COPIA" | cut -f1))"
    docker rm "$PB" >/dev/null 2>&1 || true
    # 127.0.0.1: nginx le habla por localhost y el de duelos por la red; asi 8090 no queda abierto
    # al exterior aunque cambie el firewall (Docker se salta iptables con los puertos publicados).
    docker run -d --name "$PB" --restart unless-stopped --network "$RED" \
      -p 127.0.0.1:8090:8090 \
      -v "$DATOS_PB:/pb_data" -v "$DATOS_PB/pb_hooks:/pb_hooks" -v "$DATOS_PB/pb_migrations:/pb_migrations" \
      "$IMAGEN" >/dev/null
    esperar_salud http://127.0.0.1:8090/api/health
    esperar_salud https://aulaplay.duckdns.org/api/health
    alcanza || echo "ATENCION: el servidor de duelos todavia no alcanza a PocketBase; probar de nuevo en unos segundos"
    ;;

  duelo)
    ETIQUETA=${2:-}
    [[ -n "$ETIQUETA" && "$ETIQUETA" != "--si" ]] || { echo "Uso: $0 duelo <etiqueta de la imagen> --si"; exit 1; }
    confirmar "$@"
    docker image inspect "$DUELO:$ETIQUETA" >/dev/null || { echo "No existe la imagen $DUELO:$ETIQUETA"; exit 1; }
    asegurar_red
    docker stop "$DUELO" >/dev/null 2>&1 || true
    docker rm "$DUELO" >/dev/null 2>&1 || true
    docker run -d --name "$DUELO" --restart unless-stopped --network "$RED" \
      -p 127.0.0.1:3001:3001 "$DUELO:$ETIQUETA" >/dev/null
    esperar_salud http://127.0.0.1:3001/health
    sleep 3
    alcanza || echo "ATENCION: este contenedor no alcanza a PocketBase: bash $0 red"
    ;;

  *)
    sed -n '2,24p' "$0"
    ;;
esac
