# J Y R Backend

Backend API desarrollado con Node.js, Express y PostgreSQL.

## Estructura del Proyecto

```
src/
├── config/          # Configuración de la base de datos y variables
├── controllers/     # Controladores de la lógica de negocio
├── middleware/      # Middleware personalizado
├── models/          # Modelos de datos
├── routes/          # Rutas de la API
├── services/        # Servicios/lógica de negocio
├── utils/           # Funciones utilitarias
├── validators/      # Validadores de datos
└── server.js        # Punto de entrada
tests/               # Tests unitarios e integración
public/              # Archivos públicos (imágenes, etc)
```

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Crear archivo `.env` basado en `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configurar variables de entorno en `.env`

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm start
```

## Testing

```bash
npm test
```
