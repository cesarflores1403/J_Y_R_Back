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

// // Normaliza nivel de alerta de reposicion para consumo en UI/integraciones
const construirNivelAlerta = (estadoStock) => {
  // // SIN_EXISTENCIA se considera la alerta mas urgente
  if (estadoStock === 'SIN_EXISTENCIA') return 'CRITICA';
  // // CRITICO por debajo o igual al minimo configurado
  if (estadoStock === 'CRITICO') return 'STOCK_BAJO';
  // // BAJO se conserva como alerta preventiva si el flujo la incluye
  if (estadoStock === 'BAJO') return 'PREVENTIVA';
  // // Fallback para datos no esperados
  return 'INFORMATIVA';
};

// // Mapea una fila de alerta reutilizando calculos base de existencias
const mapearFilaAlerta = (fila) => {
  // // Reutilizamos normalizacion central para evitar divergencias de calculo
  const base = mapearFilaExistencia(fila);
  if (!base) return null;

  return {
    ...base,
    // // Alias explicito para identificar severidad en frontend/API
    nivel_alerta: construirNivelAlerta(base.estado_stock)
  };
};

// // FROM base del submodulo de existencias partiendo del catalogo de productos
const construirFromExistenciasBase = () => `
  FROM producto p
  LEFT JOIN inventario i ON i.cod_producto = p.cod_producto
  LEFT JOIN ubicacion u ON u.cod_ubicacion = COALESCE(i.cod_ubicacion, p.cod_ubicacion)
`;

