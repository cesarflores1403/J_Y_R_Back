# J&R Backend

API Node.js/Express 5 con PostgreSQL, Sequelize, JWT y bcryptjs.

## Instalacion

```powershell
npm install
```

## Variables de Entorno

Usa `backend/.env.example` como plantilla. No compartas `backend/.env`.

Variables clave:

- `DB_APP_USER` y `DB_APP_PASSWORD` para la API.
- `DB_MAINTENANCE_USER` y `DB_MAINTENANCE_PASSWORD` solo para backup/restore.
- `JWT_SECRET` obligatorio y de 32 caracteres o mas.
- `CORS_ALLOWED_ORIGINS` con orígenes exactos.
- `ALLOW_TUNNEL_ORIGINS=true` solo si realmente necesitas tuneles.

## Ejecucion

```powershell
npm run dev
```

El arranque solo verifica conexión y no altera el esquema.

## Pagos

Tabla canonica: `public.pago`.

Endpoint conservado:

```text
/api/pagos
```

Los cambios de pagos usan transacciones, bloqueo de factura y validación del catálogo de metodos de pago.

## SQL Versionado

- `scripts/sql/002-consolidar-pago.sql`
- `scripts/sql/least-privilege-app-role.sql`
- `scripts/sql/003-revocar-acceso-directo.sql`

No ejecutes scripts destructivos sin validar primero que `public.pagos` esté vacía.

## Backup

```powershell
npm run backup:system
```

Genera un backup custom solo para `schema public`, usa `pg_dump`, calcula SHA-256 y copia `uploads` si existen.

## Restore

```powershell
npm run restore:system -- "backups/<carpeta-backup>"
```

Antes de restaurar:

1. Detén el backend.
2. Verifica hash del backup.
3. Confirma que la ruta esté dentro de `backups/`.

## Pruebas

```powershell
npm test
npm run test:api
```

## Seguridad

- No hay secret JWT por defecto.
- No se ejecutan migraciones automáticas al iniciar.
- CORS no queda abierto indiscriminadamente.
- Los errores de base de datos se traducen a mensajes seguros.