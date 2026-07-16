import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import inventarioConteosSchemaService from './inventarioConteosSchemaService.js';
import { generarReportePdf } from '../utils/pdfReport.js';
import {
  obtenerSelectInventarioPorProductoUbicacion,
  obtenerSelectInventarioPorId,
  obtenerUpdateInventarioAStockFisico,
  construirInsertConteoSql,
  construirSelectConteoPorIdSql,
  construirSelectDetalleExistenteSql,
  construirInsertDetalleConteoSql,
  construirUpdateDetalleConteoSql,
  construirSelectDetallesConteoSql,
  construirUpdateCerrarConteoSql,
  construirInsertMovimientoAjusteSql
} from './inventarioConteosQueries.js';

// // Defaults de paginacion para listados de conteos
const PAGINA_DEFAULT = 1;
const LIMITE_DEFAULT = 15;
const LIMITE_MAXIMO = 100;

// // Convierte query string a entero seguro con fallback
const parsearEntero = (valor, fallback) => {
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

// // Normaliza strings opcionales para filtros
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

const formatearTextoPdfMultilinea = (valor = '') => {
  const limpio = String(valor || '').trim();
  if (!limpio) return '-';
  return limpio
    .replace(/_/g, '_ ')
    .replace(/-/g, '- ')
    .replace(/\//g, '/ ')
    .replace(/\s+/g, ' ')
    .trim();
};

// // Normaliza fechas de query a Date o null
const normalizarFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
};

// // Detecta error de columna faltante en PostgreSQL (undefined_column)
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Evalua si una ubicacion esta operativa para inventario
const ubicacionActiva = (estadoUbi) => {
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Evalua si un conteo ya esta cerrado usando estado textual y/o fecha de cierre
const esConteoCerrado = ({ conteo, schemaHeader }) => {
  if (!conteo) return false;
  if (schemaHeader.estado) {
    const estado = String(conteo[schemaHeader.estado] || '').trim().toUpperCase();
    if (['CERRADO', 'CERRADA', 'FINALIZADO', 'FINALIZADA', 'CLOSED', 'CLOSE'].includes(estado)) {
      return true;
    }
  }
  if (schemaHeader.fechaCierre) {
    return Boolean(conteo[schemaHeader.fechaCierre]);
  }
  return false;
};

class InventarioConteosService {
  // // Valida que el usuario autenticado exista en tabla usuarios; si no existe devuelve null
  async normalizarCodUsuario(codUsuario, transaction) {
    if (!Number.isInteger(Number(codUsuario)) || Number(codUsuario) < 1) return null;

    const [fila] = await sequelize.query(`
      SELECT cod_usuario
      FROM usuarios
      WHERE cod_usuario = :codUsuario
      LIMIT 1
    `, {
      replacements: { codUsuario: Number(codUsuario) },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila?.cod_usuario ? Number(fila.cod_usuario) : null;
  }

  // // Garantiza que el schema de conteos exista y sea compatible antes de operar
  async obtenerSchemaConteosCompatible() {
    const schemaConteos = await inventarioConteosSchemaService.obtenerSchemaConteos();
    if (!schemaConteos?.compatible) {
      throw Object.assign(
        new Error('Estructura de conteos fisicos no disponible en BD. Pendiente manual: crear tablas de conteo (encabezado y detalle).'),
        { status: 500, detalle_schema: schemaConteos?.reason || null }
      );
    }
    return schemaConteos;
  }

  // // Lee encabezado de conteo por id con lock opcional para operaciones concurrentes
  async obtenerConteoPorId({ schemaHeader, codConteo, transaction, forUpdate = false }) {
    const [fila] = await sequelize.query(construirSelectConteoPorIdSql({
      schemaHeader,
      forUpdate
    }), {
      replacements: { codConteo },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Lista conteos con filtros y resumen de diferencias para historial recuperable
  async listarConteos(query = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const { page, limit, offset } = resolverPaginacion(query);

    const codConteo = query.cod_conteo ? Number(query.cod_conteo) : null;
    const estado = normalizarTexto(query.estado)?.toUpperCase() || null;
    const codUsuarioApertura = query.cod_usuario_apertura ? Number(query.cod_usuario_apertura) : null;
    const codUsuarioCierre = query.cod_usuario_cierre ? Number(query.cod_usuario_cierre) : null;
    const fechaDesde = normalizarFecha(query.fecha_desde);
    const fechaHasta = normalizarFecha(query.fecha_hasta);

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw Object.assign(new Error('fecha_desde no puede ser mayor que fecha_hasta'), { status: 400 });
    }

    const whereParts = ['1=1'];
    const replacements = {};

    if (codConteo !== null) {
      whereParts.push(`h.${schemaHeader.pk} = :codConteo`);
      replacements.codConteo = codConteo;
    }
    if (estado && schemaHeader.estado) {
      whereParts.push(`UPPER(CAST(h.${schemaHeader.estado} AS TEXT)) = :estado`);
      replacements.estado = estado;
    }
    if (codUsuarioApertura !== null && schemaHeader.codUsuarioApertura) {
      whereParts.push(`h.${schemaHeader.codUsuarioApertura} = :codUsuarioApertura`);
      replacements.codUsuarioApertura = codUsuarioApertura;
    }
    if (codUsuarioCierre !== null && schemaHeader.codUsuarioCierre) {
      whereParts.push(`h.${schemaHeader.codUsuarioCierre} = :codUsuarioCierre`);
      replacements.codUsuarioCierre = codUsuarioCierre;
    }
    if (fechaDesde && schemaHeader.fechaApertura) {
      whereParts.push(`CAST(h.${schemaHeader.fechaApertura} AS DATE) >= :fechaDesde`);
      replacements.fechaDesde = fechaDesde;
    }
    if (fechaHasta && schemaHeader.fechaApertura) {
      whereParts.push(`CAST(h.${schemaHeader.fechaApertura} AS DATE) <= :fechaHasta`);
      replacements.fechaHasta = fechaHasta;
    }

    const whereSql = whereParts.join(' AND ');
    const exprDiferenciaDetalle = schemaDetail.diferencia
      ? `COALESCE(d.${schemaDetail.diferencia}, 0)`
      : (schemaDetail.stockSistema
          ? `(COALESCE(d.${schemaDetail.stockFisico}, 0) - COALESCE(d.${schemaDetail.stockSistema}, 0))`
          : '0');

    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM ${schemaHeader.tableName} h
      WHERE ${whereSql}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const filas = await sequelize.query(`
      SELECT
        h.${schemaHeader.pk} AS cod_conteo,
        ${schemaHeader.estado ? `UPPER(CAST(h.${schemaHeader.estado} AS TEXT))` : "'ABIERTO'::text"} AS estado,
        ${schemaHeader.fechaApertura ? `CAST(h.${schemaHeader.fechaApertura} AS TIMESTAMP)` : 'NULL::timestamp'} AS fecha_apertura,
        ${schemaHeader.fechaCierre ? `CAST(h.${schemaHeader.fechaCierre} AS TIMESTAMP)` : 'NULL::timestamp'} AS fecha_cierre,
        ${schemaHeader.observaciones ? `CAST(h.${schemaHeader.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaHeader.observacionesCierre ? `CAST(h.${schemaHeader.observacionesCierre} AS TEXT)` : 'NULL::text'} AS observaciones_cierre,
        ${schemaHeader.codUsuarioApertura ? `h.${schemaHeader.codUsuarioApertura}` : 'NULL::int'} AS cod_usuario_apertura,
        ${schemaHeader.codUsuarioApertura ? 'ua.nombre_usuario' : 'NULL::text'} AS usuario_apertura,
        ${schemaHeader.codUsuarioCierre ? `h.${schemaHeader.codUsuarioCierre}` : 'NULL::int'} AS cod_usuario_cierre,
        ${schemaHeader.codUsuarioCierre ? 'uc.nombre_usuario' : 'NULL::text'} AS usuario_cierre,
        (
          SELECT COUNT(*)::int
          FROM ${schemaDetail.tableName} d
          WHERE d.${schemaDetail.codConteo} = h.${schemaHeader.pk}
        ) AS total_detalles,
        (
          SELECT COUNT(*)::int
          FROM ${schemaDetail.tableName} d
          WHERE d.${schemaDetail.codConteo} = h.${schemaHeader.pk}
            AND ${exprDiferenciaDetalle} > 0
        ) AS total_diferencias_positivas,
        (
          SELECT COUNT(*)::int
          FROM ${schemaDetail.tableName} d
          WHERE d.${schemaDetail.codConteo} = h.${schemaHeader.pk}
            AND ${exprDiferenciaDetalle} < 0
        ) AS total_diferencias_negativas
      FROM ${schemaHeader.tableName} h
      ${schemaHeader.codUsuarioApertura ? `LEFT JOIN usuarios ua ON ua.cod_usuario = h.${schemaHeader.codUsuarioApertura}` : ''}
      ${schemaHeader.codUsuarioCierre ? `LEFT JOIN usuarios uc ON uc.cod_usuario = h.${schemaHeader.codUsuarioCierre}` : ''}
      WHERE ${whereSql}
      ORDER BY ${schemaHeader.fechaApertura ? `h.${schemaHeader.fechaApertura}` : `h.${schemaHeader.pk}`} DESC, h.${schemaHeader.pk} DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        ...replacements,
        limit,
        offset
      },
      type: sequelize.QueryTypes.SELECT
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
  }

  async exportarReportePdf(query = {}) {
    const resultado = await this.listarConteos({
      ...query,
      page: 1,
      pagina: 1,
      limit: LIMITE_MAXIMO,
      limite: LIMITE_MAXIMO
    });

    const filas = Array.isArray(resultado?.data) ? resultado.data : [];

    return generarReportePdf({
      titulo: 'Reporte de conteos fisicos',
      filtros: [
        { label: 'Conteo', value: query.cod_conteo || 'Todos' },
        { label: 'Estado', value: query.estado || 'Todos' },
        { label: 'Desde', value: query.fecha_desde || 'Todos' },
        { label: 'Hasta', value: query.fecha_hasta || 'Todos' }
      ],
      metricas: [
        { label: 'Total filtrado', value: resultado?.total || filas.length },
        { label: 'Registros exportados', value: filas.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 24, align: 'center' },
        { header: 'Conteo', key: 'codConteo', width: 46, align: 'center' },
        { header: 'Estado', key: 'estado', width: 60 },
        { header: 'Apertura', key: 'fechaApertura', width: 86 },
        { header: 'Cierre', key: 'fechaCierre', width: 86 },
        { header: 'Abierto por', key: 'usuarioApertura', width: 70 },
        { header: 'Cerrado por', key: 'usuarioCierre', width: 70 },
        { header: 'Detalles', key: 'totalDetalles', width: 45, align: 'right' },
        { header: 'Dif. +', key: 'positivas', width: 38, align: 'right' },
        { header: 'Dif. -', key: 'negativas', width: 38, align: 'right' },
        { header: 'Observaciones', key: 'observaciones', width: 157 }
      ],
      filas: filas.map((fila, index) => ({
        numero: index + 1,
        codConteo: fila.cod_conteo,
        estado: fila.estado,
        fechaApertura: fila.fecha_apertura ? new Date(fila.fecha_apertura).toLocaleString('es-HN') : '-',
        fechaCierre: fila.fecha_cierre ? new Date(fila.fecha_cierre).toLocaleString('es-HN') : '-',
        usuarioApertura: fila.usuario_apertura || '-',
        usuarioCierre: fila.usuario_cierre || '-',
        totalDetalles: Number(fila.total_detalles || 0),
        positivas: Number(fila.total_diferencias_positivas || 0),
        negativas: Number(fila.total_diferencias_negativas || 0),
        observaciones: formatearTextoPdfMultilinea(fila.observaciones || fila.observaciones_cierre || '-')
      }))
    });
  }

  // // Lista detalle persistido de un conteo para recuperar historial completo
  async listarDetallesConteo(codConteo, query = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const { page, limit, offset } = resolverPaginacion(query);

    const conteo = await this.obtenerConteoPorId({
      schemaHeader,
      codConteo,
      transaction: undefined,
      forUpdate: false
    });
    if (!conteo) {
      throw Object.assign(new Error('Conteo no encontrado'), { status: 404 });
    }

    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM ${schemaDetail.tableName} d
      WHERE d.${schemaDetail.codConteo} = :codConteo
    `, {
      replacements: { codConteo },
      type: sequelize.QueryTypes.SELECT
    });

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const exprDiferencia = schemaDetail.diferencia
      ? `COALESCE(d.${schemaDetail.diferencia}, 0)`
      : (schemaDetail.stockSistema
          ? `(COALESCE(d.${schemaDetail.stockFisico}, 0) - COALESCE(d.${schemaDetail.stockSistema}, 0))`
          : '0');

    const filas = await sequelize.query(`
      SELECT
        ${schemaDetail.pk ? `d.${schemaDetail.pk}` : 'NULL::int'} AS cod_conteo_detalle,
        d.${schemaDetail.codConteo} AS cod_conteo,
        ${schemaDetail.codInventario ? `d.${schemaDetail.codInventario}` : 'NULL::int'} AS cod_inventario,
        d.${schemaDetail.codProducto} AS cod_producto,
        p.nombre_producto,
        d.${schemaDetail.codUbicacion} AS cod_ubicacion,
        COALESCE(
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT)
        ) AS ubicacion,
        ${schemaDetail.stockSistema ? `COALESCE(d.${schemaDetail.stockSistema}, 0)` : '0'} AS stock_sistema,
        COALESCE(d.${schemaDetail.stockFisico}, 0) AS stock_fisico,
        ${exprDiferencia} AS diferencia,
        ${schemaDetail.observaciones ? `CAST(d.${schemaDetail.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaDetail.fechaRegistro ? `CAST(d.${schemaDetail.fechaRegistro} AS TIMESTAMP)` : 'NULL::timestamp'} AS fecha_registro,
        COALESCE(i.stock, 0) AS stock_actual
      FROM ${schemaDetail.tableName} d
      LEFT JOIN producto p ON p.cod_producto = d.${schemaDetail.codProducto}
      LEFT JOIN ubicacion u ON u.cod_ubicacion = d.${schemaDetail.codUbicacion}
      LEFT JOIN inventario i ON i.cod_inventario = ${schemaDetail.codInventario ? `d.${schemaDetail.codInventario}` : 'NULL'}
      WHERE d.${schemaDetail.codConteo} = :codConteo
      ORDER BY ${schemaDetail.pk ? `d.${schemaDetail.pk}` : `d.${schemaDetail.codConteo}`} ASC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        codConteo,
        limit,
        offset
      },
      type: sequelize.QueryTypes.SELECT
    });

    return {
      conteo: {
        cod_conteo: conteo[schemaHeader.pk],
        estado: schemaHeader.estado ? conteo[schemaHeader.estado] : 'ABIERTO',
        fecha_apertura: schemaHeader.fechaApertura ? conteo[schemaHeader.fechaApertura] : null,
        fecha_cierre: schemaHeader.fechaCierre ? conteo[schemaHeader.fechaCierre] : null,
        observaciones: schemaHeader.observaciones ? conteo[schemaHeader.observaciones] : null,
        observaciones_cierre: schemaHeader.observacionesCierre ? conteo[schemaHeader.observacionesCierre] : null
      },
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
  }

  // // Obtiene inventario por producto+ubicacion con fallback cuando stock_reservado no existe
  async obtenerInventarioPorProductoUbicacion({ codProducto, codUbicacion, transaction, forUpdate = false }) {
    try {
      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: true,
        forUpdate
      }), {
        replacements: { codProducto, codUbicacion },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventario: fila || null,
        usaStockReservado: true
      };
    } catch (error) {
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: false,
        forUpdate
      }), {
        replacements: { codProducto, codUbicacion },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventario: fila || null,
        usaStockReservado: false
      };
    }
  }

  // // Obtiene inventario por id con lock opcional durante cierre de conteo
  async obtenerInventarioPorId({ codInventario, usaStockReservado, transaction, forUpdate = false }) {
    const [fila] = await sequelize.query(obtenerSelectInventarioPorId({
      usarStockReservado: usaStockReservado,
      forUpdate
    }), {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Inserta movimiento de ajuste en kardex (AJUSTE+ o AJUSTE- codificado en motivo)
  async insertarMovimientoAjuste({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    tipoAjuste,
    codConteo,
    observaciones,
    transaction
  }) {
    const motivo = `CONTEO_FISICO_${tipoAjuste}`;
    const referencia = `CONTEO-${codConteo}`;
    const { sql, replacements } = construirInsertMovimientoAjusteSql({
      schemaMovimiento,
      codInventario,
      codProducto,
      codUbicacion,
      codUsuario,
      cantidad,
      motivo,
      referencia,
      observaciones,
      refTipo: 'CONTEO_INVENTARIO',
      refId: codConteo
    });

    const [filas] = await sequelize.query(sql, {
      replacements,
      transaction
    });

    const movimiento = Array.isArray(filas) ? filas[0] : null;
    return movimiento || null;
  }

  // // Abre encabezado de conteo fisico en estado inicial ABIERTO
  async abrirConteo(payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader } = schemaConteos;
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';
    const codUsuarioAuth = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const codUsuario = await this.normalizarCodUsuario(codUsuarioAuth, t);

      // // Construimos INSERT dinamico de encabezado segun columnas reales detectadas
      const { sql, replacements } = construirInsertConteoSql({
        schemaHeader,
        codUsuario,
        observaciones
      });

      // // Si no hay columnas insertables, el schema no permite apertura programatica
      if (!sql.includes('(') || !sql.includes('VALUES')) {
        throw Object.assign(new Error('Schema de encabezado de conteo no soporta apertura automatica'), { status: 500 });
      }

      const [filas] = await sequelize.query(sql, {
        replacements,
        transaction: t
      });

      const conteoRow = Array.isArray(filas) ? filas[0] : null;
      const codConteo = schemaHeader.pk ? Number(conteoRow?.[schemaHeader.pk]) : null;
      if (!codConteo) {
        throw Object.assign(new Error('No fue posible identificar el conteo creado'), { status: 500 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo: conteoRow,
        resumen: {
          cod_conteo: codConteo,
          estado: schemaHeader.estado ? (conteoRow?.[schemaHeader.estado] ?? 'ABIERTO') : 'ABIERTO'
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Captura (o actualiza) detalle fisico por producto+ubicacion en un conteo abierto
  async registrarDetalleConteo(codConteo, payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const stockFisico = Number(payload.stock_fisico);
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    // // Defensa en profundidad para evitar entradas invalidas fuera del validator
    if (!Number.isInteger(stockFisico) || stockFisico < 0) {
      throw Object.assign(new Error('stock_fisico debe ser numerico entero mayor o igual a 0'), { status: 400 });
    }

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Bloqueamos encabezado para impedir captura simultanea contra cierre concurrente
      const conteo = await this.obtenerConteoPorId({
        schemaHeader,
        codConteo,
        transaction: t,
        forUpdate: true
      });
      if (!conteo) {
        throw Object.assign(new Error('Conteo no encontrado'), { status: 404 });
      }
      if (esConteoCerrado({ conteo, schemaHeader })) {
        throw Object.assign(new Error('No se puede capturar detalle en un conteo cerrado'), { status: 409 });
      }

      // // Validamos existencia de producto y ubicacion para evitar detalles huerfanos
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para conteo fisico'), { status: 400 });
      }

      // // Tomamos snapshot de stock sistema actual de inventario para calcular diferencia inicial
      const inventarioLookup = await this.obtenerInventarioPorProductoUbicacion({
        codProducto,
        codUbicacion,
        transaction: t,
        forUpdate: false
      });
      const inventario = inventarioLookup.inventario;
      if (!inventario) {
        throw Object.assign(new Error('Inventario no encontrado para producto y ubicacion indicados'), { status: 404 });
      }

      const codInventario = Number(inventario.cod_inventario);
      const stockSistema = Number(inventario.stock || 0);
      const diferencia = stockFisico - stockSistema;

      // // Buscamos si ya existe detalle para actualizarlo en lugar de duplicar
      const [detalleExistente] = await sequelize.query(construirSelectDetalleExistenteSql({ schemaDetail }), {
        replacements: {
          codConteo,
          codProducto,
          codUbicacion
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });

      let detalleRow = null;
      let accion = 'insertado';

      if (detalleExistente) {
        // // Regla adoptada: duplicado se resuelve como UPDATE del mismo detalle
        if (!schemaDetail.pk) {
          throw Object.assign(
            new Error('No se puede actualizar detalle duplicado porque la tabla no expone PK de detalle'),
            { status: 409 }
          );
        }

        const pkDetalle = detalleExistente[schemaDetail.pk];
        const { sql, replacements } = construirUpdateDetalleConteoSql({
          schemaDetail,
          pkDetalle,
          codInventario,
          stockSistema,
          stockFisico,
          diferencia,
          observaciones
        });

        const [filas] = await sequelize.query(sql, {
          replacements,
          transaction: t
        });

        detalleRow = Array.isArray(filas) ? filas[0] : null;
        accion = 'actualizado';
      } else {
        const { sql, replacements } = construirInsertDetalleConteoSql({
          schemaDetail,
          codConteo,
          codProducto,
          codUbicacion,
          codInventario,
          stockSistema,
          stockFisico,
          diferencia,
          observaciones
        });

        const [filas] = await sequelize.query(sql, {
          replacements,
          transaction: t
        });

        detalleRow = Array.isArray(filas) ? filas[0] : null;
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo,
        detalle: detalleRow,
        resumen: {
          accion,
          cod_conteo: codConteo,
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          stock_sistema: stockSistema,
          stock_fisico: stockFisico,
          diferencia
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Cierra conteo: aplica ajustes, actualiza inventario y marca estado final en una sola transaccion
  async cerrarConteo(codConteo, payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const codUsuarioAuth = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const observacionesCierre = payload?.observaciones_cierre ? String(payload.observaciones_cierre).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const codUsuario = await this.normalizarCodUsuario(codUsuarioAuth, t);

      // // Bloqueamos conteo objetivo para evitar doble cierre concurrente
      const conteo = await this.obtenerConteoPorId({
        schemaHeader,
        codConteo,
        transaction: t,
        forUpdate: true
      });
      if (!conteo) {
        throw Object.assign(new Error('Conteo no encontrado'), { status: 404 });
      }
      if (esConteoCerrado({ conteo, schemaHeader })) {
        throw Object.assign(new Error('El conteo ya se encuentra cerrado'), { status: 409 });
      }

      // // Bloqueamos todo el detalle del conteo para cierre atomico y consistente
      const detalles = await sequelize.query(construirSelectDetallesConteoSql({
        schemaDetail,
        forUpdate: true
      }), {
        replacements: { codConteo },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw Object.assign(new Error('No se puede cerrar un conteo sin detalles'), { status: 409 });
      }

      // // Detectamos soporte de stock_reservado para consultas de inventario por id
      let usaStockReservado = true;
      try {
        await sequelize.query(obtenerSelectInventarioPorId({
          usarStockReservado: true,
          forUpdate: false
        }), {
          replacements: { codInventario: -1 },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        });
      } catch (error) {
        if (esErrorColumnaNoExiste(error, 'stock_reservado')) {
          usaStockReservado = false;
        } else if (error?.status) {
          throw error;
        } else if (!String(error?.message || '').toLowerCase().includes('does not exist')) {
          // // Cualquier error distinto a columna faltante debe propagarse
          throw error;
        }
      }

      const movimientos = [];
      let ajustesPositivos = 0;
      let ajustesNegativos = 0;
      let ajustesSinCambio = 0;

      // // Recorremos detalle y aplicamos ajustes definitivos contra stock actual en BD
      for (const detalle of detalles) {
        const codProducto = Number(detalle[schemaDetail.codProducto]);
        const codUbicacion = Number(detalle[schemaDetail.codUbicacion]);
        const stockFisico = Number(detalle[schemaDetail.stockFisico]);
        if (!Number.isFinite(stockFisico) || stockFisico < 0) {
          throw Object.assign(new Error('Detalle con stock_fisico invalido en conteo'), { status: 400 });
        }

        // // Resolucion de inventario por cod_inventario (si existe en detalle) o por producto+ubicacion
        let inventario = null;
        const codInventarioDetalle = schemaDetail.codInventario ? Number(detalle[schemaDetail.codInventario]) : null;
        if (codInventarioDetalle) {
          inventario = await this.obtenerInventarioPorId({
            codInventario: codInventarioDetalle,
            usaStockReservado,
            transaction: t,
            forUpdate: true
          });
        }
        if (!inventario) {
          const inventarioLookup = await this.obtenerInventarioPorProductoUbicacion({
            codProducto,
            codUbicacion,
            transaction: t,
            forUpdate: true
          });
          inventario = inventarioLookup.inventario;
        }
        if (!inventario) {
          throw Object.assign(
            new Error(`Inventario no encontrado para producto ${codProducto} en ubicacion ${codUbicacion}`),
            { status: 404 }
          );
        }

        const codInventario = Number(inventario.cod_inventario);
        const stockSistemaActual = Number(inventario.stock || 0);
        const diferenciaFinal = stockFisico - stockSistemaActual;

        // // Cuando no hay diferencia final, solo contamos como sin cambio y continuamos
        if (diferenciaFinal === 0) {
          ajustesSinCambio += 1;
        } else {
          const stockResultado = stockSistemaActual + diferenciaFinal;
          if (stockResultado < 0) {
            throw Object.assign(
              new Error(`Ajuste invalido en inventario ${codInventario}: stock resultante negativo`),
              { status: 409 }
            );
          }

          // // Actualizamos stock al conteo fisico final dentro de la misma transaccion
          const [filasInventarioActualizado] = await sequelize.query(obtenerUpdateInventarioAStockFisico(), {
            replacements: {
              codInventario,
              stockFisico
            },
            transaction: t
          });
          const inventarioActualizado = Array.isArray(filasInventarioActualizado)
            ? filasInventarioActualizado[0]
            : null;
          if (!inventarioActualizado) {
            throw Object.assign(
              new Error(`No fue posible actualizar inventario ${codInventario} durante cierre de conteo`),
              { status: 409 }
            );
          }

          const tipoAjuste = diferenciaFinal > 0 ? 'AJUSTE+' : 'AJUSTE-';
          const cantidadMovimiento = Math.abs(diferenciaFinal);

          // // Movimiento AJUSTE trazable al conteo fisico cerrado
          const movimiento = await this.insertarMovimientoAjuste({
            schemaMovimiento,
            codInventario,
            codProducto,
            codUbicacion,
            codUsuario,
            cantidad: cantidadMovimiento,
            tipoAjuste,
            codConteo,
            observaciones: observacionesCierre || null,
            transaction: t
          });

          movimientos.push({
            cod_movimiento: schemaMovimiento.pk ? (movimiento?.[schemaMovimiento.pk] ?? null) : null,
            cod_inventario: codInventario,
            cod_producto: codProducto,
            cod_ubicacion: codUbicacion,
            tipo_ajuste: tipoAjuste,
            cantidad: cantidadMovimiento,
            stock_sistema_antes: stockSistemaActual,
            stock_fisico: stockFisico,
            stock_resultante: stockResultado
          });

          if (diferenciaFinal > 0) ajustesPositivos += 1;
          if (diferenciaFinal < 0) ajustesNegativos += 1;
        }

        // // Si existen columnas de stock_sistema/diferencia las actualizamos al cierre definitivo
        if (schemaDetail.pk && (schemaDetail.stockSistema || schemaDetail.diferencia)) {
          const pkDetalle = detalle[schemaDetail.pk];
          const { sql, replacements } = construirUpdateDetalleConteoSql({
            schemaDetail,
            pkDetalle,
            codInventario,
            stockSistema: stockSistemaActual,
            stockFisico,
            diferencia: diferenciaFinal,
            observaciones: schemaDetail.observaciones ? detalle[schemaDetail.observaciones] : null
          });

          await sequelize.query(sql, {
            replacements,
            transaction: t
          });
        }
      }

      // // Cambiamos estado de encabezado a cerrado dentro de la misma transaccion del cierre
      if (!schemaHeader.estado && !schemaHeader.fechaCierre) {
        throw Object.assign(
          new Error('El encabezado de conteo no tiene columna de estado ni fecha_cierre para marcar cierre'),
          { status: 500 }
        );
      }

      const sqlCerrar = construirUpdateCerrarConteoSql({ schemaHeader });
      const [filasCierre] = await sequelize.query(sqlCerrar, {
        replacements: {
          codConteo,
          codUsuarioCierre: codUsuario,
          observacionesCierre: observacionesCierre || null,
          anexoCierre: observacionesCierre ? ` | CIERRE: ${observacionesCierre}` : ' | CIERRE'
        },
        transaction: t
      });
      const conteoCerrado = Array.isArray(filasCierre) ? filasCierre[0] : null;
      if (!conteoCerrado) {
        throw Object.assign(new Error('No fue posible marcar el conteo como cerrado'), { status: 409 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo: conteoCerrado,
        movimientos,
        resumen: {
          cod_conteo: codConteo,
          total_detalles: detalles.length,
          ajustes_positivos: ajustesPositivos,
          ajustes_negativos: ajustesNegativos,
          detalles_sin_cambio: ajustesSinCambio,
          total_movimientos_generados: movimientos.length
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }
}

export default new InventarioConteosService();

