# Instalacion local en la maquina virtual

Esta instalacion usa PostgreSQL y almacenamiento de archivos en la misma maquina virtual. No requiere Supabase ni almacenamiento en la nube.

## 1. Requisitos

- Windows Server o Windows 10/11 en la maquina virtual.
- PostgreSQL 17 o superior.
- Node.js 20 o superior.
- Git.

## 2. Crear la base local

Abre PowerShell y ejecuta los comandos con las herramientas de PostgreSQL disponibles en `PATH`:

```powershell
psql -U postgres -c "CREATE USER jyr_app WITH PASSWORD 'COLOCA_UNA_CLAVE_SEGURA';"
createdb -U postgres -O jyr_app jyr
psql -U jyr_app -d jyr -f database/jyr_database_schema.sql
```

La base queda almacenada en el disco de la maquina virtual por el servicio local de PostgreSQL.

## 3. Configurar el backend

```powershell
Copy-Item backend/.env.example backend/.env
```

Edita `backend/.env` y cambia como minimo:

- `DB_PASSWORD`: la clave elegida para `jyr_app`.
- `INITIAL_ADMIN_USERNAME` y `INITIAL_ADMIN_PASSWORD`: primer acceso al sistema.
- `JWT_SECRET`: texto largo, aleatorio y privado.
- `CORS_ORIGIN`: direccion desde la cual se abrira el frontend.

Mantener estos valores garantiza que no se use una base externa:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=jyr
DB_USER=jyr_app
DB_SSL=false
```

## 4. Preparar el acceso inicial

```powershell
npm install
npm run install:all
npm run db:restore-preserved --prefix backend
npm run db:seed --prefix backend
```

El primer comando restaura exclusivamente los cinco usuarios conservados, sus
roles, la configuracion de J&R y las entradas del carrusel. Las contrasenas se
guardan como hashes bcrypt; no hay contrasenas visibles en el archivo SQL.
El restaurador usa directamente la conexion del backend y no depende de que
`psql` este agregado al PATH. Tambien comprueba los conteos al finalizar y se
detiene sin sobrescribir si detecta facturas, clientes o productos existentes.

El segundo comando completa los catalogos tecnicos requeridos. Si no se carga
el archivo preservado, crea la cuenta Super Administrador indicada en
`backend/.env`.

## 5. Compilar y ejecutar

```powershell
npm run build:frontend
npm run start:backend
```

Los archivos que se carguen desde el sistema se guardaran en `backend/uploads`. Los respaldos se guardaran en `backend/backups`. Ambas carpetas son locales y su contenido no se sube a Git.

## Limpieza para una entrega nueva

El siguiente comando elimina todos los datos operativos de la base configurada y conserva solo los catalogos tecnicos y un Super Administrador:

```powershell
npm run db:clean --prefix backend
```

Por seguridad, el comando se niega a trabajar si `DB_HOST` no es `127.0.0.1`, `localhost` o `::1`.
