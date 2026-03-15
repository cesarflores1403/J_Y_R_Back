import { sequelize } from '../config/sequelize.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';

// // Defaults de paginacion siguiendo el patron usado en Inventario HU2
const PAGINA_DEFAULT = 1;
const LIMITE_DEFAULT = 15;
const LIMITE_MAXIMO = 100;

// // Convierte query string a entero seguro con fallback
const parsearEntero = (valor, fallback) => {
  // // Si no viene valor usamos fallback
  if (valor === undefined || valor === null || valor === '') return fallback;
  const parsed = Number.parseInt(valor, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

// // Resuelve paginacion con aliases page/limit y pagina/limite
const resolverPaginacion = (query = {}) => {
  const page = Math.max(1, parsearEntero(query.page ?? query.pagina, PAGINA_DEFAULT));
  const limit = Math.max(1, Math.min(LIMITE_MAXIMO, parsearEntero(query.limit ?? query.limite, LIMITE_DEFAULT)));

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

// // Normaliza texto opcional (trim) para filtros de query
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

// // Convierte fecha de query a texto YYYY-MM-DD (sin desfase por zona horaria)
const normalizarFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return valor.toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
};

// // Devuelve expresion SQL segura (con nombres resueltos por schema) para cod_producto/cod_ubicacion
const construirContextoJoin = (schemaMovimiento) => {
  // // Si movimiento guarda cod_producto/cod_ubicacion directos, se usan desde m
  const exprCodProducto = schemaMovimiento.codProducto
    ? `m.${schemaMovimiento.codProducto}`
    : 'i.cod_producto';
  const exprCodUbicacion = schemaMovimiento.codUbicacion
    ? `m.${schemaMovimiento.codUbicacion}`
    : 'i.cod_ubicacion';

  // // Join a inventario solo si el movimiento referencia cod_inventario
  const joinInventario = schemaMovimiento.codInventario
    ? `LEFT JOIN inventario i ON i.cod_inventario = m.${schemaMovimiento.codInventario}`
    : '';

  return {
    exprCodProducto,
    exprCodUbicacion,
    joinInventario
  };
};

class InventarioMovimientosService {
  // // Lista movimientos de kardex con filtros y paginacion (HU3)
  async listarMovimientos(query = {}) {
    // // Resolvemos schema real de movimiento_inventario para construir SQL compatible
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    // // Resolvemos paginacion con compatibilidad legacy
    const { page, limit, offset } = resolverPaginacion(query);
    // // Contexto de joins segun FKs presentes en movimiento_inventario
    const { exprCodProducto, exprCodUbicacion, joinInventario } = construirContextoJoin(schemaMovimiento);

    // // Normalizamos filtros recibidos desde la API
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

    // // Validacion de rango de fechas para evitar consultas incoherentes
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw Object.assign(new Error('fecha_desde no puede ser mayor que fecha_hasta'), { status: 400 });
    }

    // // Condiciones dinamicas del WHERE
    const whereParts = ['1=1'];
    // // Reemplazos parametrizados para SQL seguro
    const replacements = {};

    // // Filtro por fecha desde (inclusive)
    if (fechaDesde) {
      whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) >= CAST(:fechaDesde AS DATE)`);
      replacements.fechaDesde = fechaDesde;
    }

    // // Filtro por fecha hasta (inclusive)
    if (fechaHasta) {
      whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) <= CAST(:fechaHasta AS DATE)`);
      replacements.fechaHasta = fechaHasta;
    }

    // // Filtro exacto por producto si se solicita
    if (codProducto !== null) {
      whereParts.push(`${exprCodProducto} = :codProducto`);
      replacements.codProducto = codProducto;
    }

    // // Filtro exacto por ubicacion si se solicita
    if (codUbicacion !== null) {
      whereParts.push(`${exprCodUbicacion} = :codUbicacion`);
      replacements.codUbicacion = codUbicacion;
    }

    // // Filtro por tipo de movimiento normalizado en mayusculas
    if (tipo) {
      whereParts.push(`UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = :tipo`);
      replacements.tipo = tipo;
    }

    // // Permite excluir subtipos tecnicos (ej. ANULACION_ENTRADA) cuando el schema soporta ref_tipo
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

    // // Filtro de anulacion para entradas/salidas cuando el schema soporta ref_tipo/ref_id
    if (estado && estado !== 'TODAS' && soportaTrazabilidadAnulacion) {
      const exprAnuladoEstado = tipo === 'ENTRADA'
        ? exprEntradaAnulada
        : (tipo === 'SALIDA'
          ? exprSalidaAnulada
          : (tipo === 'BAJA' ? exprBajaAnulada : exprAnuladoSegunTipo));

      if (estado === 'ANULADAS') {
        whereParts.push(exprAnuladoEstado);
      } else if (estado === 'ACTIVAS') {
        whereParts.push(`NOT (${exprAnuladoEstado})`);
      }
    }

    // // WHERE final de la consulta de kardex
    const whereSql = whereParts.join(' AND ');

    // // Select base del kardex con joins a producto/ubicacion y usuario si existe
    const selectBase = `
      FROM ${schemaMovimiento.tableName} m
      ${joinInventario}
      LEFT JOIN producto p ON p.cod_producto = ${exprCodProducto}
      LEFT JOIN ubicacion u ON u.cod_ubicacion = ${exprCodUbicacion}
      ${schemaMovimiento.codUsuario ? `LEFT JOIN usuarios usu ON usu.cod_usuario = m.${schemaMovimiento.codUsuario}` : ''}
      WHERE ${whereSql}
    `;

    // // Conteo total para paginacion del kardex
    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      ${selectBase}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // // Total de movimientos encontrados y total de paginas para la UI
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // // Orden por fecha descendente y PK descendente (si existe) para estabilidad
    const orderBy = schemaMovimiento.pk
      ? `ORDER BY m.${schemaMovimiento.fecha} DESC, m.${schemaMovimiento.pk} DESC`
      : `ORDER BY m.${schemaMovimiento.fecha} DESC`;

    // // Select de filas del kardex con aliases estables para frontend
    const exprAnulado = exprAnuladoSegunTipo;

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

    const filas = await sequelize.query(`
      SELECT
        ${schemaMovimiento.pk ? `m.${schemaMovimiento.pk} AS cod_movimiento,` : 'NULL::int AS cod_movimiento,'}
        ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario} AS cod_inventario,` : 'NULL::int AS cod_inventario,'}
        ${exprCodProducto} AS cod_producto,
        p.nombre_producto,
        ${exprCodUbicacion} AS cod_ubicacion,
        COALESCE(
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT),
          '-'
        ) AS ubicacion,
        CAST(m.${schemaMovimiento.fecha} AS TIMESTAMP) AS fecha_movimiento,
        UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) AS tipo,
        m.${schemaMovimiento.cantidad} AS cantidad,
        ${schemaMovimiento.referencia ? `CAST(m.${schemaMovimiento.referencia} AS TEXT)` : 'NULL::text'} AS referencia_documento,
        ${schemaMovimiento.observaciones ? `CAST(m.${schemaMovimiento.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaMovimiento.motivo ? `CAST(m.${schemaMovimiento.motivo} AS TEXT)` : 'NULL::text'} AS motivo,
        ${schemaMovimiento.refTipo ? `CAST(m.${schemaMovimiento.refTipo} AS TEXT)` : 'NULL::text'} AS ref_tipo,
        ${schemaMovimiento.refId ? `m.${schemaMovimiento.refId}` : 'NULL::int'} AS ref_id,
        ${exprAnulado} AS anulado,
        ${exprCodMovimientoAnulacion} AS cod_movimiento_anulacion,
        ${exprFechaAnulacion} AS fecha_anulacion,
        ${schemaMovimiento.codUsuario ? `m.${schemaMovimiento.codUsuario}` : 'NULL::int'} AS cod_usuario,
        ${schemaMovimiento.codUsuario ? 'usu.nombre_usuario' : 'NULL::text'} AS nombre_usuario
      ${selectBase}
      ${orderBy}
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        ...replacements,
        limit,
        offset
      },
      type: sequelize.QueryTypes.SELECT
    });

    // // Devolvemos contrato nuevo con compatibilidad de aliases de paginacion
    return {
      data: filas,
      meta: {
        total,
        page,
        limit,
        totalPages
      },
      // // Aliases para mantener consistencia con otros listados del modulo
      datos: filas,
      total,
      pagina: page,
      limite: limit,
      totalPaginas: totalPages,
      page,
      limit,
      totalPages
    };
  }
}

export default new InventarioMovimientosService();

