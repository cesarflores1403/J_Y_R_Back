# Manual de Usuario - Modulo Inventario

## 1. Introduccion
Este manual explica como operar el modulo de Inventario en produccion:
- Existencias
- Kardex
- Entradas
- Salidas
- Bajas
- Transferencias
- Conteos
- Reservas

## 2. Requisitos de acceso
- Iniciar sesion con usuario autorizado.
- Roles permitidos:
  - Inventario general: Administrador o Bodeguero.
  - Reservas: Administrador, Bodeguero o Cajero.

## 3. Existencias
### Objetivo
Consultar stock real por producto y ubicacion.

### Flujo
1. Ir a `Inventario > Existencias`.
2. Aplicar filtros por producto, ubicacion o estado.
3. Revisar:
   - `Stock`
   - `Reservado`
   - `Disponible`
   - `Estado de stock`
4. Si corresponde, editar `stock_minimo` y `stock_maximo`.

## 4. Kardex
### Objetivo
Ver historial de movimientos persistidos.

### Flujo
1. Ir a `Inventario > Kardex`.
2. Filtrar por fecha, producto, ubicacion y tipo de movimiento.
3. Verificar tipo, cantidad, fecha, referencia y usuario.

## 5. Entradas
### Objetivo
Registrar ingreso de inventario.

### Flujo
1. Ir a `Inventario > Entradas`.
2. Completar producto, ubicacion, cantidad y referencia.
3. Guardar.
4. Confirmar resumen de stock actualizado.

Resultado:
- Incrementa stock.
- Genera movimiento en kardex.

## 6. Salidas
### Objetivo
Registrar egreso de inventario.

### Flujo
1. Ir a `Inventario > Salidas`.
2. Completar producto, ubicacion, cantidad y referencia.
3. Guardar.

Resultado:
- Descuenta stock disponible.
- Evita stock negativo.
- Genera movimiento en kardex.

## 7. Bajas
### Objetivo
Registrar perdida/dano con motivo.

### Flujo
1. Ir a `Inventario > Bajas`.
2. Completar producto, ubicacion, cantidad y motivo o descripcion.
3. Guardar.

Resultado:
- Descuenta stock.
- Registra baja y movimiento trazable.

## 8. Transferencias
### Objetivo
Mover stock entre ubicacion origen y destino.

### Flujo
1. Ir a `Inventario > Transferencias`.
2. Completar producto, origen, destino, cantidad y referencia.
3. Guardar.
4. Revisar historial persistente en la misma pantalla.

Resultado:
- Descuenta origen.
- Incrementa destino.
- Registra cabecera de transferencia.
- Genera doble movimiento (salida/entrada) en kardex.

## 9. Conteos
### Objetivo
Ajustar inventario con base en conteo fisico.

### Flujo completo
1. Abrir conteo.
2. Capturar detalle por producto y ubicacion con stock fisico.
3. Revisar diferencias persistidas.
4. Cerrar conteo.

Resultado al cerrar:
- Ajusta stock sistema al fisico.
- Genera movimientos de ajuste.
- Deja historial recuperable (cabecera y detalle).

## 10. Reservas
### Objetivo
Apartar stock sin descontarlo hasta su consumo.

### Flujo
1. Crear reserva con producto, ubicacion y cantidad.
2. Consultar historial persistente por estado/filtros.
3. Elegir:
   - Liberar: devuelve reservado a disponible.
   - Consumir: descuenta stock y reservado.

Resultado:
- Evita sobreasignacion.
- Mantiene seguimiento por estado (activa/liberada/consumida).

## 11. Mensajes y errores frecuentes
- `Stock insuficiente`: no hay disponible para la operacion.
- `Conflicto de concurrencia`: otro usuario actualizo al mismo tiempo; reintentar.
- `Inventario no encontrado`: validar producto/ubicacion.
- `No autorizado`: validar rol y sesion.

## 12. Buenas practicas operativas
1. Usar referencias unicas por operacion (documento, orden, ticket).
2. Evitar trabajar con sesiones abiertas en multiples pestañas para la misma operacion critica.
3. Revisar kardex despues de cierres de conteo y consumos de reserva.
4. Registrar observaciones en operaciones excepcionales.

