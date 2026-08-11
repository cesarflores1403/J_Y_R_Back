# J&R - Monorepo

Proyecto completo con Backend y Frontend.

Para instalar el sistema con PostgreSQL y archivos locales en una maquina virtual, consulta [INSTALACION_SERVIDOR.md](INSTALACION_SERVIDOR.md).

## Estructura

```
├── backend/    → API REST (Node.js + Express)
├── frontend/   → Aplicación web (React + Vite)
└── package.json → Scripts globales
```

## Instalación

```bash
# Instalar dependencias globales
npm install

# Instalar dependencias de backend y frontend
npm run install:all
```

## Desarrollo

```bash
# Iniciar backend + frontend + URL publica automatica
npm run dev

# Equivalente explicito (mismo comportamiento)
npm run dev:public

# Iniciar backend + frontend compilado + URL publica mas rapida
npm run dev:public:fast

# Solo backend (puerto 5000)
npm run start:backend

# Solo frontend (puerto 5173)
npm run start:frontend
```

## URL Publica Fija (Cloudflare)

El script `npm run dev` ya levanta el tunel automaticamente.

Para una URL publica con mejor rendimiento, usa `npm run dev:public:fast`.

- Si no configuras token, usa modo rapido (`trycloudflare`) y la URL cambia en cada arranque.
- Si configuras token, usa modo fijo y mantiene tu URL estable.

Pasos para URL fija:

```bash
# 1) Copiar plantilla
copy .env.tunnel.example .env.tunnel

# 2) Editar .env.tunnel y completar:
# - TUNNEL_TOKEN
# - TUNNEL_PUBLIC_URL

# 3) Arrancar todo
npm run dev
```

La URL publica activa se guarda en `public-url.txt`.

## 🔌 Servicios de Windows (Producción)

**¿Quieres que la URL pública siga funcionando cuando la máquina duerma?**

Usa servicios de Windows para que Backend y Cloudflare Tunnel se ejecuten automáticamente:

```powershell
# 1) Abre PowerShell como Administrador (requerido)

# 2) Ejecuta el instalador:
cd scripts
.\install-services.ps1

# 3) Verifica el estado:
.\diagnose-services.ps1
```

**Beneficios:**
- ✅ La URL pública sigue funcionando cuando la máquina duerme
- ✅ Se inicia automáticamente al encender Windows
- ✅ Se reinicia automáticamente si falla
- ✅ No requiere sesión iniciada

Para más detalles: Ver [scripts/README.md](scripts/README.md)

## Build

```bash
npm run build:frontend
```

## Tests

```bash
npm test
```
