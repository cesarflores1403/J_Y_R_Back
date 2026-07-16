import inventarioMovimientosSchemaService from '../../../inventarioMovimientosSchemaService.js';
import repository from '../repository.js';
import {
  construirContextoJoin,
  normalizarFecha,
  normalizarTexto,
  resolverPaginacion
} from '../helpers.js';

const construirExpresionesAnulacion = (schemaMovimiento, tipo) => {
  const soportaTrazabilidadAnulacion = Boolean(
    schemaMovimiento.pk
    && schemaMovimiento.refTipo
    && schemaMovimiento.refId
  );

  const exprEntradaAnulada = soportaTrazabilidadAnulacion
    ? `EXISTS (
        SELECT 1
        FROM ${schemaMovimiento.tableName} ma
        WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA'
          AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_ENTRADA'
          AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
      )`
    : 'false';
  const exprSalidaAnulada = soportaTrazabilidadAnulacion
    ? `EXISTS (
        SELECT 1
        FROM ${schemaMovimiento.tableName} ma
        WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
          AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_SALIDA'
          AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
      )`
    : 'false';
  const exprBajaAnulada = soportaTrazabilidadAnulacion
    ? `EXISTS (
        SELECT 1
        FROM ${schemaMovimiento.tableName} ma
        WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
          AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_BAJA'
          AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
      )`
    : 'false';

  const exprAnuladoSegunTipo = soportaTrazabilidadAnulacion
    ? `CASE
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA' THEN (${exprEntradaAnulada})
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA' THEN (${exprSalidaAnulada})
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'BAJA' THEN (${exprBajaAnulada})
        ELSE false
      END`
    : 'false';

  const exprAnuladoEstado = tipo === 'ENTRADA'
    ? exprEntradaAnulada
    : (tipo === 'SALIDA'
      ? exprSalidaAnulada
      : (tipo === 'BAJA' ? exprBajaAnulada : exprAnuladoSegunTipo));

  const exprCodMovimientoAnulacion = soportaTrazabilidadAnulacion
    ? `CASE
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA' THEN (
          SELECT ma.${schemaMovimiento.pk}
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_ENTRADA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA' THEN (
          SELECT ma.${schemaMovimiento.pk}
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_SALIDA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'BAJA' THEN (
          SELECT ma.${schemaMovimiento.pk}
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_BAJA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        ELSE NULL
      END`
    : 'NULL::int';

  const exprFechaAnulacion = soportaTrazabilidadAnulacion
    ? `CASE
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA' THEN (
          SELECT CAST(ma.${schemaMovimiento.fecha} AS TIMESTAMP)
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_ENTRADA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA' THEN (
          SELECT CAST(ma.${schemaMovimiento.fecha} AS TIMESTAMP)
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_SALIDA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        WHEN UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'BAJA' THEN (
          SELECT CAST(ma.${schemaMovimiento.fecha} AS TIMESTAMP)
          FROM ${schemaMovimiento.tableName} ma
          WHERE UPPER(CAST(ma.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
            AND CAST(ma.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_BAJA'
            AND ma.${schemaMovimiento.refId} = m.${schemaMovimiento.pk}
          ORDER BY ma.${schemaMovimiento.fecha} DESC
          LIMIT 1
        )
        ELSE NULL
      END`
    : 'NULL::timestamp';

  return {
    soportaTrazabilidadAnulacion,
    exprAnuladoEstado,
    exprAnulado: exprAnuladoSegunTipo,
    exprCodMovimientoAnulacion,
    exprFechaAnulacion
  };
};

export const listarMovimientos = async (query = {}) => {
  const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
  const { page, limit, offset } = resolverPaginacion(query);
  const { exprCodProducto, exprCodUbicacion, joinInventario } = construirContextoJoin(schemaMovimiento);

  const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
  const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
  const tipo = normalizarTexto(query.tipo)?.toUpperCase() || null;
  const estado = normalizarTexto(query.estado)?.toUpperCase() || null;
  const excluirRefTipoRaw = normalizarTexto(query.excluir_ref_tipo ?? query.excluirRefTipo);
  const excluirRefTipos = excluirRefTipoRaw
    ? excluirRefTipoRaw
      .split(',')
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
    : [];
  const fechaDesde = normalizarFecha(query.fecha_desde);
  const fechaHasta = normalizarFecha(query.fecha_hasta);

  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    throw Object.assign(new Error('fecha_desde no puede ser mayor que fecha_hasta'), { status: 400 });
  }

  const whereParts = ['1=1'];
  const replacements = {};

  if (fechaDesde) {
    whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) >= CAST(:fechaDesde AS DATE)`);
    replacements.fechaDesde = fechaDesde;
  }

  if (fechaHasta) {
    whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) <= CAST(:fechaHasta AS DATE)`);
    replacements.fechaHasta = fechaHasta;
  }

  if (codProducto !== null) {
    whereParts.push(`${exprCodProducto} = :codProducto`);
    replacements.codProducto = codProducto;
  }

  if (codUbicacion !== null) {
    whereParts.push(`${exprCodUbicacion} = :codUbicacion`);
    replacements.codUbicacion = codUbicacion;
  }

  if (tipo) {
    whereParts.push(`UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = :tipo`);
    replacements.tipo = tipo;
  }

  if (excluirRefTipos.length > 0 && schemaMovimiento.refTipo) {
    const placeholders = excluirRefTipos.map((_, index) => `:excluirRefTipo${index}`);
    excluirRefTipos.forEach((valor, index) => {
      replacements[`excluirRefTipo${index}`] = valor;
    });

    whereParts.push(`(
      m.${schemaMovimiento.refTipo} IS NULL
      OR UPPER(CAST(m.${schemaMovimiento.refTipo} AS TEXT)) NOT IN (${placeholders.join(', ')})
    )`);
  }

  const expresiones = construirExpresionesAnulacion(schemaMovimiento, tipo);
  if (estado && estado !== 'TODAS' && expresiones.soportaTrazabilidadAnulacion) {
    if (estado === 'ANULADAS') {
      whereParts.push(expresiones.exprAnuladoEstado);
    } else if (estado === 'ACTIVAS') {
      whereParts.push(`NOT (${expresiones.exprAnuladoEstado})`);
    }
  }

  const whereSql = whereParts.join(' AND ');
  const selectBase = `
    FROM ${schemaMovimiento.tableName} m
    ${joinInventario}
    LEFT JOIN producto p ON p.cod_producto = ${exprCodProducto}
    LEFT JOIN ubicacion u ON u.cod_ubicacion = ${exprCodUbicacion}
    ${schemaMovimiento.codUsuario ? `LEFT JOIN usuarios usu ON usu.cod_usuario = m.${schemaMovimiento.codUsuario}` : ''}
    WHERE ${whereSql}
  `;

  const total = await repository.contar({ selectBase, replacements });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const orderBy = schemaMovimiento.pk
    ? `ORDER BY m.${schemaMovimiento.fecha} DESC, m.${schemaMovimiento.pk} DESC`
    : `ORDER BY m.${schemaMovimiento.fecha} DESC`;

  const filas = await repository.listar({
    schemaMovimiento,
    selectBase,
    replacements,
    orderBy,
    limit,
    offset,
    expressions: {
      ...expresiones,
      exprCodProducto,
      exprCodUbicacion
    }
  });

  return {
    data: filas,
    meta: {
      total,
      page,
      limit,
      totalPages
    },
    datos: filas,
    total,
    pagina: page,
    limite: limit,
    totalPaginas: totalPages,
    page,
    limit,
    totalPages
  };
};
