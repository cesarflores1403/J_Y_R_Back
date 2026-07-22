# J&R Monorepo

Monorepo con backend Node.js/Express/PostgreSQL y frontend React/Vite.

## Instalación

```powershell
npm install
npm run install:all
```

## Configuración Segura

1. Copia `backend/.env.example` a `backend/.env`.
2. Completa `DB_APP_USER` y `DB_APP_PASSWORD` con el usuario de aplicación `jyr_app`.
3. Usa `DB_MAINTENANCE_USER` y `DB_MAINTENANCE_PASSWORD` solo para backups, restauraciones y tareas administrativas.
4. Define `JWT_SECRET` con al menos 32 caracteres.
5. Configura `CORS_ALLOWED_ORIGINS` con orígenes exactos. Los túneles solo se permiten si `ALLOW_TUNNEL_ORIGINS=true`.

## Backend

```powershell
npm run dev:backend
```

La API no modifica el esquema al iniciar. Solo comprueba conexión y arranca.

## Tabla Canonica de Pagos

El backend usa únicamente `public.pago`.

El endpoint HTTP se conserva en plural:

```text
/api/pagos
```

### Endpoints

- `GET /api/pagos/factura/:codFactura`
- `POST /api/pagos`
- `PATCH /api/pagos/:codPago/anular`

## Migracion de Pagos

Antes de consolidar pagos, revisa el script:

```text
backend/scripts/sql/002-consolidar-pago.sql
```

Ejecuta solo después de validar que `public.pagos` está vacía.

## Rol jyr_app y Privilegios Minimos

Revisa y ejecuta manualmente:

- `backend/scripts/sql/least-privilege-app-role.sql`
- `backend/scripts/sql/003-revocar-acceso-directo.sql`

El script de revocación solo debe correr cuando el frontend React ya use exclusivamente la API Node/Express.

## Pruebas

```powershell
npm test
npm run test:api
```

## Backup

```powershell
npm run backup:system --prefix backend
```

Genera un respaldo custom de PostgreSQL para `schema public`, copia `uploads` cuando existe y escribe `metadata.json` con hash SHA-256.

## Restore

```powershell
npm run restore:system --prefix backend -- "backups/<carpeta-backup>"
```

Antes de restaurar:

1. Detén el backend.
2. Valida el hash del respaldo.
3. Verifica que la ruta esté dentro de `backups/`.

## Archivos Que Nunca Deben Compartirse

- `backend/.env`
- `backend/backups/`
- `backend/uploads/`
- `*.log`
- tokens JWT
- contraseñas o credenciales de base de datos

## Advertencia de Arranque

La API no ejecuta `ALTER TABLE`, `CREATE TABLE`, `DROP TABLE`, `sync({ alter: true })` ni `sync({ force: true })` al iniciar. Los cambios de esquema quedan en `backend/scripts/sql/`.