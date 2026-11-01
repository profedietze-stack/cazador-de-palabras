# Borra de PocketBase (produccion) los datos de prueba del juego "Cazador de Palabras".
#
#   1) Puntajes globales de prueba: jugador "Prueba" o que contenga "ZZTEST", creados desde -Desde.
#   2) Claves de docente HUERFANAS (sin ninguna sala): son las que quedan de las pruebas, porque la
#      app elimina la sala pero no la clave. Todas las claves se guardan con nombre "docente", asi que
#      no se pueden distinguir de una clave real por el nombre: por eso se muestran y se confirma.
#
# Uso (PowerShell):
#   .\borrar-datos-de-prueba.ps1 -SoloMostrar     # solo lista, NO borra nada
#   .\borrar-datos-de-prueba.ps1                  # lista, y borra lo que confirmes
#
# La contrasena del superusuario se pide en pantalla (no se muestra y no se guarda en ningun archivo).
# NUNCA la escribas dentro de este guion.
#
# Este archivo esta escrito solo con caracteres ASCII a proposito: PowerShell 5.1 lee mal los acentos
# de un .ps1 sin BOM.

param(
    [string]$Base = 'https://aulaplay.duckdns.org',
    [string]$Desde = '2026-10-31 00:00:00',
    [switch]$SoloMostrar
)

$ErrorActionPreference = 'Stop'

# --- 1. Iniciar sesion como superusuario ---------------------------------------------------------
$email = Read-Host 'Email del superusuario de PocketBase'
$seguro = Read-Host 'Contrasena (no se muestra)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
try { $clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

$cuerpo = @{ identity = $email; password = $clave } | ConvertTo-Json
$token = $null
# PocketBase 0.23+ usa _superusers; las versiones anteriores, admins.
foreach ($ruta in '/api/collections/_superusers/auth-with-password', '/api/admins/auth-with-password') {
    try {
        $r = Invoke-RestMethod -Method Post -Uri ($Base + $ruta) -ContentType 'application/json' -Body $cuerpo
        $token = $r.token
        break
    } catch { }
}
$clave = $null
$cuerpo = $null
if (-not $token) { throw 'No se pudo iniciar sesion: revisa el email y la contrasena.' }
$h = @{ Authorization = $token }
Write-Host 'Sesion iniciada.' -ForegroundColor Green

# --- Utilidades -----------------------------------------------------------------------------------
function Listar([string]$col, [string]$filtro) {
    $todos = @()
    $pag = 1
    do {
        $u = "$Base/api/collections/$col/records?perPage=200&page=$pag"
        if ($filtro) { $u += '&filter=' + [uri]::EscapeDataString($filtro) }
        $r = Invoke-RestMethod -Uri $u -Headers $h
        $todos += @($r.items)
        $pag++
    } while ($r.page -lt $r.totalPages)
    return , $todos
}

function Confirmar([string]$pregunta) {
    $r = Read-Host "$pregunta Escribi BORRAR para confirmar (otra cosa cancela)"
    return ($r -ceq 'BORRAR')
}

function Borrar([string]$col, $registros) {
    $n = 0
    foreach ($x in $registros) {
        Invoke-RestMethod -Method Delete -Uri "$Base/api/collections/$col/records/$($x.id)" -Headers $h | Out-Null
        $n++
    }
    Write-Host "Borrados de ${col}: $n" -ForegroundColor Green
}

# --- 2. Puntajes de prueba -------------------------------------------------------------------------
Write-Host ''
Write-Host '== Puntajes de prueba (cdp_scores) ==' -ForegroundColor Cyan
$filtroPuntajes = '(jugador = "Prueba" || jugador ~ "ZZTEST") && created >= "' + $Desde + '"'
try {
    $puntajes = Listar 'cdp_scores' $filtroPuntajes
} catch {
    Write-Host 'La coleccion no tiene fecha de creacion: se usa solo el nombre del jugador (ZZTEST).' -ForegroundColor Yellow
    $puntajes = Listar 'cdp_scores' 'jugador ~ "ZZTEST"'
}
Write-Host "Coinciden: $($puntajes.Count)"
if ($puntajes.Count -gt 0) {
    $puntajes | Select-Object id, jugador, pts, sala_code, created | Format-Table -AutoSize
}

# --- 3. Claves de docente huerfanas ---------------------------------------------------------------
Write-Host '== Claves de docente sin ninguna sala (host_keys) ==' -ForegroundColor Cyan
$claves = Listar 'host_keys' ''
$huerfanas = @()
foreach ($k in $claves) {
    $salas = Listar 'cdp_salas' ('owner_key_id = "' + $k.id + '"')
    if ($salas.Count -eq 0) { $huerfanas += $k }
}
Write-Host "Claves en total: $($claves.Count). Sin ninguna sala: $($huerfanas.Count)."
if ($huerfanas.Count -gt 0) {
    $huerfanas | Select-Object id, nombre, created | Format-Table -AutoSize
    Write-Host 'De las pruebas del 31-oct / 1-nov-2026 se esperan unas 5 (una con id bg4rzf1245fe5y2).' -ForegroundColor Yellow
    Write-Host 'Si tenes una clave de docente REAL que todavia no tiene sala, aparece aca: no la borres.' -ForegroundColor Yellow
}

if ($SoloMostrar) {
    Write-Host ''
    Write-Host 'Modo -SoloMostrar: no se borro nada.' -ForegroundColor Green
    return
}

# --- 4. Confirmar y borrar -------------------------------------------------------------------------
Write-Host ''
if ($puntajes.Count -gt 0 -and (Confirmar "Borrar los $($puntajes.Count) puntajes de arriba?")) {
    Borrar 'cdp_scores' $puntajes
} else {
    Write-Host 'Puntajes: no se borro nada.'
}
if ($huerfanas.Count -gt 0 -and (Confirmar "Borrar las $($huerfanas.Count) claves sin sala de arriba?")) {
    Borrar 'host_keys' $huerfanas
} else {
    Write-Host 'Claves: no se borro nada.'
}

# --- 5. Verificacion ---------------------------------------------------------------------------------
Write-Host ''
Write-Host '== Despues ==' -ForegroundColor Cyan
Write-Host ("Puntajes de prueba que quedan: " + (Listar 'cdp_scores' 'jugador ~ "ZZTEST"').Count)
Write-Host ("Claves en total que quedan: " + (Listar 'host_keys' '').Count)
