# Script para desinstalar servicios de Windows
# Ejecutar como Administrador

param(
  [switch]$Force = $false
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$NssmDir = Join-Path $ProjectRoot "bin\nssm"
$NssmExe = Join-Path $NssmDir "win64\nssm.exe"

if (-not (Test-Path $NssmExe)) {
  $NssmExe = Join-Path $NssmDir "nssm.exe"
}

Write-Host "=== Desinstalador de Servicios J&R Back ===" -ForegroundColor Yellow

# Verificar permisos de administrador
$IsAdmin = [bool]([Security.Principal.WindowsIdentity]::GetCurrent().Groups | Where-Object { $_.Value -eq 'S-1-5-32-544' })
if (-not $IsAdmin) {
  Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
  exit 1
}

if (-not $Force) {
  Write-Host "`n¡ADVERTENCIA! Esto desinstalará los servicios:" -ForegroundColor Red
  Write-Host "  - JyRBackend" -ForegroundColor Yellow
  Write-Host "  - CloudfareTunnel" -ForegroundColor Yellow
  $Confirm = Read-Host "`n¿Continuar? (S/n)"
  if ($Confirm -notmatch '^[Ss]') {
    Write-Host "Cancelado." -ForegroundColor Cyan
    exit 0
  }
}

# Detener y desinstalar servicios
@("JyRBackend", "CloudfareTunnel") | ForEach-Object {
  $ServiceName = $_
  $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  
  if ($Service) {
    Write-Host "`nDesinstalando $ServiceName..." -ForegroundColor Magenta
    
    # Detener servicio
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    
    # Desinstalar con nssm
    if (Test-Path $NssmExe) {
      & $NssmExe remove $ServiceName confirm | Out-Null
      Write-Host "✓ $ServiceName desinstalado" -ForegroundColor Green
    } else {
      # Fallback: usar sc.exe
      sc.exe delete $ServiceName | Out-Null
      Write-Host "✓ $ServiceName desinstalado (con sc.exe)" -ForegroundColor Green
    }
  } else {
    Write-Host "ℹ $ServiceName no encontrado" -ForegroundColor Cyan
  }
}

Write-Host "`n=== Desinstalación Completada ===" -ForegroundColor Green
Write-Host "Los servicios han sido removidos del sistema." -ForegroundColor Yellow
