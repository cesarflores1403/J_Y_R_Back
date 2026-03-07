// // SQL base para buscar inventario por producto + ubicacion con lock pesimista
export const obtenerSelectInventarioBajaPorProductoUbicacion = ({ usarStockReservado = true } = {}) => `
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

// // SQL de descuento seguro para bajas con guardia anti-stock negativo
export const obtenerUpdateBajaSeguro = ({ usarStockReservado = true } = {}) => `
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

// // Construye INSERT dinamico para baja_inventario segun schema real detectado
export const construirInsertBajaInventarioSql = ({
  schemaBaja,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  descripcionBaja
}) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  // // Producto afectado por la baja
  if (schemaBaja.codProducto) {
    columnas.push(schemaBaja.codProducto);
    valoresSql.push(':codProducto');
    replacements.codProducto = codProducto;
  }

  // // Ubicacion afectada por la baja
  if (schemaBaja.codUbicacion) {
    columnas.push(schemaBaja.codUbicacion);
    valoresSql.push(':codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  // // Usuario responsable de registrar la baja (auditoria)
  if (schemaBaja.codUsuario) {
    columnas.push(schemaBaja.codUsuario);
    valoresSql.push(':codUsuario');
    replacements.codUsuario = codUsuario;
  }

  // // Fecha de la baja administrada por servidor
  if (schemaBaja.fecha) {
    columnas.push(schemaBaja.fecha);
    valoresSql.push('NOW()');
  }

  // // Cantidad dada de baja
  if (schemaBaja.cantidad) {
    columnas.push(schemaBaja.cantidad);
    valoresSql.push(':cantidad');
    replacements.cantidad = cantidad;
  }

  // // Texto descriptivo de motivo/referencia de la baja
  if (schemaBaja.descripcion) {
    columnas.push(schemaBaja.descripcion);
    valoresSql.push(':descripcionBaja');
    replacements.descripcionBaja = descripcionBaja || null;
  }

  return {
    sql: `
      INSERT INTO ${schemaBaja.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};

// // Construye INSERT dinamico para movimiento_inventario en flujo de bajas
export const construirInsertMovimientoBajaSql = ({
  schemaMovimiento,
  tipoMovimiento,
  codInventario,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  motivoTexto,
  referencia,
  descripcionDetalle,
  refTipo,
  refId
}) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  // // Vinculo a inventario cuando la tabla de movimientos lo soporta
  if (schemaMovimiento.codInventario) {
    columnas.push(schemaMovimiento.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }

  // // Vinculo directo a producto cuando existe columna
  if (schemaMovimiento.codProducto) {
    columnas.push(schemaMovimiento.codProducto);
    valoresSql.push(':codProducto');
    replacements.codProducto = codProducto;
  }

  // // Vinculo directo a ubicacion cuando existe columna
  if (schemaMovimiento.codUbicacion) {
    columnas.push(schemaMovimiento.codUbicacion);
    valoresSql.push(':codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  // // Usuario autenticado de auditoria cuando existe columna
  if (schemaMovimiento.codUsuario && codUsuario) {
    columnas.push(schemaMovimiento.codUsuario);
    valoresSql.push(':codUsuario');
    replacements.codUsuario = codUsuario;
  }

  // // Tipo de movimiento solicitado para baja (BAJA o fallback AJUSTE)
  columnas.push(schemaMovimiento.tipo);
  valoresSql.push(':tipoMovimiento');
  replacements.tipoMovimiento = tipoMovimiento;

  // // Cantidad afectada en la baja
  columnas.push(schemaMovimiento.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  // // Fecha de movimiento controlada por servidor
  columnas.push(schemaMovimiento.fecha);
  valoresSql.push('NOW()');

  // // Motivo semantico de baja si existe columna dedicada
  if (schemaMovimiento.motivo) {
    columnas.push(schemaMovimiento.motivo);
    valoresSql.push(':motivoTexto');
    replacements.motivoTexto = motivoTexto;
  }

  // // Referencia cruzada al origen funcional de la baja si existe columna
  if (schemaMovimiento.refTipo) {
    columnas.push(schemaMovimiento.refTipo);
    valoresSql.push(':refTipo');
    replacements.refTipo = refTipo;
  }
  if (schemaMovimiento.refId) {
    columnas.push(schemaMovimiento.refId);
    valoresSql.push(':refId');
    replacements.refId = refId ?? null;
  }

  // // Referencia de documento si el schema usa esta columna convencional
  if (schemaMovimiento.referencia) {
    columnas.push(schemaMovimiento.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia || null;
  }

  // // Observacion/detalle si existe columna compatible en el schema
  if (schemaMovimiento.observaciones) {
    columnas.push(schemaMovimiento.observaciones);
    valoresSql.push(':descripcionDetalle');
    replacements.descripcionDetalle = descripcionDetalle || null;
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

// // Construye SQL para relectura de movimiento formateado hacia respuesta/kardex
export const construirSelectMovimientoBajaFormateadoSql = ({ schemaMovimiento }) => {
  // // Si no hay PK en movimiento_inventario no se puede reconsultar por id unico
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
