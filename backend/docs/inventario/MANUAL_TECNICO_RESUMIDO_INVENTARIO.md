# Manual Tecnico Resumido - Modulo Inventario

## 1. Objetivo
Dejar Inventario consistente entre BD, backend y frontend para operacion empresarial real.

## 2. Migracion obligatoria
Archivo:
- `backend/scripts/inventario/20260314_inventario_preproduccion.sql`

Ejecucion sugerida (PostgreSQL):
```sql
\i backend/scripts/inventario/20260314_inventario_preproduccion.sql
```

## 3. Estructura de datos incorporada
### Tablas nuevas
- `reserva_inventario`
- `conteo_inventario`
- `conteo_inventario_detalle`
- `transferencia_inventario`

### Tabla actualizada
- `movimiento_inventario`
  - `cod_usuario`
  - `referencia_documento`
  - `observaciones`

### Integridad adicional en inventario
- `ck_inv_stock_reservado_le_stock`
- `ck_inv_min_le_max`

## 4. Endpoints de Inventario agregados/corregidos
### Transferencias
- `GET /api/inventario/transferencias`
- `POST /api/inventario/transferencias` (ahora persiste cabecera de transferencia)

### Conteos
- `GET /api/inventario/conteos`
- `GET /api/inventario/conteos/:id/detalles`
- `POST /api/inventario/conteos`
- `POST /api/inventario/conteos/:id/detalle`
- `POST /api/inventario/conteos/:id/cerrar`

### Reservas
- `GET /api/inventario/reservas`
- `POST /api/inventario/reservas`
- `POST /api/inventario/reservas/:id/liberar`
- `POST /api/inventario/reservas/:id/consumir`

## 5. Autorizacion aplicada
En rutas de Inventario:
- Operaciones generales: `Administrador`, `Bodeguero`.
- Reservas: `Administrador`, `Bodeguero`, `Cajero`.

## 6. Frontend alineado a persistencia real
Actualizado en:
- `frontend/src/components/inventario/InventarioTransferenciasPage.jsx`
- `frontend/src/components/inventario/InventarioConteosPage.jsx`
- `frontend/src/components/inventario/InventarioReservasPage.jsx`

APIs actualizadas:
- `inventarioTransferencias.api.js`
- `inventarioConteos.api.js`
- `inventarioReservas.api.js`

## 7. Verificacion minima recomendada
1. Levantar backend.
2. Ejecutar frontend y validar:
   - Crear reserva y verla en listado persistente.
   - Abrir conteo, registrar detalle, cerrar y recuperar detalle.
   - Registrar transferencia y verla en historial persistente.
3. Validar kardex con referencias y usuario.

