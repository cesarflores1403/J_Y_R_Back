import { sequelize } from '../config/sequelize.js';

// // Valor por defecto para paginacion de listado
const PAGINA_DEFAULT = 1;
// // Valor por defecto para limite de listado
const LIMITE_DEFAULT = 15;
// // Tope defensivo para evitar consultas demasiado grandes
const LIMITE_MAXIMO = 100;

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

// // Convierte cualquier valor a entero seguro con fallback
const parsearEntero = (valor, fallback) => {
  // // Si no viene valor devolvemos fallback configurado
  if (valor === undefined || valor === null || valor === '') return fallback;
  // // Intentamos convertir a numero entero
  const parsed = Number.parseInt(valor, 10);
  // // Si no es numero valido devolvemos fallback
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

// // Resuelve paginacion soportando aliases nuevos (page/limit) y legacy (pagina/limite)
const resolverPaginacion = (query = {}) => {
  // // Priorizamos page/limit y mantenemos compatibilidad con pagina/limite
  const page = parsearEntero(query.page ?? query.pagina, PAGINA_DEFAULT);
  const limit = parsearEntero(query.limit ?? query.limite, LIMITE_DEFAULT);

  // // Blindaje adicional por si el endpoint se usa sin validacion de ruta
  const paginaNormalizada = Math.max(1, page);
  const limiteNormalizado = Math.max(1, Math.min(LIMITE_MAXIMO, limit));

  return {
    page: paginaNormalizada,
    limit: limiteNormalizado,
    offset: (paginaNormalizada - 1) * limiteNormalizado
  };
};

// // Convierte numeros devueltos por PostgreSQL a number con fallback cero
const aNumero = (valor) => {
  // // null/undefined se consideran cero para calculos de existencias
  if (valor === null || valor === undefined || valor === '') return 0;
  const parsed = Number(valor);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// // Regla propuesta para clasificar el estado de stock disponible
const calcularEstadoStock = ({ stock, stock_reservado, stock_minimo, stock_maximo }) => {
  // // Calculamos stock disponible usando reservado (nueva HU2)
  const stockDisponible = aNumero(stock) - aNumero(stock_reservado);
  const stockMinimo = aNumero(stock_minimo);
  const stockMaximo = aNumero(stock_maximo);

  // // Sin existencia si el disponible ya no alcanza para entregar
  if (stockDisponible <= 0) {
    return { stock_disponible: stockDisponible, estado_stock: 'SIN_EXISTENCIA' };
  }

  // // Critico si aun hay unidades, pero el disponible ya esta en o debajo del minimo
  if (stockDisponible <= stockMinimo) {
    return { stock_disponible: stockDisponible, estado_stock: 'CRITICO' };
  }

  // // Regla propuesta: BAJO en el primer 25% sobre el minimo hasta el maximo configurado
  if (stockMaximo > stockMinimo) {
    const umbralBajo = stockMinimo + Math.ceil((stockMaximo - stockMinimo) * 0.25);
    if (stockDisponible <= umbralBajo) {
      return { stock_disponible: stockDisponible, estado_stock: 'BAJO' };
    }
  }

  // // Caso restante: inventario en rango normal segun configuracion actual
  return { stock_disponible: stockDisponible, estado_stock: 'NORMAL' };
};

// // Aplica calculos HU2 a una fila cruda de BD y normaliza campos numericos relevantes
const mapearFilaExistencia = (fila) => {
  // // Si por alguna razon no hay fila devolvemos null para manejo seguro aguas arriba
  if (!fila) return null;

  // // Normalizamos numericos que se usan en UI y reglas de negocio
  const stock = aNumero(fila.stock);
  const stockReservado = aNumero(fila.stock_reservado);
  const stockMinimo = aNumero(fila.stock_minimo);
  const stockMaximo = aNumero(fila.stock_maximo);

  // // Calculamos disponibles y estado_stock con la regla definida en este servicio
  const calculados = calcularEstadoStock({
    stock,
    stock_reservado: stockReservado,
    stock_minimo: stockMinimo,
    stock_maximo: stockMaximo
  });

  return {
    ...fila,
    stock,
    stock_reservado: stockReservado,
    stock_minimo: stockMinimo,
    stock_maximo: stockMaximo,
    stock_disponible: calculados.stock_disponible,
    estado_stock: calculados.estado_stock
  };
};

// // Construye SELECT base reutilizable con fallback si stock_reservado no existe en BD
const construirSelectExistenciasBase = ({ usarColumnaStockReservado = true } = {}) => `
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
    ${usarColumnaStockReservado ? 'COALESCE(i.stock_reservado, 0)' : '0'} AS stock_reservado,
    i.stock_minimo,
    i.stock_maximo,
    i.fecha_ult_mov
  FROM inventario i
  INNER JOIN producto p ON p.cod_producto = i.cod_producto
  INNER JOIN ubicacion u ON u.cod_ubicacion = i.cod_ubicacion
`;

// // Detecta el error de PostgreSQL cuando una columna no existe (42703)
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  // // En PostgreSQL undefined_column usa codigo 42703
  if (!error) return false;
  if (error.code !== '42703') return false;
  // // Verificamos el nombre en message/original para no ocultar otros errores
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

class InventarioExistenciasService {
  // // Lista existencias por producto y ubicacion con filtros y paginacion
  async listarExistencias(query = {}) {
    // // Resolvemos paginacion con soporte a page/limit y pagina/limite
    const { page, limit, offset } = resolverPaginacion(query);

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
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // // Query principal de listado reutilizando SELECT base de existencias
    let filasCrudas;

    try {
      // // Intentamos usar stock_reservado real si la columna ya existe en la BD
      filasCrudas = await sequelize.query(`
        ${construirSelectExistenciasBase({ usarColumnaStockReservado: true })}
        WHERE ${whereSql}
        ORDER BY p.nombre_producto ASC, i.cod_inventario ASC
        LIMIT :limite OFFSET :offset
      `, {
        // // Reutilizamos filtros y agregamos paginacion
        replacements: {
          ...replacements,
          limite: limit,
          offset
        },
        type: sequelize.QueryTypes.SELECT
      });
    } catch (error) {
      // // Fallback incremental: si la columna no existe, respondemos con stock_reservado=0
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      filasCrudas = await sequelize.query(`
        ${construirSelectExistenciasBase({ usarColumnaStockReservado: false })}
        WHERE ${whereSql}
        ORDER BY p.nombre_producto ASC, i.cod_inventario ASC
        LIMIT :limite OFFSET :offset
      `, {
        replacements: {
          ...replacements,
          limite: limit,
          offset
        },
        type: sequelize.QueryTypes.SELECT
      });
    }

    // // Agregamos stock_disponible y estado_stock a cada fila para HU2 reestructurada
    const datos = filasCrudas.map(mapearFilaExistencia);

    // // Estructura nueva (data + meta) con compatibilidad legacy para no romper UI existente
    return {
      // // Contrato nuevo recomendado para frontend HU2 reestructurada
      data: datos,
      meta: {
        total,
        page,
        limit,
        totalPages
      },
      // // Compatibilidad con contrato previo usado por la vista actual
      datos,
      total,
      pagina: page,
      limite: limit,
      totalPaginas: totalPages,
      // // Exponemos aliases top-level por compatibilidad adicional de clientes intermedios
      page,
      limit,
      totalPages
    };
  }

  // // Obtiene una existencia puntual con joins y calculos HU2 para respuesta y auditoria
  async obtenerExistenciaPorId(codInventario) {
    let fila;

    try {
      // // Intentamos leer usando la columna stock_reservado si esta disponible en la BD
      [fila] = await sequelize.query(`
        ${construirSelectExistenciasBase({ usarColumnaStockReservado: true })}
        WHERE i.cod_inventario = :codInventario
        LIMIT 1
      `, {
        replacements: { codInventario },
        type: sequelize.QueryTypes.SELECT
      });
    } catch (error) {
      // // Fallback incremental para ambientes donde aun no se aplico el cambio de BD
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      [fila] = await sequelize.query(`
        ${construirSelectExistenciasBase({ usarColumnaStockReservado: false })}
        WHERE i.cod_inventario = :codInventario
        LIMIT 1
      `, {
        replacements: { codInventario },
        type: sequelize.QueryTypes.SELECT
      });
    }

    // // Aplicamos calculos HU2 antes de devolver la fila
    return mapearFilaExistencia(fila);
  }

  // // Actualiza solo min/max de una existencia especifica
  async actualizarMinMax(codInventario, payload, _options = {}) {
    // // Consultamos la existencia completa para validar existencia y guardar snapshot before
    const existenciaActual = await this.obtenerExistenciaPorId(codInventario);

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

    // // Obtenemos snapshot after con joins y campos calculados para UI y auditoria
    const actualizado = await this.obtenerExistenciaPorId(codInventario);

    // // Devolvemos payload de respuesta + before/after para auditoria minima del controller
    return {
      data: actualizado,
      before: {
        cod_inventario: existenciaActual.cod_inventario,
        stock_minimo: existenciaActual.stock_minimo,
        stock_maximo: existenciaActual.stock_maximo
      },
      after: {
        cod_inventario: actualizado?.cod_inventario ?? codInventario,
        stock_minimo: actualizado?.stock_minimo ?? payload.stock_minimo,
        stock_maximo: actualizado?.stock_maximo ?? payload.stock_maximo
      }
    };
  }
}

export default new InventarioExistenciasService();
