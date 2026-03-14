// // SQL base para leer inventarios de origen/destino con lock pesimista y orden estable
export const obtenerSelectInventariosTransferenciaConBloqueo = ({ usarStockReservado = true } = {}) => `
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
    AND (
      i.cod_ubicacion = :codUbicacionOrigen
      OR i.cod_ubicacion = :codUbicacionDestino
    )
  ORDER BY i.cod_ubicacion ASC, i.cod_inventario ASC
  FOR UPDATE
`;

// // SQL para releer una sola fila de inventario por producto+ubicacion con lock
export const obtenerSelectInventarioTransferenciaPorProductoUbicacion = ({ usarStockReservado = true } = {}) => `
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
  ORDER BY i.cod_inventario ASC
  LIMIT 1
  FOR UPDATE
`;

// // SQL para crear inventario de destino en cero cuando la combinacion aun no existe
export const obtenerInsertInventarioDestinoInicial = ({ usarStockReservado = true } = {}) => `
  INSERT INTO inventario (
    cod_producto,
    cod_ubicacion,
    stock,
    ${usarStockReservado ? 'stock_reservado,' : ''}
    stock_minimo,
    stock_maximo,
    fecha_ult_mov
  ) VALUES (
    :codProducto,
    :codUbicacionDestino,
    0,
    ${usarStockReservado ? '0,' : ''}
    0,
    0,
    NOW()
  )
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
`;

// // SQL de descuento seguro en origen con guardia anti sobreventa
export const obtenerUpdateTransferenciaSalidaSeguro = ({ usarStockReservado = true } = {}) => `
  UPDATE inventario
  SET stock = stock - :cantidad,
      fecha_ult_mov = NOW()
  WHERE cod_inventario = :codInventarioOrigen
    AND ${
      usarStockReservado
        ? '(stock - COALESCE(stock_reservado, 0)) >= :cantidad'
        : 'stock >= :cantidad'
    }
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
`;

// // SQL para incrementar stock del destino dentro de la misma transaccion
export const obtenerUpdateTransferenciaEntradaDestino = () => `
  UPDATE inventario
  SET stock = stock + :cantidad,
      fecha_ult_mov = NOW()
  WHERE cod_inventario = :codInventarioDestino
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
`;

// // SQL para registrar cabecera persistente de la transferencia en su tabla dedicada
export const obtenerInsertTransferenciaInventario = () => `
  INSERT INTO transferencia_inventario (
    cod_producto,
    cod_inventario_origen,
    cod_inventario_destino,
    cod_ubicacion_origen,
    cod_ubicacion_destino,
    cod_usuario,
    cantidad,
    referencia,
    motivo,
    observaciones,
    estado,
    fecha
  ) VALUES (
    :codProducto,
    :codInventarioOrigen,
    :codInventarioDestino,
    :codUbicacionOrigen,
    :codUbicacionDestino,
    :codUsuario,
    :cantidad,
    :referencia,
    :motivo,
    :observaciones,
    'COMPLETADA',
    NOW()
  )
  RETURNING *
`;

// // Construye INSERT dinamico de movimiento_inventario para tramos de transferencia
export const construirInsertMovimientoTransferenciaSql = ({
  schemaMovimiento,
  tipoMovimiento,
  codInventario,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  referencia,
  motivo,
  observaciones,
  refTipo,
  refId
}) => {
  // // Lista de columnas SQL dinamica segun schema real de movimiento_inventario
  const columnas = [];
  // // Lista de valores parametrizados para prevenir inyeccion SQL
  const valoresSql = [];
  // // Replacements para sequelize.query
  const replacements = {};

  // // FK a inventario si existe en el schema
  if (schemaMovimiento.codInventario) {
    columnas.push(schemaMovimiento.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }

  // // FK directas de producto/ubicacion si existen en el schema
  if (schemaMovimiento.codProducto) {
    columnas.push(schemaMovimiento.codProducto);
    valoresSql.push(':codProducto');
    replacements.codProducto = codProducto;
  }
  if (schemaMovimiento.codUbicacion) {
    columnas.push(schemaMovimiento.codUbicacion);
    valoresSql.push(':codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  // // Usuario autenticado para auditoria cuando la columna existe
  if (schemaMovimiento.codUsuario && codUsuario) {
    columnas.push(schemaMovimiento.codUsuario);
    valoresSql.push(':codUsuario');
    replacements.codUsuario = codUsuario;
  }

  // // Campos funcionales obligatorios del movimiento
  columnas.push(schemaMovimiento.tipo);
  valoresSql.push(':tipoMovimiento');
  replacements.tipoMovimiento = tipoMovimiento;

  columnas.push(schemaMovimiento.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  columnas.push(schemaMovimiento.fecha);
  valoresSql.push('NOW()');

  // // Referencia compartida de transferencia para vincular SALIDA y ENTRADA
  if (schemaMovimiento.referencia) {
    columnas.push(schemaMovimiento.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia;
  }

  // // Motivo funcional cuando existe columna dedicada
  if (schemaMovimiento.motivo) {
    columnas.push(schemaMovimiento.motivo);
    valoresSql.push(':motivo');
    replacements.motivo = motivo || null;
  }

  // // Campos de referencia cruzada opcionales segun schema real
  if (schemaMovimiento.refTipo) {
    columnas.push(schemaMovimiento.refTipo);
    valoresSql.push(':refTipo');
    replacements.refTipo = refTipo || null;
  }
  if (schemaMovimiento.refId) {
    columnas.push(schemaMovimiento.refId);
    valoresSql.push(':refId');
    replacements.refId = refId ?? null;
  }

  // // Observaciones del movimiento si el schema tiene columna compatible
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

// // Construye SQL de relectura del movimiento para respuesta uniforme de kardex
export const construirSelectMovimientoTransferenciaFormateadoSql = ({ schemaMovimiento }) => {
  // // Si no hay PK no se puede reconsultar por id unico, se usa fallback en servicio
  if (!schemaMovimiento.pk) return null;

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
        NULLIF(u.codigo_qr, ''),
        NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
        CAST(u.cod_ubicacion AS TEXT)
      ) AS ubicacion,
      CAST(m.${schemaMovimiento.fecha} AS TIMESTAMP) AS fecha_movimiento,
      UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) AS tipo,
      m.${schemaMovimiento.cantidad} AS cantidad,
      ${schemaMovimiento.referencia ? `CAST(m.${schemaMovimiento.referencia} AS TEXT)` : 'NULL::text'} AS referencia_documento,
      ${schemaMovimiento.observaciones ? `CAST(m.${schemaMovimiento.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
      ${schemaMovimiento.motivo ? `CAST(m.${schemaMovimiento.motivo} AS TEXT)` : 'NULL::text'} AS motivo,
      ${schemaMovimiento.refTipo ? `CAST(m.${schemaMovimiento.refTipo} AS TEXT)` : 'NULL::text'} AS ref_tipo,
      ${schemaMovimiento.refId ? `m.${schemaMovimiento.refId}` : 'NULL::int'} AS ref_id,
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
