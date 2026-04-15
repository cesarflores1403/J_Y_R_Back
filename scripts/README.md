# Scripts de Gestión - J&R Back

Esta carpeta contiene scripts para configurar, monitorear y mantener los servicios de la aplicación J&R.

## 📋 Scripts Disponibles

### 1. `install-services.ps1` ⭐ **PRINCIPAL**
**Instala Backend y Cloudflare Tunnel como servicios de Windows**

Configura la aplicación para que:
- ✅ Se inicie automáticamente al encender la máquina
- ✅ Se reinicie automáticamente si falla
- ✅ **Continue funcionando cuando la máquina entra en suspensión**
- ✅ No dependa de que tengas sesión abierta

#### Pre-requisitos:
1. **Windows 10/11** (requerido para servicios)
2. **PowerShell como Administrador** (imprescindible)
3. **Node.js instalado** (verificar: `node --version`)
4. **Cloudflared instalado** o acceso a internet para descargarlo

#### Uso:

**Opción A: Modo RÁPIDO (URL dinámica - se cambia cada 24h)**
```powershell
# Abre PowerShell como Administrador y ejecuta:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
cd C:\Users\CESAR FLORES\Documents\GitHub\J_Y_R_Back\scripts
.\install-services.ps1
```

**Opción B: Modo FIJO (token permanente)**
```powershell
# Si tienes un token de Cloudflare Tunnel:
$token = "eyJhIjoiYWFhYWFhYWE..." # Tu token aquí
.\install-services.ps1 -TunnelToken $token
```

#### Lo que hace:
1. Verifica/instala cloudflared
2. Descarga NSSM (Non-Sucking Service Manager) si no existe
3. Configura servicio `JyRBackend` (Node.js backend)
4. Configura servicio `CloudfareTunnel` (Cloudflare Tunnel)
5. Inicia automáticamente ambos servicios

#### Después de instalar:

```powershell
# Ver estado
Get-Service JyRBackend, CloudfareTunnel

# Detener servicios
Stop-Service JyRBackend, CloudfareTunnel

# Iniciar servicios
Start-Service JyRBackend, CloudfareTunnel

# Ver logs (últimos 50 eventos)
Get-EventLog -LogName System -Source "NSSM" -Newest 50
```

---

### 2. `uninstall-services.ps1`
**Desinstala los servicios de Windows**

#### Uso:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
.\uninstall-services.ps1
```

O sin confirmación:
```powershell
.\uninstall-services.ps1 -Force
```

---

### 3. `diagnose-services.ps1`
**Verifica el estado de todo y diagnostica problemas**

#### Uso:
```powershell
.\diagnose-services.ps1
```

#### Qué revisa:
- ✓ Estado de servicios (ejecutándose/parados)
- ✓ Puertos en uso (3000, 5173, 443)
- ✓ Conectividad a endpoints
- ✓ Archivos clave
- ✓ URL pública actual (si está disponible)

---

### 4. `start-tunnel.cjs`
**Script Node.js legacy para iniciar el túnel manualmente**

Útil para desarrollo sin servicios. Ahora con auto-reinicio en caso de desconexión.

#### Uso:
```bash
node start-tunnel.cjs

# O con puerto custom:
node start-tunnel.cjs --port 5173
```

---

## 🚀 Flujo Recomendado

### Primera instalación:
```bash
# 1. Abre PowerShell como Administrador
# 2. Ejecuta install-services.ps1
.\install-services.ps1

# 3. Verifica que todo esté corriendo
.\diagnose-services.ps1

# 4. Accede a tu app
# - Localmente: http://localhost:3000
# - Remotamente: revisa la URL en el archivo public-url.txt
```

### Problemas comunes:

#### "No se puede ejecutar el script"
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
```

#### "Acceso denegado"
Asegúrate de ejecutar PowerShell como Administrador (clic derecho → Ejecutar como administrador)

#### "El servicio no inicia"
```powershell
# Revisa logs:
Get-EventLog -LogName System -Source "NSSM" -Newest 20

# O ejecuta diagnóstico:
.\diagnose-services.ps1
```

#### "¿Por qué sigue conectado cuando la máquina duerme?"
Los servicios de Windows **siguen ejecutándose** incluso cuando:
- ✓ La máquina está en suspensión profunda (si está enchufada)
- ✓ No tienes sesión iniciada
- ✓ Cambias de usuario

Cuando despiertas, los servicios retoman automáticamente. La URL permanece activa en Cloudflare.

---

## 📝 Archivos de Configuración

### `.env.tunnel`
Configuración opcional del túnel. Si no existe, el script creará valores por defecto.

```
# Modo FIJO (requiere token de Cloudflare)
TUNNEL_TOKEN=eyJhIjoiYWFhYWFhYWE...
TUNNEL_PUBLIC_URL=https://tu-dominio.trycloudflare.com

# Modo RÁPIDO (genera URL temporal cada 24h)
# Dejar vacío
```

### `public-url.txt`
Archivo auto-generado con la URL pública actual.

---

## 🔐 Seguridad

- Los servicios corren con permisos `LocalSystem` (usuario del sistema)
- Las credenciales se almacenan en el Service Manager de Windows
- Los logs se escriben en Windows Event Log
- El token de Cloudflare está seguro en `.env.tunnel` (no se sube a Git)

---

## 📊 Monitoreo

Para monitoreo avanzado, usa el Visor de Eventos de Windows:

```
Visor de Eventos → Registros de Windows → Sistema → Buscar "NSSM"
```

O desde PowerShell:
```powershell
Get-EventLog -LogName System -Source "NSSM" -Newest 100 | 
  Select-Object -Property TimeGenerated, Message | 
  Format-Table -AutoSize
```

---

## ✅ Checklist Final

Después de instalar servicios:

- [ ] Servicios aparecen en `Get-Service JyRBackend`, `CloudfareTunnel`
- [ ] Puertos 3000/5173 están en uso
- [ ] `public-url.txt` contiene una URL válida
- [ ] Accedes a http://localhost:3000 correctamente
- [ ] Accedes a la URL remota sin problemas
- [ ] Reinicia la máquina y verifica que los servicios inician solos

¡Listo! Tu aplicación ya está configurada para funcionar siempre. 🎉
