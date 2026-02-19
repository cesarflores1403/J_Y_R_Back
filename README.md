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
# Iniciar ambos (backend + frontend)
npm run dev

# Solo backend (puerto 5000)
npm run start:backend

# Solo frontend (puerto 5173)
npm run start:frontend
```

## Build

```bash
npm run build:frontend
```

## Tests

```bash
npm test
```