// // Construye SELECT base del submodulo de existencias
const construirSelectExistenciasBase = () => `
  SELECT
    i.cod_inventario,
    p.cod_producto,
    p.nombre_producto,
    COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS cod_ubicacion,
    COALESCE(
      NULLIF(u.codigo_qr, ''),
      NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
      CASE
        WHEN COALESCE(i.cod_ubicacion, p.cod_ubicacion) IS NOT NULL
          THEN CAST(COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS TEXT)
      END,
      'Sin ubicacion'
    ) AS ubicacion,
    COALESCE(i.stock, 0) AS stock,
    COALESCE(i.stock_reservado, 0) AS stock_reservado,
    COALESCE(i.stock_minimo, 0) AS stock_minimo,
    COALESCE(i.stock_maximo, 0) AS stock_maximo,
    i.fecha_ult_mov
  ${construirFromExistenciasBase()}
`;

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
      whereParts.push('p.cod_producto = :codProducto');
      replacements.codProducto = codProducto;
    }

    // // Filtro exacto por cod_ubicacion si viene en query
    if (codUbicacion !== null) {
      whereParts.push('COALESCE(i.cod_ubicacion, p.cod_ubicacion) = :codUbicacion');
      replacements.codUbicacion = codUbicacion;
    }

    // // Filtro de criterio por producto (id en texto o nombre)
    if (producto) {
      whereParts.push(`
        (
          CAST(p.cod_producto AS TEXT) ILIKE :producto
          OR CONCAT('PROD-', LPAD(CAST(p.cod_producto AS TEXT), 4, '0')) ILIKE :producto
          OR p.nombre_producto ILIKE :producto
        )
      `);
      replacements.producto = `%${producto}%`;
    }

    // // Filtro de criterio por ubicacion (id, qr o detalle fisico)
    if (ubicacion) {
      whereParts.push(`
        (
          CAST(COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS TEXT) ILIKE :ubicacion
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
      ${construirFromExistenciasBase()}
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
    const filasCrudas = await sequelize.query(`
      ${construirSelectExistenciasBase()}
      WHERE ${whereSql}
      ORDER BY
        p.nombre_producto ASC,
        COALESCE(i.cod_ubicacion, p.cod_ubicacion) ASC NULLS LAST,
        i.cod_inventario ASC NULLS LAST
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

  // // Lista alertas de reposicion aplicando regla stock_disponible <= stock_minimo
  async listarAlertasStockBajo(query = {}) {
    // // Reutilizamos resolver de paginacion compatible con aliases existentes
    const { page, limit, offset } = resolverPaginacion(query);

    // // Filtros exactos opcionales
    const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
    const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
    // // Filtros textuales opcionales para producto y ubicacion
    const producto = normalizarTexto(query.producto);
    const ubicacion = normalizarTexto(query.ubicacion);
    // // Mantiene patron del modulo: excluir inactivos salvo request explicita
    const includeInactive = parsearBoolean(query.includeInactive);
    // // Permite filtrar solo alertas criticas (sin existencia disponible)
    const soloCriticos = parsearBoolean(query.solo_criticos ?? query.soloCriticos);

    // // Construimos condiciones comunes reutilizando la semantica del listado de existencias
    const whereBaseParts = ['1=1'];
    const replacements = {};

    // // Por defecto solo productos activos para coherencia del modulo
    if (!includeInactive) {
      whereBaseParts.push("p.estado_producto = 'Activo'");
    }

    // // Filtro exacto por producto cuando aplica
    if (codProducto !== null) {
      whereBaseParts.push('p.cod_producto = :codProducto');
      replacements.codProducto = codProducto;
    }

    // // Filtro exacto por ubicacion cuando aplica
    if (codUbicacion !== null) {
      whereBaseParts.push('COALESCE(i.cod_ubicacion, p.cod_ubicacion) = :codUbicacion');
      replacements.codUbicacion = codUbicacion;
    }

    // // Filtro textual por id/nombre de producto
    if (producto) {
      whereBaseParts.push(`
        (
          CAST(p.cod_producto AS TEXT) ILIKE :producto
          OR CONCAT('PROD-', LPAD(CAST(p.cod_producto AS TEXT), 4, '0')) ILIKE :producto
          OR p.nombre_producto ILIKE :producto
        )
      `);
      replacements.producto = `%${producto}%`;
    }

    // // Filtro textual por id/qr/detalle de ubicacion
    if (ubicacion) {
      whereBaseParts.push(`
        (
          CAST(COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS TEXT) ILIKE :ubicacion
          OR COALESCE(u.codigo_qr, '') ILIKE :ubicacion
          OR COALESCE(u.pasillo, '') ILIKE :ubicacion
          OR COALESCE(u.estanteria, '') ILIKE :ubicacion
          OR COALESCE(u.nivel_1, '') ILIKE :ubicacion
          OR COALESCE(u.nivel_2, '') ILIKE :ubicacion
        )
      `);
      replacements.ubicacion = `%${ubicacion}%`;
    }

    // // Helper local para ejecutar query de alertas usando stock reservado real
    const ejecutarConsultaAlertas = async () => {
      // // Expresion de stock disponible del modelo actual
      const exprStockDisponible = '(COALESCE(i.stock, 0) - COALESCE(i.stock_reservado, 0))';

      // // Regla principal HU: disponible <= minimo configurado
      const whereAlertaParts = [
        `${exprStockDisponible} <= COALESCE(i.stock_minimo, 0)`
      ];

      // // Filtro opcional de criticidad extrema (sin disponible)
      if (soloCriticos) {
        whereAlertaParts.push(`${exprStockDisponible} <= 0`);
      }

      // // WHERE final combinando filtros base + regla de alerta
      const whereSql = [...whereBaseParts, ...whereAlertaParts].join(' AND ');

      // // Conteo total para paginacion de alertas
      const [countRow] = await sequelize.query(`
        SELECT COUNT(*)::int AS total
        ${construirFromExistenciasBase()}
        WHERE ${whereSql}
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // // Total de alertas para meta de respuesta
      const total = Number(countRow?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      // // Listado paginado priorizando criticidad y menor disponibilidad
      const filasCrudas = await sequelize.query(`
        ${construirSelectExistenciasBase()}
        WHERE ${whereSql}
        ORDER BY
          CASE WHEN ${exprStockDisponible} <= 0 THEN 0 ELSE 1 END ASC,
          ${exprStockDisponible} ASC,
          p.nombre_producto ASC,
          COALESCE(i.cod_ubicacion, p.cod_ubicacion) ASC NULLS LAST,
          i.cod_inventario ASC NULLS LAST
        LIMIT :limite OFFSET :offset
      `, {
        replacements: {
          ...replacements,
          limite: limit,
          offset
        },
        type: sequelize.QueryTypes.SELECT
      });

      // // Enriquecemos cada fila con estado_stock y nivel_alerta consistente
      const datos = filasCrudas
        .map(mapearFilaAlerta)
        .filter(Boolean);

      return {
        datos,
        total,
        totalPages
      };
    };
    const resultado = await ejecutarConsultaAlertas();

    // // Contrato de salida compatible con el resto de listados de inventario
    return {
      data: resultado.datos,
      meta: {
        total: resultado.total,
        page,
        limit,
        totalPages: resultado.totalPages
      },
      // // Aliases legacy para integraciones internas existentes
      datos: resultado.datos,
      total: resultado.total,
      pagina: page,
      limite: limit,
      totalPaginas: resultado.totalPages,
      page,
      limit,
      totalPages: resultado.totalPages
    };
  }

  // // Obtiene una existencia puntual con joins y calculos HU2 para respuesta y auditoria
  async obtenerExistenciaPorId(codInventario) {
    const [fila] = await sequelize.query(`
      ${construirSelectExistenciasBase()}
      WHERE i.cod_inventario = :codInventario
      LIMIT 1
    `, {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT
    });

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
