// // SQL base para buscar inventario por producto + ubicacion con lock pesimista
export const obtenerSelectInventarioPorProductoUbicacion = ({ usarStockReservado = true } = {}) => `
  SELECT
    i.cod_inventario,
    i.cod_producto,
    i.cod_ubicacion,
    i.stock,
    ${usarStockReservado ? 'COALESCE(i.stock_reservado, 0)' : '0'} AS stock_reservado,
    i.stock_minimo,
    i.stock_maximo,
    i.fecha_ult_mov
  FROM inventario i
  WHERE i.cod_producto = :codProducto
    AND i.cod_ubicacion = :codUbicacion
  LIMIT 1
  FOR UPDATE
`;

// // SQL de descuento seguro de stock con guardia de sobreventa en la misma sentencia
export const obtenerUpdateSalidaSeguro = ({ usarStockReservado = true } = {}) => `
  UPDATE inventario
  SET stock = stock - :cantidad,
      fecha_ult_mov = NOW()
  WHERE cod_inventario = :codInventario
    AND ${
      usarStockReservado
        ? '(stock - COALESCE(stock_reservado, 0)) >= :cantidad'
        : 'stock >= :cantidad'
    }
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
`;

// // Construye INSERT dinamico para movimiento_inventario segun schema real de la tabla
export const construirInsertMovimientoSalidaSql = ({
  schemaMovimiento,
  codInventario,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  referencia,
  observaciones
}) => {
  // // Lista de columnas a insertar que depende del schema detectado en runtime
  const columnas = [];
  // // Lista de expresiones SQL de values parametrizados para prevenir inyeccion
  const valoresSql = [];
  // // Replacements asociados a los parametros del INSERT
  const replacements = {};

  // // FK a inventario si existe columna compatible en movimiento_inventario
  if (schemaMovimiento.codInventario) {
    columnas.push(schemaMovimiento.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }

  // // FK directa a producto si la columna existe en la tabla de movimientos
  if (schemaMovimiento.codProducto) {
    columnas.push(schemaMovimiento.codProducto);
    valoresSql.push(':codProducto');
    replacements.codProducto = codProducto;
  }

  // // FK directa a ubicacion si la columna existe en la tabla de movimientos
  if (schemaMovimiento.codUbicacion) {
    columnas.push(schemaMovimiento.codUbicacion);
    valoresSql.push(':codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  // // Usuario autenticado de auditoria si existe columna y viene en la solicitud
  if (schemaMovimiento.codUsuario && codUsuario) {
    columnas.push(schemaMovimiento.codUsuario);
    valoresSql.push(':codUsuario');
    replacements.codUsuario = codUsuario;
  }

  // // Tipo obligatorio del kardex para esta HU: SALIDA
  columnas.push(schemaMovimiento.tipo);
  valoresSql.push(':tipoMovimiento');
  replacements.tipoMovimiento = 'SALIDA';

  // // Cantidad descontada del inventario
  columnas.push(schemaMovimiento.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  // // Fecha del movimiento controlada por servidor
  columnas.push(schemaMovimiento.fecha);
  valoresSql.push('NOW()');

  // // Referencia de factura/documento si la columna existe
  if (schemaMovimiento.referencia) {
    columnas.push(schemaMovimiento.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia;
  }

  // // Observaciones opcionales si la columna existe
  if (schemaMovimiento.observaciones) {
    columnas.push(schemaMovimiento.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }

  return {
    sql: `
      INSERT INTO ${schemaMovimiento.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};

// // Construye SQL de relectura del movimiento para responder kardex con aliases estables
export const construirSelectMovimientoFormateadoSql = ({ schemaMovimiento }) => {
  // // Si no existe PK no se puede reconsultar unicamente una fila, se retorna null para fallback
  if (!schemaMovimiento.pk) return null;

  // // Expresiones de producto/ubicacion desde movimiento o via inventario segun schema real
  const exprCodProducto = schemaMovimiento.codProducto
    ? `m.${schemaMovimiento.codProducto}`
    : 'i.cod_producto';
  const exprCodUbicacion = schemaMovimiento.codUbicacion
    ? `m.${schemaMovimiento.codUbicacion}`
    : 'i.cod_ubicacion';
  const joinInventario = schemaMovimiento.codInventario
    ? `LEFT JOIN inventario i ON i.cod_inventario = m.${schemaMovimiento.codInventario}`
    : '';

  return `
    SELECT
      m.${schemaMovimiento.pk} AS cod_movimiento,
      ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario}` : 'NULL::int'} AS cod_inventario,
      ${exprCodProducto} AS cod_producto,
      p.nombre_producto,
      ${exprCodUbicacion} AS cod_ubicacion,
      COALESCE(
        NULLIF(u.codigo_producto, ''),
        NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
        CAST(u.cod_ubicacion AS TEXT)
      ) AS ubicacion,
      CAST(m.${schemaMovimiento.fecha} AS TIMESTAMP) AS fecha_movimiento,
      UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) AS tipo,
      m.${schemaMovimiento.cantidad} AS cantidad,
      ${schemaMovimiento.referencia ? `CAST(m.${schemaMovimiento.referencia} AS TEXT)` : 'NULL::text'} AS referencia_documento,
      ${schemaMovimiento.observaciones ? `CAST(m.${schemaMovimiento.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
      ${schemaMovimiento.codUsuario ? `m.${schemaMovimiento.codUsuario}` : 'NULL::int'} AS cod_usuario,
      ${schemaMovimiento.codUsuario ? 'usu.nombre_usuario' : 'NULL::text'} AS nombre_usuario
    FROM ${schemaMovimiento.tableName} m
    ${joinInventario}
    LEFT JOIN producto p ON p.cod_producto = ${exprCodProducto}
    LEFT JOIN ubicacion u ON u.cod_ubicacion = ${exprCodUbicacion}
    ${schemaMovimiento.codUsuario ? `LEFT JOIN usuarios usu ON usu.cod_usuario = m.${schemaMovimiento.codUsuario}` : ''}
    WHERE m.${schemaMovimiento.pk} = :pkMovimiento
    LIMIT 1
  `;
};

