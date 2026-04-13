# J&R - Monorepo

Proyecto completo con Backend y Frontend.

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

# Solo backend (puerto 5000)
npm run start:backend

# Solo frontend (puerto 5173)
npm run start:frontend
```

## URL Publica Fija (Cloudflare)

El script `npm run dev` ya levanta el tunel automaticamente.

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

## Build

```bash
npm run build:frontend
```

## Tests

```bash
npm test
```
