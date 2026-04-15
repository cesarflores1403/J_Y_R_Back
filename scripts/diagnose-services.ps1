# Script para diagnosticar y verificar estado de servicios
# Ejecutar como usuario normal (sí se necesita admin para algunas operaciones)

Write-Host "=== Diagnóstico de Servicios J&R Back ===" -ForegroundColor Cyan

# Verificar servicios
Write-Host "`n[1] Estado actual de servicios:" -ForegroundColor Yellow
$Services = @("JyRBackend", "CloudfareTunnel")
$Services | ForEach-Object {
  $Service = Get-Service -Name $_ -ErrorAction SilentlyContinue
  if ($Service) {
    $Status = $Service.Status
    $StatusColor = if ($Status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  $($_): $Status" -ForegroundColor $StatusColor
  } else {
    Write-Host "  $($_): NO INSTALADO" -ForegroundColor Gray
  }
}

# Verificar puertos
Write-Host "`n[2] Verificando puertos:" -ForegroundColor Yellow

$TCPConnections = Get-NetTCPConnection -LocalAddress 127.0.0.1 -ErrorAction SilentlyContinue
@(3000, 5173, 443) | ForEach-Object {
  $Port = $_
  $Connection = $TCPConnections | Where-Object { $_.LocalPort -eq $Port }
  if ($Connection) {
    $Process = Get-Process -Id $Connection.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "  Puerto $Port: ✓ EN USO (Proceso: $($Process.Name))" -ForegroundColor Green
  } else {
    Write-Host "  Puerto $Port: ✗ Libre/No accesible" -ForegroundColor Yellow
  }
}

# Probar conectividad
Write-Host "`n[3] Pruebas de conectividad:" -ForegroundColor Yellow

$Tests = @(
  @{ Name = "Backend (localhost:3000)"; URL = "http://localhost:3000"; Port = 3000 },
  @{ Name = "Frontend (localhost:5173)"; URL = "http://localhost:5173"; Port = 5173 }
)

$Tests | ForEach-Object {
  try {
    $Response = Invoke-WebRequest -Uri $_.URL -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($Response.StatusCode -eq 200) {
      Write-Host "  $($_.Name): ✓ ACCESIBLE" -ForegroundColor Green
    } else {
      Write-Host "  $($_.Name): ⚠ Respuesta inusual ($($Response.StatusCode))" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  $($_.Name): ✗ NO ACCESIBLE" -ForegroundColor Red
  }
}

# Verificar archivos clave
Write-Host "`n[4] Archivos clave:" -ForegroundColor Yellow

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
@(
  @{ Path = "$ProjectRoot\backend\src\app.js"; Name = "Backend app.js" },
  @{ Path = "$ProjectRoot\public-url.txt"; Name = "Public URL file" },
  @{ Path = "$ProjectRoot\.env.tunnel"; Name = "Tunnel config" }
) | ForEach-Object {
  $Exists = Test-Path $_.Path
  $Icon = if ($Exists) { "✓" } else { "✗" }
  $Color = if ($Exists) { "Green" } else { "Yellow" }
  Write-Host "  $($_.Name): $Icon ($($_.Path))" -ForegroundColor $Color
}

# Leer URL pública si existe
Write-Host "`n[5] URL Pública:" -ForegroundColor Yellow
$UrlFile = "$ProjectRoot\public-url.txt"
if (Test-Path $UrlFile) {
  $Url = Get-Content $UrlFile -Raw -ErrorAction SilentlyContinue | ForEach-Object { $_.Trim() }
  if ($Url) {
    Write-Host "  $Url" -ForegroundColor Green
  } else {
    Write-Host "  (Archivo vacío - el túnel aún no se ha conectado)" -ForegroundColor Yellow
  }
} else {
  Write-Host "  (No disponible - inicia el túnel)" -ForegroundColor Yellow
}

# Últimas líneas del log (si está disponible)
Write-Host "`n[6] Logs recientes:" -ForegroundColor Yellow
Write-Host "  Para ver logs en tiempo real, usa:" -ForegroundColor Cyan
Write-Host "    Get-Service JyRBackend | Select-Object -ExpandProperty Name | ForEach-Object { Get-EventLog -LogName Application -Source $_ -Newest 5 }" -ForegroundColor White

Write-Host "`n=== Fin del Diagnóstico ===" -ForegroundColor Cyan

# Comandos útiles
Write-Host "`nComandos útiles:" -ForegroundColor Yellow
Write-Host "  Iniciar servicios:  Start-Service JyRBackend, CloudfareTunnel" -ForegroundColor Magenta
Write-Host "  Detener servicios: Stop-Service JyRBackend, CloudfareTunnel" -ForegroundColor Magenta
Write-Host "  Reiniciar:         Restart-Service JyRBackend, CloudfareTunnel" -ForegroundColor Magenta
Write-Host "  Estado detallado:  Get-Service JyRBackend, CloudfareTunnel | Format-Table -AutoSize" -ForegroundColor Magenta
