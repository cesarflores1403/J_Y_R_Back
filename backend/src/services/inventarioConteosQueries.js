// // SQL para leer inventario por producto+ubicacion (lock opcional) con fallback de stock_reservado
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

// // SQL para bloquear inventario por cod_inventario durante cierre de conteo
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

// // SQL para fijar stock al valor fisico final y actualizar fecha_ult_mov
export const obtenerUpdateInventarioAStockFisico = () => `
  UPDATE inventario
  SET stock = :stockFisico,
      fecha_ult_mov = NOW()
  WHERE cod_inventario = :codInventario
  RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
`;

// // Builder de INSERT para encabezado de conteo fisico segun columnas reales
export const construirInsertConteoSql = ({ schemaHeader, codUsuario, observaciones }) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  // // Estado inicial del conteo en apertura
  if (schemaHeader.estado) {
    columnas.push(schemaHeader.estado);
    valoresSql.push(':estado');
    replacements.estado = 'ABIERTO';
  }

  // // Fecha de apertura gestionada por servidor
  if (schemaHeader.fechaApertura) {
    columnas.push(schemaHeader.fechaApertura);
    valoresSql.push('NOW()');
  }

  // // Usuario que abre el conteo cuando columna existe
  if (schemaHeader.codUsuarioApertura && codUsuario) {
    columnas.push(schemaHeader.codUsuarioApertura);
    valoresSql.push(':codUsuarioApertura');
    replacements.codUsuarioApertura = codUsuario;
  }

  // // Observaciones iniciales del conteo
  if (schemaHeader.observaciones) {
    columnas.push(schemaHeader.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }

  return {
    sql: `
      INSERT INTO ${schemaHeader.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};

// // SQL de lectura de encabezado por id con lock opcional para cierre
export const construirSelectConteoPorIdSql = ({ schemaHeader, forUpdate = false }) => `
  SELECT *
  FROM ${schemaHeader.tableName}
  WHERE ${schemaHeader.pk} = :codConteo
  LIMIT 1
  ${forUpdate ? 'FOR UPDATE' : ''}
`;

// // SQL para buscar detalle existente (conteo + producto + ubicacion)
export const construirSelectDetalleExistenteSql = ({ schemaDetail }) => `
  SELECT *
  FROM ${schemaDetail.tableName}
  WHERE ${schemaDetail.codConteo} = :codConteo
    AND ${schemaDetail.codProducto} = :codProducto
    AND ${schemaDetail.codUbicacion} = :codUbicacion
  ORDER BY ${schemaDetail.pk || schemaDetail.codConteo} ASC
  LIMIT 1
`;

// // Builder de INSERT para detalle de conteo
export const construirInsertDetalleConteoSql = ({
  schemaDetail,
  codConteo,
  codProducto,
  codUbicacion,
  codInventario,
  stockSistema,
  stockFisico,
  diferencia,
  observaciones
}) => {
  const columnas = [];
  const valoresSql = [];
  const replacements = {};

  columnas.push(schemaDetail.codConteo);
  valoresSql.push(':codConteo');
  replacements.codConteo = codConteo;

  columnas.push(schemaDetail.codProducto);
  valoresSql.push(':codProducto');
  replacements.codProducto = codProducto;

  columnas.push(schemaDetail.codUbicacion);
  valoresSql.push(':codUbicacion');
  replacements.codUbicacion = codUbicacion;

  if (schemaDetail.codInventario && codInventario) {
    columnas.push(schemaDetail.codInventario);
    valoresSql.push(':codInventario');
    replacements.codInventario = codInventario;
  }

  if (schemaDetail.stockSistema) {
    columnas.push(schemaDetail.stockSistema);
    valoresSql.push(':stockSistema');
    replacements.stockSistema = stockSistema;
  }

  columnas.push(schemaDetail.stockFisico);
  valoresSql.push(':stockFisico');
  replacements.stockFisico = stockFisico;

  if (schemaDetail.diferencia) {
    columnas.push(schemaDetail.diferencia);
    valoresSql.push(':diferencia');
    replacements.diferencia = diferencia;
  }

  if (schemaDetail.observaciones) {
    columnas.push(schemaDetail.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }

  if (schemaDetail.fechaRegistro) {
    columnas.push(schemaDetail.fechaRegistro);
    valoresSql.push('NOW()');
  }

  return {
    sql: `
      INSERT INTO ${schemaDetail.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};

// // Builder de UPDATE para detalle existente en el mismo conteo
export const construirUpdateDetalleConteoSql = ({
  schemaDetail,
  pkDetalle,
  codInventario,
  stockSistema,
  stockFisico,
  diferencia,
  observaciones
}) => {
  const setPartes = [];
  const replacements = { pkDetalle };

  if (schemaDetail.codInventario && codInventario) {
    setPartes.push(`${schemaDetail.codInventario} = :codInventario`);
    replacements.codInventario = codInventario;
  }
  if (schemaDetail.stockSistema) {
    setPartes.push(`${schemaDetail.stockSistema} = :stockSistema`);
    replacements.stockSistema = stockSistema;
  }

  setPartes.push(`${schemaDetail.stockFisico} = :stockFisico`);
  replacements.stockFisico = stockFisico;

  if (schemaDetail.diferencia) {
    setPartes.push(`${schemaDetail.diferencia} = :diferencia`);
    replacements.diferencia = diferencia;
  }
  if (schemaDetail.observaciones) {
    setPartes.push(`${schemaDetail.observaciones} = :observaciones`);
    replacements.observaciones = observaciones || null;
  }
  if (schemaDetail.fechaRegistro) {
    setPartes.push(`${schemaDetail.fechaRegistro} = NOW()`);
  }

  return {
    sql: `
      UPDATE ${schemaDetail.tableName}
      SET ${setPartes.join(', ')}
      WHERE ${schemaDetail.pk} = :pkDetalle
      RETURNING *
    `,
    replacements
  };
};

// // SQL para listar detalles del conteo con lock opcional en cierre
export const construirSelectDetallesConteoSql = ({ schemaDetail, forUpdate = false }) => `
  SELECT *
  FROM ${schemaDetail.tableName}
  WHERE ${schemaDetail.codConteo} = :codConteo
  ORDER BY ${schemaDetail.pk || schemaDetail.codConteo} ASC
  ${forUpdate ? 'FOR UPDATE' : ''}
`;

// // Builder de UPDATE para marcar encabezado como cerrado
export const construirUpdateCerrarConteoSql = ({ schemaHeader }) => {
  const setPartes = [];

  // // Cambio de estado funcional del conteo
  if (schemaHeader.estado) {
    setPartes.push(`${schemaHeader.estado} = 'CERRADO'`);
  }

  // // Marca temporal de cierre
  if (schemaHeader.fechaCierre) {
    setPartes.push(`${schemaHeader.fechaCierre} = NOW()`);
  }

  // // Usuario que cierra conteo si columna existe
  if (schemaHeader.codUsuarioCierre) {
    setPartes.push(`${schemaHeader.codUsuarioCierre} = :codUsuarioCierre`);
  }

  // // Observacion de cierre cuando el schema la soporta
  if (schemaHeader.observacionesCierre) {
    setPartes.push(`${schemaHeader.observacionesCierre} = :observacionesCierre`);
  } else if (schemaHeader.observaciones) {
    setPartes.push(`${schemaHeader.observaciones} = COALESCE(${schemaHeader.observaciones}, '') || :anexoCierre`);
  }

  return `
    UPDATE ${schemaHeader.tableName}
    SET ${setPartes.join(', ')}
    WHERE ${schemaHeader.pk} = :codConteo
    RETURNING *
  `;
};

// // Builder dinamico para insertar movimiento de ajuste relacionado a cierre de conteo
export const construirInsertMovimientoAjusteSql = ({
  schemaMovimiento,
  codInventario,
  codProducto,
  codUbicacion,
  codUsuario,
  cantidad,
  motivo,
  referencia,
  observaciones,
  refTipo,
  refId
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

  // // Tipo AJUSTE para mantener compatibilidad con check constraints existentes del kardex
  columnas.push(schemaMovimiento.tipo);
  valoresSql.push(':tipoMovimiento');
  replacements.tipoMovimiento = 'AJUSTE';

  columnas.push(schemaMovimiento.cantidad);
  valoresSql.push(':cantidad');
  replacements.cantidad = cantidad;

  columnas.push(schemaMovimiento.fecha);
  valoresSql.push('NOW()');

  if (schemaMovimiento.motivo) {
    columnas.push(schemaMovimiento.motivo);
    valoresSql.push(':motivo');
    replacements.motivo = motivo;
  }
  if (schemaMovimiento.referencia) {
    columnas.push(schemaMovimiento.referencia);
    valoresSql.push(':referencia');
    replacements.referencia = referencia;
  }
  if (schemaMovimiento.observaciones) {
    columnas.push(schemaMovimiento.observaciones);
    valoresSql.push(':observaciones');
    replacements.observaciones = observaciones || null;
  }
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

  return {
    sql: `
      INSERT INTO ${schemaMovimiento.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `,
    replacements
  };
};
