import { sequelize } from '../config/sequelize.js';

// // Valor por defecto para paginacion de listado
const PAGINA_DEFAULT = 1;
// // Valor por defecto para limite de listado
const LIMITE_DEFAULT = 15;

// // Normaliza texto de filtros para evitar espacios vacios
const normalizarTexto = (valor) => {
  // // Si viene null o undefined devolvemos null
  if (valor === undefined || valor === null) return null;
  // // Convertimos a string y removemos espacios al inicio/fin
  const limpio = String(valor).trim();
  // // Si queda vacio devolvemos null para no aplicar filtro
  return limpio.length > 0 ? limpio : null;
};

// // Convierte query booleano a true/false de forma segura
const parsearBoolean = (valor) => {
  // // Si ya es booleano lo devolvemos directo
  if (typeof valor === 'boolean') return valor;
  // // Si no es string, se considera false
  if (typeof valor !== 'string') return false;
  // // Aceptamos valores comunes de true
  return ['true', '1', 'yes', 'si'].includes(valor.trim().toLowerCase());
};

class InventarioExistenciasService {
  // // Lista existencias por producto y ubicacion con filtros y paginacion
  async listarExistencias(query = {}) {
    // // Definimos pagina con fallback seguro
    const pagina = Number(query.pagina || PAGINA_DEFAULT);
    // // Definimos limite con fallback seguro
    const limite = Number(query.limite || LIMITE_DEFAULT);
    // // Calculamos offset para paginacion SQL
    const offset = (pagina - 1) * limite;

    // // Extraemos filtros por id exacto
    const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
    // // Extraemos filtro por id de ubicacion exacto
    const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
    // // Filtro textual para producto (codigo o nombre)
    const producto = normalizarTexto(query.producto);
    // // Filtro textual para ubicacion (codigo/id/detalle)
    const ubicacion = normalizarTexto(query.ubicacion);
    // // Permite incluir productos/ubicaciones inactivos solo si se solicita
    const includeInactive = parsearBoolean(query.includeInactive);

    // // Base de condiciones dinamicas para el WHERE
    const whereParts = ['1=1'];
    // // Replacements parametrizados para prevenir SQL injection
    const replacements = {};

    // // El patron actual del inventario en reportes excluye productos inactivos por defecto
    if (!includeInactive) {
      // // producto.estado_producto en BD real usa texto ('Activo', 'Inactivo', 'Descontinuado')
      whereParts.push("p.estado_producto = 'Activo'");
    }

    // // Filtro exacto por cod_producto si viene en query
    if (codProducto !== null) {
      whereParts.push('i.cod_producto = :codProducto');
      replacements.codProducto = codProducto;
    }

    // // Filtro exacto por cod_ubicacion si viene en query
    if (codUbicacion !== null) {
      whereParts.push('i.cod_ubicacion = :codUbicacion');
      replacements.codUbicacion = codUbicacion;
    }

    // // Filtro de criterio por producto (id en texto o nombre)
    if (producto) {
      whereParts.push(`
        (
          CAST(p.cod_producto AS TEXT) ILIKE :producto
          OR p.nombre_producto ILIKE :producto
        )
      `);
      replacements.producto = `%${producto}%`;
    }

    // // Filtro de criterio por ubicacion (id, qr o detalle fisico)
    if (ubicacion) {
      whereParts.push(`
        (
          CAST(u.cod_ubicacion AS TEXT) ILIKE :ubicacion
          OR COALESCE(u.codigo_qr, '') ILIKE :ubicacion
          OR COALESCE(u.pasillo, '') ILIKE :ubicacion
          OR COALESCE(u.estanteria, '') ILIKE :ubicacion
          OR COALESCE(u.nivel_1, '') ILIKE :ubicacion
          OR COALESCE(u.nivel_2, '') ILIKE :ubicacion
        )
      `);
      replacements.ubicacion = `%${ubicacion}%`;
    }

    // // Construimos WHERE final con condiciones parametrizadas
    const whereSql = whereParts.join(' AND ');

    // // Query de conteo total para soportar paginacion en frontend
    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM inventario i
      INNER JOIN producto p ON p.cod_producto = i.cod_producto
      INNER JOIN ubicacion u ON u.cod_ubicacion = i.cod_ubicacion
      WHERE ${whereSql}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // // Total de registros encontrados con filtros aplicados
    const total = Number(countRow?.total || 0);
    // // Total de paginas (al menos 1 para estabilidad de UI)
    const totalPaginas = Math.max(1, Math.ceil(total / limite));

    // // Query principal de listado de existencias (solo campos necesarios para UI)
    const datos = await sequelize.query(`
      SELECT
        i.cod_inventario,
        i.cod_producto,
        p.nombre_producto,
        i.cod_ubicacion,
        COALESCE(
          NULLIF(u.codigo_qr, ''),
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT)
        ) AS ubicacion,
        i.stock,
        i.stock_minimo,
        i.stock_maximo,
        i.fecha_ult_mov
      FROM inventario i
      INNER JOIN producto p ON p.cod_producto = i.cod_producto
      INNER JOIN ubicacion u ON u.cod_ubicacion = i.cod_ubicacion
      WHERE ${whereSql}
      ORDER BY p.nombre_producto ASC, i.cod_inventario ASC
      LIMIT :limite OFFSET :offset
    `, {
      // // Reutilizamos filtros y agregamos paginacion
      replacements: {
        ...replacements,
        limite,
        offset
      },
      type: sequelize.QueryTypes.SELECT
    });

    // // Devolvemos estructura paginada siguiendo patron de listados del repo
    return {
      datos,
      total,
      pagina,
      limite,
      totalPaginas
    };
  }

  // // Actualiza solo min/max de una existencia especifica
  async actualizarMinMax(codInventario, payload) {
    // // Consultamos la existencia para validar que exista antes de actualizar
    const [existenciaActual] = await sequelize.query(`
      SELECT cod_inventario
      FROM inventario
      WHERE cod_inventario = :codInventario
      LIMIT 1
    `, {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT
    });

    // // Si no existe, devolvemos 404
    if (!existenciaActual) {
      throw Object.assign(new Error('Existencia de inventario no encontrada'), { status: 404 });
    }

    // // Ejecutamos update restringido unicamente a min y max
    await sequelize.query(`
      UPDATE inventario
      SET stock_minimo = :stockMinimo,
          stock_maximo = :stockMaximo
      WHERE cod_inventario = :codInventario
    `, {
      replacements: {
        codInventario,
        stockMinimo: payload.stock_minimo,
        stockMaximo: payload.stock_maximo
      },
      type: sequelize.QueryTypes.UPDATE
    });

    // // Retornamos registro actualizado con los campos requeridos por la UI
    const [actualizado] = await sequelize.query(`
      SELECT
        i.cod_inventario,
        i.cod_producto,
        p.nombre_producto,
        i.cod_ubicacion,
        COALESCE(
          NULLIF(u.codigo_qr, ''),
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT)
        ) AS ubicacion,
        i.stock,
        i.stock_minimo,
        i.stock_maximo,
        i.fecha_ult_mov
      FROM inventario i
      INNER JOIN producto p ON p.cod_producto = i.cod_producto
      INNER JOIN ubicacion u ON u.cod_ubicacion = i.cod_ubicacion
      WHERE i.cod_inventario = :codInventario
      LIMIT 1
    `, {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT
    });

    // // Devolvemos el registro final actualizado
    return actualizado;
  }
}

export default new InventarioExistenciasService();
