# Script para instalar cloudflared y backend como servicios de Windows
# Ejecutar como Administrador

param(
  [string]$TunnelToken = "",
  [string]$BackendPort = 3000,
  [int]$NodeExitWaitMs = 5000
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BackendDir = Join-Path $ProjectRoot "backend"
$ScriptsDir = Join-Path $ProjectRoot "scripts"
$NssmUrl = "https://nssm.cc/download/nssm-2.24-101-g897c7f7.zip"
$NssmDir = Join-Path $ProjectRoot "bin\nssm"
$CloudflaredPath = "C:\Program Files\Cloudflare\Cloudflare Tunnel\cloudflared.exe"

Write-Host "=== Instalador de Servicios J&R Back ===" -ForegroundColor Cyan

# Verificar permisos de administrador
$IsAdmin = [bool]([Security.Principal.WindowsIdentity]::GetCurrent().Groups | Where-Object { $_.Value -eq 'S-1-5-32-544' })
if (-not $IsAdmin) {
  Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
  exit 1
}

# 1. Instalar/verificar cloudflared
Write-Host "`n[1/3] Verificando cloudflared..." -ForegroundColor Yellow
if (-not (Test-Path $CloudflaredPath)) {
  Write-Host "cloudflared no encontrado. Descargando..." -ForegroundColor Yellow
  
  # Usar Windows Package Manager o descarga manual
  try {
    winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
    Write-Host "✓ cloudflared instalado" -ForegroundColor Green
  } catch {
    Write-Host "ERROR: No se pudo instalar cloudflared. Instálalo desde https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "✓ cloudflared encontrado en $CloudflaredPath" -ForegroundColor Green
}

# 2. Descargar NSSM si no existe
Write-Host "`n[2/3] Verificando NSSM (Service Manager)..." -ForegroundColor Yellow
if (-not (Test-Path $NssmDir)) {
  Write-Host "Descargando NSSM..." -ForegroundColor Yellow
  $TempZip = "$env:TEMP\nssm.zip"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  
  try {
    Invoke-WebRequest -Uri $NssmUrl -OutFile $TempZip -UseBasicParsing
    Expand-Archive -Path $TempZip -DestinationPath "$ProjectRoot\bin" -Force
    
    # Renombrar carpeta extraída
    $ExtractedDir = Get-ChildItem "$ProjectRoot\bin" -Directory | Where-Object { $_.Name -like "nssm*" } | Select-Object -First 1
    if ($ExtractedDir) {
      Rename-Item $ExtractedDir.FullName -NewName "nssm" -Force
    }
    
    Remove-Item $TempZip -Force
    Write-Host "✓ NSSM descargado" -ForegroundColor Green
  } catch {
    Write-Host "ERROR al descargar NSSM: $_" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "✓ NSSM encontrado" -ForegroundColor Green
}

$NssmExe = Join-Path $NssmDir "win64\nssm.exe"
if (-not (Test-Path $NssmExe)) {
  $NssmExe = Join-Path $NssmDir "nssm.exe"
}

if (-not (Test-Path $NssmExe)) {
  Write-Host "ERROR: nssm.exe no encontrado en $NssmDir" -ForegroundColor Red
  exit 1
}

# 3. Crear servicios
Write-Host "`n[3/3] Configurando servicios..." -ForegroundColor Yellow

# Función para instalar/actualizar servicio
function Set-ServiceConfig {
  param(
    [string]$ServiceName,
    [string]$DisplayName,
    [string]$AppPath,
    [string[]]$AppArgs,
    [string]$WorkingDir,
    [string]$Description
  )

  # Detener servicio si existe
  $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($Service) {
    Write-Host "Deteniendo servicio existente: $ServiceName..." -ForegroundColor Magenta
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  }

  # Instalar/actualizar
  $ArgString = ($AppArgs | ForEach-Object { "`"$_`"" }) -join ' '
  Write-Host "Configurando: $ServiceName..." -ForegroundColor Cyan
  
  & $NssmExe install $ServiceName $AppPath $ArgString | Out-Null
  & $NssmExe set $ServiceName AppDirectory $WorkingDir | Out-Null
  & $NssmExe set $ServiceName AppExit Default Restart | Out-Null
  & $NssmExe set $ServiceName AppRestartDelay 5000 | Out-Null
  & $NssmExe set $ServiceName Description $Description | Out-Null
  & $NssmExe set $ServiceName ObjectName "LocalSystem" | Out-Null
  & $NssmExe set $ServiceName Type service | Out-Null

  Write-Host "✓ Servicio configurado: $ServiceName" -ForegroundColor Green
}

# Instalar servicio de backend Node.js
Write-Host "`nConfigurando servicio Backend..." -ForegroundColor Magenta
$NodeExe = "node.exe"
$BackendAppJs = Join-Path $BackendDir "src\app.js"

Set-ServiceConfig -ServiceName "JyRBackend" `
  -DisplayName "J&R Backend (Node.js)" `
  -AppPath $NodeExe `
  -AppArgs @("--max-old-space-size=1024", $BackendAppJs) `
  -WorkingDir $BackendDir `
  -Description "Servicio backend J&R Accesorios - Express/PostgreSQL - Puerto $BackendPort"

# Instalar servicio de cloudflared
Write-Host "`nConfigurando servicio Cloudflare Tunnel..." -ForegroundColor Magenta

if ($TunnelToken) {
  Set-ServiceConfig -ServiceName "CloudfareTunnel" `
    -DisplayName "Cloudflare Tunnel (J&R)" `
    -AppPath $CloudflaredPath `
    -AppArgs @("tunnel", "run", "--token", $TunnelToken) `
    -WorkingDir $ProjectRoot `
    -Description "Túnel Cloudflare para acceso remoto - Token fijo"
  
  Write-Host "`nTúnel instalado en modo FIJO (token configurado)" -ForegroundColor Green
} else {
  # Crear script auxiliar para modo rápido
  $TunnelWrapperPs1 = Join-Path $ScriptsDir "tunnel-service-wrapper.ps1"
  
  $WrapperContent = @"
# Esperar a que el frontend esté listo (si aplica)
Write-Host "Inicializando Cloudflare Tunnel..."

`$Frontend = "http://localhost:5173"
`$MaxAttempts = 30
`$Delay = 2

for (`$i = 0; `$i -lt `$MaxAttempts; `$i++) {
  try {
    `$response = Invoke-WebRequest -Uri `$Frontend -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if (`$response.StatusCode -eq 200) {
      Write-Host "Frontend listo en `$Frontend"
      break
    }
  } catch {
    # Continue waiting
  }
  Start-Sleep -Seconds `$Delay
}

# Ejecutar cloudflared
& "$CloudflaredPath" tunnel --url `$Frontend --no-autoupdate
"@

  Set-ServiceConfig -ServiceName "CloudfareTunnel" `
    -DisplayName "Cloudflare Tunnel (J&R - Dinámico)" `
    -AppPath "powershell.exe" `
    -AppArgs @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $TunnelWrapperPs1) `
    -WorkingDir $ProjectRoot `
    -Description "Túnel Cloudflare para acceso remoto - URL dinámica"
  
  Write-Host "`nTúnel instalado en modo RÁPIDO (URL dinámica)" -ForegroundColor Green
  Write-Host "Script wrapper: $TunnelWrapperPs1" -ForegroundColor Cyan
}

# 4. Iniciar servicios
Write-Host "`n=== Iniciando Servicios ===" -ForegroundColor Cyan

Write-Host "Iniciando Backend..." -ForegroundColor Yellow
Start-Service -Name "JyRBackend" -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 2000

Write-Host "Iniciando Cloudflare Tunnel..." -ForegroundColor Yellow
Start-Service -Name "CloudfareTunnel" -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 2000

# Verificar estado
Write-Host "`n=== Estado de Servicios ===" -ForegroundColor Cyan
$Services = Get-Service "JyRBackend", "CloudfareTunnel" -ErrorAction SilentlyContinue
$Services | ForEach-Object {
  $Status = if ($_.Status -eq "Running") { "✓ EJECUTÁNDOSE" } else { "✗ DETENIDO" }
  Write-Host "$($_.DisplayName): $Status" -ForegroundColor $(if ($_.Status -eq "Running") { "Green" } else { "Red" })
}

Write-Host "`n=== Configuración Completada ===" -ForegroundColor Green
Write-Host "Los servicios se ejecutarán automáticamente al iniciar Windows" -ForegroundColor Yellow
Write-Host "y se reiniciarán automáticamente si fallan." -ForegroundColor Yellow

Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Verifica que los servicios estén corriendo" -ForegroundColor White
Write-Host "2. Accede a la aplicación desde http://localhost:3000" -ForegroundColor White
Write-Host "3. Para detener: Stop-Service JyRBackend, CloudfareTunnel" -ForegroundColor White
Write-Host "4. Para iniciar: Start-Service JyRBackend, CloudfareTunnel" -ForegroundColor White
