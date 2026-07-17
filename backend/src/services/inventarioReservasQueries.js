// // SQL para leer inventario por producto+ubicacion con lock y soporte de stock_reservado
export const obtenerSelectInventarioPorProductoUbicacion = ({ usarStockReservado = true, forUpdate = false } = {}) => `
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
  ${forUpdate ? 'FOR UPDATE' : ''}
`;

// // SQL para listar SOLO productos con stock disponible dentro de una ubicacion.
// // Es la fuente de verdad que condiciona el catalogo de productos a la ubicacion
// // seleccionada al crear una reserva (evita consultas cruzadas producto-ubicacion).
export const obtenerSelectProductosDisponiblesPorUbicacion = () => `
  SELECT
    i.cod_producto,
    p.nombre_producto,
    i.cod_ubicacion,
    i.stock,
    COALESCE(i.stock_reservado, 0) AS stock_reservado,
    (i.stock - COALESCE(i.stock_reservado, 0)) AS stock_disponible
  FROM inventario i
  JOIN producto p ON p.cod_producto = i.cod_producto
  WHERE i.cod_ubicacion = :codUbicacion
    AND p.estado_producto = 'Activo'
    AND (i.stock - COALESCE(i.stock_reservado, 0)) > 0
  ORDER BY p.nombre_producto ASC, i.cod_producto ASC
`;

// // SQL para leer inventario por id durante liberar/consumir reserva
export const obtenerSelectInventarioPorId = ({ usarStockReservado = true, forUpdate = false } = {}) => `
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
  WHERE i.cod_inventario = :codInventario
  LIMIT 1
  ${forUpdate ? 'FOR UPDATE' : ''}
`;

// // SQL seguro para incrementar stock_reservado sin exceder disponibilidad
export const obtenerUpdateReservarStockSeguro = () => `
  UPDATE inventario
  SET stock_reservado = COALESCE(stock_reservado, 0) + :cantidad
  WHERE cod_inventario = :codInventario
    AND (stock - COALESCE(stock_reservado, 0)) >= :cantidad
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, stock_reservado, fecha_ult_mov
`;

// // SQL seguro para liberar reserva reduciendo solo stock_reservado
export const obtenerUpdateLiberarReservaStock = () => `
  UPDATE inventario
  SET stock_reservado = COALESCE(stock_reservado, 0) - :cantidad
  WHERE cod_inventario = :codInventario
    AND COALESCE(stock_reservado, 0) >= :cantidad
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, stock_reservado, fecha_ult_mov
`;

// // SQL seguro para consumir reserva: descuenta stock y stock_reservado atomicamente
export const obtenerUpdateConsumirReservaStock = () => `
  UPDATE inventario
  SET stock = stock - :cantidad,
      stock_reservado = COALESCE(stock_reservado, 0) - :cantidad,
      fecha_ult_mov = NOW()
  WHERE cod_inventario = :codInventario
    AND stock >= :cantidad
    AND COALESCE(stock_reservado, 0) >= :cantidad
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, stock_reservado, fecha_ult_mov
`;

