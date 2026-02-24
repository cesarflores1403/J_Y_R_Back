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

// // Convierte fecha de query a objeto Date valido o null
const normalizarFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
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
      whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) >= :fechaDesde`);
      replacements.fechaDesde = fechaDesde;
    }

    // // Filtro por fecha hasta (inclusive)
    if (fechaHasta) {
      whereParts.push(`CAST(m.${schemaMovimiento.fecha} AS DATE) <= :fechaHasta`);
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
    const filas = await sequelize.query(`
      SELECT
        ${schemaMovimiento.pk ? `m.${schemaMovimiento.pk} AS cod_movimiento,` : 'NULL::int AS cod_movimiento,'}
        ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario} AS cod_inventario,` : 'NULL::int AS cod_inventario,'}
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