// // Builder de INSERT para reserva segun schema real de tabla
export const construirInsertReservaSql = ({
  schemaReserva,
  codInventario,
  codProducto,
  codUbicacion,
  cantidad,
  codUsuario,
  referencia,
  observaciones
}) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  if (schemaReserva.codInventario && codInventario) {
    columnas.push(schemaReserva.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }
  if (schemaReserva.codProducto) {
    columnas.push(schemaReserva.codProducto);
    valoresSql.push(':codProducto');
    replacements.codProducto = codProducto;
  }
  if (schemaReserva.codUbicacion) {
    columnas.push(schemaReserva.codUbicacion);
    valoresSql.push(':codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  columnas.push(schemaReserva.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  columnas.push(schemaReserva.estado);
  valoresSql.push(':estadoReserva');
  replacements.estadoReserva = 'ACTIVA';

  if (schemaReserva.fechaCreacion) {
    columnas.push(schemaReserva.fechaCreacion);
    valoresSql.push('NOW()');
  }

  if (schemaReserva.codUsuarioCreacion && codUsuario) {
    columnas.push(schemaReserva.codUsuarioCreacion);
    valoresSql.push(':codUsuarioCreacion');
    replacements.codUsuarioCreacion = codUsuario;
  }

  if (schemaReserva.referencia) {
    columnas.push(schemaReserva.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia || null;
  }

  if (schemaReserva.observaciones) {
    columnas.push(schemaReserva.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }

  return {
    sql: `
      INSERT INTO ${schemaReserva.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};

// // SQL para leer reserva por id con lock durante operaciones criticas
export const construirSelectReservaPorIdSql = ({ schemaReserva, forUpdate = false }) => `
  SELECT *
  FROM ${schemaReserva.tableName}
  WHERE ${schemaReserva.pk} = :codReserva
  LIMIT 1
  ${forUpdate ? 'FOR UPDATE' : ''}
`;

// // Builder para marcar reserva como liberada
export const construirUpdateReservaLiberadaSql = ({ schemaReserva }) => {
  const setPartes = [];

  setPartes.push(`${schemaReserva.estado} = 'LIBERADA'`);

  if (schemaReserva.fechaLiberacion) {
    setPartes.push(`${schemaReserva.fechaLiberacion} = NOW()`);
  }

  if (schemaReserva.codUsuarioLiberacion) {
    setPartes.push(`${schemaReserva.codUsuarioLiberacion} = :codUsuarioLiberacion`);
  }

  if (schemaReserva.motivoLiberacion) {
    setPartes.push(`${schemaReserva.motivoLiberacion} = :motivoLiberacion`);
  }

  if (schemaReserva.observaciones) {
    setPartes.push(`${schemaReserva.observaciones} = :observaciones`);
  }

  return `
    UPDATE ${schemaReserva.tableName}
    SET ${setPartes.join(', ')}
    WHERE ${schemaReserva.pk} = :codReserva
    RETURNING *
  `;
};

// // Builder para marcar reserva como consumida
export const construirUpdateReservaConsumidaSql = ({ schemaReserva }) => {
  const setPartes = [];

  setPartes.push(`${schemaReserva.estado} = 'CONSUMIDA'`);

  if (schemaReserva.fechaConsumo) {
    setPartes.push(`${schemaReserva.fechaConsumo} = NOW()`);
  }

  if (schemaReserva.codUsuarioConsumo) {
    setPartes.push(`${schemaReserva.codUsuarioConsumo} = :codUsuarioConsumo`);
  }

  if (schemaReserva.referencia) {
    setPartes.push(`${schemaReserva.referencia} = COALESCE(:referencia, ${schemaReserva.referencia})`);
  }

  if (schemaReserva.observaciones) {
    setPartes.push(`${schemaReserva.observaciones} = :observaciones`);
  }

  return `
    UPDATE ${schemaReserva.tableName}
    SET ${setPartes.join(', ')}
    WHERE ${schemaReserva.pk} = :codReserva
    RETURNING *
  `;
};

// // Builder de INSERT para movimiento de salida al consumir reserva
export const construirInsertMovimientoConsumoReservaSql = ({
  schemaMovimiento,
  codInventario,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  referencia,
  observaciones,
  codReserva
}) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  if (schemaMovimiento.codInventario) {
    columnas.push(schemaMovimiento.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }
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
  if (schemaMovimiento.codUsuario && codUsuario) {
    columnas.push(schemaMovimiento.codUsuario);
    valoresSql.push(':codUsuario');
    replacements.codUsuario = codUsuario;
  }

  columnas.push(schemaMovimiento.tipo);
  valoresSql.push(':tipoMovimiento');
  replacements.tipoMovimiento = 'SALIDA';

  columnas.push(schemaMovimiento.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  columnas.push(schemaMovimiento.fecha);
  valoresSql.push('NOW()');

  if (schemaMovimiento.referencia) {
    columnas.push(schemaMovimiento.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia || `RESERVA-${codReserva}`;
  }
  if (schemaMovimiento.observaciones) {
    columnas.push(schemaMovimiento.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }
  if (schemaMovimiento.motivo) {
    columnas.push(schemaMovimiento.motivo);
    valoresSql.push(':motivo');
    replacements.motivo = 'CONSUMO_RESERVA';
  }
  if (schemaMovimiento.refTipo) {
    columnas.push(schemaMovimiento.refTipo);
    valoresSql.push(':refTipo');
    replacements.refTipo = 'RESERVA_INVENTARIO';
  }
  if (schemaMovimiento.refId) {
    columnas.push(schemaMovimiento.refId);
    valoresSql.push(':refId');
    replacements.refId = codReserva;
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
