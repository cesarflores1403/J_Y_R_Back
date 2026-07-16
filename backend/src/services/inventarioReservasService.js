import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import inventarioReservasSchemaService from './inventarioReservasSchemaService.js';
import { generarReportePdf } from '../utils/pdfReport.js';
import {
  obtenerSelectInventarioPorProductoUbicacion,
  obtenerSelectInventarioPorId,
  obtenerUpdateReservarStockSeguro,
  obtenerUpdateLiberarReservaStock,
  obtenerUpdateConsumirReservaStock,
  construirInsertReservaSql,
  construirSelectReservaPorIdSql,
  construirUpdateReservaLiberadaSql,
  construirUpdateReservaConsumidaSql,
  construirInsertMovimientoConsumoReservaSql
} from './inventarioReservasQueries.js';

// // Defaults de paginacion para listados del submodulo Reservas
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

// // Normaliza texto de filtros opcionales
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

// // Normaliza fechas de query a Date o null
const normalizarFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
};

const formatearFechaPdf = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-HN');
};

const formatearUbicacionPdf = (valor = '') => {
  const texto = String(valor || '').trim();
  if (!texto) return '-';
  const partes = texto.split('-').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length !== 4) return texto;
  const [pasillo, estanteria, nivel1, nivel2] = partes;
  return `P:${pasillo} E:${estanteria} N1:${nivel1} N2:${nivel2}`;
};

// // Detecta error de columna no existente (undefined_column) en PostgreSQL
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Determina si la ubicacion se considera activa en reglas actuales del proyecto
const ubicacionActiva = (estadoUbi) => {
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Determina si la reserva esta en estado final no operable
const estadoReservaNormalizado = (reserva, schemaReserva) => {
  if (!reserva || !schemaReserva?.estado) return '';
  return String(reserva[schemaReserva.estado] || '').trim().toUpperCase();
};

class InventarioReservasService {
  // // Si el usuario autenticado no existe en tabla usuarios, retorna null para evitar FK invalida
  async normalizarCodUsuario(codUsuario, transaction) {
    if (!Number.isInteger(codUsuario) || codUsuario <= 0) return null;

    const [fila] = await sequelize.query(`
      SELECT cod_usuario
      FROM usuarios
      WHERE cod_usuario = :codUsuario
      LIMIT 1
    `, {
      replacements: { codUsuario },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila?.cod_usuario ? Number(fila.cod_usuario) : null;
  }

  // // Valida si hay estructura compatible de reservas para operar endpoints de esta HU
  async obtenerSchemaReservasCompatible() {
    const schemaReserva = await inventarioReservasSchemaService.obtenerSchemaReservas();
    if (!schemaReserva?.compatible) {
      throw Object.assign(
        new Error('Estructura de reservas no disponible en BD. Pendiente manual: crear tabla de reservas de inventario.'),
        { status: 500, detalle_schema: schemaReserva?.reason || null }
      );
    }
    return schemaReserva;
  }

  // // Lee inventario por producto+ubicacion con lock y valida presencia de stock_reservado
  async obtenerInventarioConStockReservado({ codProducto, codUbicacion, transaction, forUpdate = false }) {
    try {
      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: true,
        forUpdate
      }), {
        replacements: { codProducto, codUbicacion },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return fila || null;
    } catch (error) {
      // // Para reservas no hay fallback seguro: stock_reservado es obligatorio funcionalmente
      if (esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw Object.assign(
          new Error('La columna stock_reservado no existe en inventario. Pendiente manual: agregar columna para habilitar reservas.'),
          { status: 500 }
        );
      }
      throw error;
    }
  }

  // // Lee inventario por id con lock y valida presencia de stock_reservado
  async obtenerInventarioPorIdConStockReservado({ codInventario, transaction, forUpdate = false }) {
    try {
      const [fila] = await sequelize.query(obtenerSelectInventarioPorId({
        usarStockReservado: true,
        forUpdate
      }), {
        replacements: { codInventario },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return fila || null;
    } catch (error) {
      if (esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw Object.assign(
          new Error('La columna stock_reservado no existe en inventario. Pendiente manual: agregar columna para habilitar reservas.'),
          { status: 500 }
        );
      }
      throw error;
    }
  }

  // // Lee reserva por id con lock para evitar doble procesamiento concurrente
  async obtenerReservaPorId({ schemaReserva, codReserva, transaction, forUpdate = false }) {
    const [fila] = await sequelize.query(construirSelectReservaPorIdSql({
      schemaReserva,
      forUpdate
    }), {
      replacements: { codReserva },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Lista reservas persistidas con filtros de estado/producto/ubicacion y paginacion
  async listarReservas(query = {}) {
    const schemaReserva = await this.obtenerSchemaReservasCompatible();
    const { page, limit, offset } = resolverPaginacion(query);

    const codReserva = query.cod_reserva ? Number(query.cod_reserva) : null;
    const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
    const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
    const estadoSolicitado = normalizarTexto(query.estado)?.toUpperCase() || null;
    const estado = (estadoSolicitado && !['TODAS', 'TODOS'].includes(estadoSolicitado))
      ? estadoSolicitado
      : null;
    const referencia = normalizarTexto(query.referencia);
    const fechaDesde = normalizarFecha(query.fecha_desde);
    const fechaHasta = normalizarFecha(query.fecha_hasta);

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw Object.assign(new Error('fecha_desde no puede ser mayor que fecha_hasta'), { status: 400 });
    }

    const exprCodProducto = schemaReserva.codProducto
      ? `r.${schemaReserva.codProducto}`
      : (schemaReserva.codInventario ? 'inv.cod_producto' : 'NULL::int');
    const exprCodUbicacion = schemaReserva.codUbicacion
      ? `r.${schemaReserva.codUbicacion}`
      : (schemaReserva.codInventario ? 'inv.cod_ubicacion' : 'NULL::int');
    const exprCodInventario = schemaReserva.codInventario
      ? `r.${schemaReserva.codInventario}`
      : 'NULL::int';
    const exprFechaCreacion = schemaReserva.fechaCreacion
      ? `r.${schemaReserva.fechaCreacion}`
      : 'NULL::timestamp';

    const whereParts = ['1=1'];
    const replacements = {};

    if (codReserva !== null) {
      whereParts.push(`r.${schemaReserva.pk} = :codReserva`);
      replacements.codReserva = codReserva;
    }
    if (codProducto !== null) {
      whereParts.push(`${exprCodProducto} = :codProducto`);
      replacements.codProducto = codProducto;
    }
    if (codUbicacion !== null) {
      whereParts.push(`${exprCodUbicacion} = :codUbicacion`);
      replacements.codUbicacion = codUbicacion;
    }
    if (estado && schemaReserva.estado) {
      whereParts.push(`UPPER(CAST(r.${schemaReserva.estado} AS TEXT)) = :estado`);
      replacements.estado = estado;
    }
    if (referencia && schemaReserva.referencia) {
      whereParts.push(`CAST(r.${schemaReserva.referencia} AS TEXT) ILIKE :referencia`);
      replacements.referencia = `%${referencia}%`;
    }
    if (fechaDesde && schemaReserva.fechaCreacion) {
      whereParts.push(`CAST(r.${schemaReserva.fechaCreacion} AS DATE) >= :fechaDesde`);
      replacements.fechaDesde = fechaDesde;
    }
    if (fechaHasta && schemaReserva.fechaCreacion) {
      whereParts.push(`CAST(r.${schemaReserva.fechaCreacion} AS DATE) <= :fechaHasta`);
      replacements.fechaHasta = fechaHasta;
    }

    const whereSql = whereParts.join(' AND ');
    const joinInventario = schemaReserva.codInventario
      ? `LEFT JOIN inventario inv ON inv.cod_inventario = r.${schemaReserva.codInventario}`
      : '';

    const joinUsuarioCreacion = schemaReserva.codUsuarioCreacion
      ? `LEFT JOIN usuarios uc ON uc.cod_usuario = r.${schemaReserva.codUsuarioCreacion}`
      : '';
    const joinUsuarioLiberacion = schemaReserva.codUsuarioLiberacion
      ? `LEFT JOIN usuarios ul ON ul.cod_usuario = r.${schemaReserva.codUsuarioLiberacion}`
      : '';
    const joinUsuarioConsumo = schemaReserva.codUsuarioConsumo
      ? `LEFT JOIN usuarios us ON us.cod_usuario = r.${schemaReserva.codUsuarioConsumo}`
      : '';

    const selectBase = `
      FROM ${schemaReserva.tableName} r
      ${joinInventario}
      LEFT JOIN producto p ON p.cod_producto = ${exprCodProducto}
      LEFT JOIN ubicacion u ON u.cod_ubicacion = ${exprCodUbicacion}
      ${joinUsuarioCreacion}
      ${joinUsuarioLiberacion}
      ${joinUsuarioConsumo}
      WHERE ${whereSql}
    `;

    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      ${selectBase}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const filas = await sequelize.query(`
      SELECT
        r.${schemaReserva.pk} AS cod_reserva,
        ${exprCodInventario} AS cod_inventario,
        ${exprCodProducto} AS cod_producto,
        p.nombre_producto,
        ${exprCodUbicacion} AS cod_ubicacion,
        COALESCE(
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          NULLIF(u.codigo_producto, ''),
          CAST(u.cod_ubicacion AS TEXT)
        ) AS ubicacion,
        r.${schemaReserva.cantidad} AS cantidad,
        ${schemaReserva.estado ? `UPPER(CAST(r.${schemaReserva.estado} AS TEXT))` : "'ACTIVA'::text"} AS estado,
        CAST(${exprFechaCreacion} AS TIMESTAMP) AS fecha_creacion,
        ${schemaReserva.fechaLiberacion ? `CAST(r.${schemaReserva.fechaLiberacion} AS TIMESTAMP)` : 'NULL::timestamp'} AS fecha_liberacion,
        ${schemaReserva.fechaConsumo ? `CAST(r.${schemaReserva.fechaConsumo} AS TIMESTAMP)` : 'NULL::timestamp'} AS fecha_consumo,
        ${schemaReserva.referencia ? `CAST(r.${schemaReserva.referencia} AS TEXT)` : 'NULL::text'} AS referencia,
        ${schemaReserva.observaciones ? `CAST(r.${schemaReserva.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaReserva.motivoLiberacion ? `CAST(r.${schemaReserva.motivoLiberacion} AS TEXT)` : 'NULL::text'} AS motivo_liberacion,
        ${schemaReserva.codUsuarioCreacion ? `r.${schemaReserva.codUsuarioCreacion}` : 'NULL::int'} AS cod_usuario_creacion,
        ${schemaReserva.codUsuarioCreacion ? 'uc.nombre_usuario' : 'NULL::text'} AS usuario_creacion,
        ${schemaReserva.codUsuarioLiberacion ? `r.${schemaReserva.codUsuarioLiberacion}` : 'NULL::int'} AS cod_usuario_liberacion,
        ${schemaReserva.codUsuarioLiberacion ? 'ul.nombre_usuario' : 'NULL::text'} AS usuario_liberacion,
        ${schemaReserva.codUsuarioConsumo ? `r.${schemaReserva.codUsuarioConsumo}` : 'NULL::int'} AS cod_usuario_consumo,
        ${schemaReserva.codUsuarioConsumo ? 'us.nombre_usuario' : 'NULL::text'} AS usuario_consumo
      ${selectBase}
      ORDER BY ${schemaReserva.fechaCreacion ? `r.${schemaReserva.fechaCreacion}` : `r.${schemaReserva.pk}`} DESC, r.${schemaReserva.pk} DESC
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
    const resultado = await this.listarReservas({
      ...query,
      page: 1,
      pagina: 1,
      limit: LIMITE_MAXIMO,
      limite: LIMITE_MAXIMO
    });

    const filas = Array.isArray(resultado?.data) ? resultado.data : [];

    return generarReportePdf({
      titulo: 'Reporte de reservas',
      filtros: [
        { label: 'Producto', value: query.cod_producto || 'Todos' },
        { label: 'Ubicacion', value: query.cod_ubicacion || 'Todas' },
        { label: 'Estado', value: query.estado || 'TODAS' },
        { label: 'Referencia', value: query.referencia || 'Todas' },
        { label: 'Desde', value: query.fecha_desde || 'Todos' },
        { label: 'Hasta', value: query.fecha_hasta || 'Todos' }
      ],
      metricas: [
        { label: 'Total filtrado', value: resultado?.total || filas.length },
        { label: 'Registros exportados', value: filas.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 26, align: 'center' },
        { header: 'Reserva', key: 'codReserva', width: 52, align: 'center' },
        { header: 'Fecha', key: 'fecha', width: 90 },
        { header: 'Producto', key: 'producto', width: 120 },
        { header: 'Ubicacion', key: 'ubicacion', width: 100 },
        { header: 'Cant.', key: 'cantidad', width: 42, align: 'right' },
        { header: 'Estado', key: 'estado', width: 70 },
        { header: 'Referencia', key: 'referencia', width: 100 },
        { header: 'Usuario', key: 'usuario', width: 70 },
        { header: 'Observaciones', key: 'observaciones', width: 50 }
      ],
      filas: filas.map((fila, index) => ({
        numero: index + 1,
        codReserva: fila.cod_reserva,
        fecha: formatearFechaPdf(fila.fecha_creacion),
        producto: `${fila.nombre_producto || '-'} (${fila.cod_producto ?? '-'})`,
        ubicacion: `${formatearUbicacionPdf(fila.ubicacion)} (${fila.cod_ubicacion ?? '-'})`,
        cantidad: Number(fila.cantidad || 0).toLocaleString('es-HN'),
        estado: fila.estado || '-',
        referencia: fila.referencia || '-',
        usuario: fila.usuario_creacion || '-',
        observaciones: fila.observaciones || fila.motivo_liberacion || '-'
      }))
    });
  }

  // // Crea reserva valida incrementando stock_reservado sin tocar stock total
  async crearReserva(payload, options = {}) {
    const schemaReserva = await this.obtenerSchemaReservasCompatible();
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const cantidad = Number(payload.cantidad);
    const referencia = payload?.referencia ? String(payload.referencia).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';
    const codUsuarioAuth = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Defensa en profundidad del service por seguridad
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const codUsuario = await this.normalizarCodUsuario(codUsuarioAuth, t);

      // // Validamos existencia y estado de producto/ubicacion
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      if (producto.estado_producto !== 'Activo') {
        throw Object.assign(new Error('El producto no esta activo para reservas'), { status: 400 });
      }

      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para reservas'), { status: 400 });
      }

      // // Leemos inventario con lock para calcular disponibilidad real en la transaccion
      const inventario = await this.obtenerInventarioConStockReservado({
        codProducto,
        codUbicacion,
        transaction: t,
        forUpdate: true
      });
      if (!inventario) {
        throw Object.assign(new Error('Inventario no encontrado para producto y ubicacion indicados'), { status: 404 });
      }

      const codInventario = Number(inventario.cod_inventario);
      const stock = Number(inventario.stock || 0);
      const stockReservado = Number(inventario.stock_reservado || 0);
      const stockDisponible = stock - stockReservado;

      // // No permitir sobre-reserva por encima de disponibilidad real
      if (stockDisponible < cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente para reserva. Disponible: ${stockDisponible}, solicitado: ${cantidad}`),
          { status: 409 }
        );
      }

      // // Incremento seguro de stock_reservado con guardia en SQL para concurrencia
      const [filasInventarioReservado] = await sequelize.query(obtenerUpdateReservarStockSeguro(), {
        replacements: {
          codInventario,
          cantidad
        },
        transaction: t
      });
      const inventarioReservado = Array.isArray(filasInventarioReservado) ? filasInventarioReservado[0] : null;
      if (!inventarioReservado) {
        throw Object.assign(new Error('Conflicto de concurrencia al reservar stock. Intente nuevamente'), { status: 409 });
      }

      // // Insercion de reserva en estado ACTIVA
      const { sql, replacements } = construirInsertReservaSql({
        schemaReserva,
        codInventario,
        codProducto,
        codUbicacion,
        cantidad,
        codUsuario,
        referencia,
        observaciones
      });
      const [filasReserva] = await sequelize.query(sql, {
        replacements,
        transaction: t
      });
      const reserva = Array.isArray(filasReserva) ? filasReserva[0] : null;
      const codReserva = schemaReserva.pk ? Number(reserva?.[schemaReserva.pk]) : null;
      if (!reserva || !codReserva) {
        throw Object.assign(new Error('No fue posible registrar la reserva de inventario'), { status: 500 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        reserva,
        inventario: inventarioReservado,
        resumen: {
          cod_reserva: codReserva,
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          cantidad,
          stock_antes: stock,
          stock_reservado_antes: stockReservado,
          stock_disponible_antes: stockDisponible,
          stock_reservado_despues: Number(inventarioReservado.stock_reservado || (stockReservado + cantidad)),
          stock_disponible_despues: Number(inventarioReservado.stock || stock) - Number(inventarioReservado.stock_reservado || (stockReservado + cantidad))
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Libera reserva activa disminuyendo solo stock_reservado y actualizando estado final
  async liberarReserva(codReserva, payload, options = {}) {
    const schemaReserva = await this.obtenerSchemaReservasCompatible();
    const codUsuarioAuth = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const motivo = payload?.motivo ? String(payload.motivo).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const codUsuario = await this.normalizarCodUsuario(codUsuarioAuth, t);

      // // Bloqueamos reserva para validar estado y evitar doble liberacion/consumo concurrente
      const reserva = await this.obtenerReservaPorId({
        schemaReserva,
        codReserva,
        transaction: t,
        forUpdate: true
      });
      if (!reserva) {
        throw Object.assign(new Error('Reserva no encontrada'), { status: 404 });
      }

      const estadoActual = estadoReservaNormalizado(reserva, schemaReserva);
      if (estadoActual === 'LIBERADA') {
        throw Object.assign(new Error('La reserva ya fue liberada'), { status: 409 });
      }
      if (estadoActual === 'CONSUMIDA') {
        throw Object.assign(new Error('La reserva ya fue consumida y no puede liberarse'), { status: 409 });
      }
      if (estadoActual && estadoActual !== 'ACTIVA') {
        throw Object.assign(new Error(`Estado de reserva no valido para liberar: ${estadoActual}`), { status: 409 });
      }

      const cantidad = Number(reserva[schemaReserva.cantidad] || 0);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw Object.assign(new Error('La reserva tiene una cantidad invalida'), { status: 409 });
      }

      // // Resolucion de inventario asociado para decrementar stock_reservado
      let inventario = null;
      if (schemaReserva.codInventario && reserva[schemaReserva.codInventario]) {
        inventario = await this.obtenerInventarioPorIdConStockReservado({
          codInventario: Number(reserva[schemaReserva.codInventario]),
          transaction: t,
          forUpdate: true
        });
      } else {
        inventario = await this.obtenerInventarioConStockReservado({
          codProducto: Number(reserva[schemaReserva.codProducto]),
          codUbicacion: Number(reserva[schemaReserva.codUbicacion]),
          transaction: t,
          forUpdate: true
        });
      }
      if (!inventario) {
        throw Object.assign(new Error('Inventario asociado a la reserva no encontrado'), { status: 404 });
      }

      const codInventario = Number(inventario.cod_inventario);
      const [filasInventarioLiberado] = await sequelize.query(obtenerUpdateLiberarReservaStock(), {
        replacements: {
          codInventario,
          cantidad
        },
        transaction: t
      });
      const inventarioLiberado = Array.isArray(filasInventarioLiberado) ? filasInventarioLiberado[0] : null;
      if (!inventarioLiberado) {
        throw Object.assign(new Error('Conflicto de concurrencia al liberar stock reservado'), { status: 409 });
      }

      // // Marcamos estado final LIBERADA luego de actualizar inventario consistentemente
      const sqlUpdateReserva = construirUpdateReservaLiberadaSql({ schemaReserva });
      const [filasReservaLiberada] = await sequelize.query(sqlUpdateReserva, {
        replacements: {
          codReserva,
          codUsuarioLiberacion: codUsuario,
          motivoLiberacion: motivo || null,
          observaciones: observaciones || null
        },
        transaction: t
      });
      const reservaLiberada = Array.isArray(filasReservaLiberada) ? filasReservaLiberada[0] : null;
      if (!reservaLiberada) {
        throw Object.assign(new Error('No fue posible marcar la reserva como liberada'), { status: 409 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        reserva: reservaLiberada,
        inventario: inventarioLiberado,
        resumen: {
          cod_reserva: codReserva,
          cod_inventario: codInventario,
          cantidad_liberada: cantidad,
          stock_actual: Number(inventarioLiberado.stock || 0),
          stock_reservado_actual: Number(inventarioLiberado.stock_reservado || 0),
          stock_disponible_actual: Number(inventarioLiberado.stock || 0) - Number(inventarioLiberado.stock_reservado || 0)
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Consume reserva activa: descuenta stock, stock_reservado y registra movimiento de salida
  async consumirReserva(codReserva, payload, options = {}) {
    const schemaReserva = await this.obtenerSchemaReservasCompatible();
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const codUsuarioAuth = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const referencia = payload?.referencia ? String(payload.referencia).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const codUsuario = await this.normalizarCodUsuario(codUsuarioAuth, t);

      // // Bloqueo de reserva para garantizar operacion idempotente y sin doble consumo
      const reserva = await this.obtenerReservaPorId({
        schemaReserva,
        codReserva,
        transaction: t,
        forUpdate: true
      });
      if (!reserva) {
        throw Object.assign(new Error('Reserva no encontrada'), { status: 404 });
      }

      const estadoActual = estadoReservaNormalizado(reserva, schemaReserva);
      if (estadoActual === 'LIBERADA') {
        throw Object.assign(new Error('La reserva ya fue liberada y no puede consumirse'), { status: 409 });
      }
      if (estadoActual === 'CONSUMIDA') {
        throw Object.assign(new Error('La reserva ya fue consumida'), { status: 409 });
      }
      if (estadoActual && estadoActual !== 'ACTIVA') {
        throw Object.assign(new Error(`Estado de reserva no valido para consumir: ${estadoActual}`), { status: 409 });
      }

      const cantidad = Number(reserva[schemaReserva.cantidad] || 0);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw Object.assign(new Error('La reserva tiene una cantidad invalida'), { status: 409 });
      }

      // // Obtenemos inventario asociado con lock para descuento atomico
      let inventario = null;
      if (schemaReserva.codInventario && reserva[schemaReserva.codInventario]) {
        inventario = await this.obtenerInventarioPorIdConStockReservado({
          codInventario: Number(reserva[schemaReserva.codInventario]),
          transaction: t,
          forUpdate: true
        });
      } else {
        inventario = await this.obtenerInventarioConStockReservado({
          codProducto: Number(reserva[schemaReserva.codProducto]),
          codUbicacion: Number(reserva[schemaReserva.codUbicacion]),
          transaction: t,
          forUpdate: true
        });
      }
      if (!inventario) {
        throw Object.assign(new Error('Inventario asociado a la reserva no encontrado'), { status: 404 });
      }

      const codInventario = Number(inventario.cod_inventario);
      const codProducto = Number(inventario.cod_producto);
      const codUbicacion = Number(inventario.cod_ubicacion);

      // // Descuento atomico de stock y stock_reservado con guardias anti-negativo
      const [filasInventarioConsumido] = await sequelize.query(obtenerUpdateConsumirReservaStock(), {
        replacements: {
          codInventario,
          cantidad
        },
        transaction: t
      });
      const inventarioConsumido = Array.isArray(filasInventarioConsumido) ? filasInventarioConsumido[0] : null;
      if (!inventarioConsumido) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al consumir reserva. Verifique stock y reservado disponibles'),
          { status: 409 }
        );
      }

      // // Registramos traza en kardex como salida asociada a reserva consumida
      const { sql, replacements } = construirInsertMovimientoConsumoReservaSql({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        referencia,
        observaciones,
        codReserva
      });
      const [filasMovimiento] = await sequelize.query(sql, {
        replacements,
        transaction: t
      });
      const movimiento = Array.isArray(filasMovimiento) ? filasMovimiento[0] : null;

      // // Estado final de reserva como CONSUMIDA
      const sqlUpdateReserva = construirUpdateReservaConsumidaSql({ schemaReserva });
      const [filasReservaConsumida] = await sequelize.query(sqlUpdateReserva, {
        replacements: {
          codReserva,
          codUsuarioConsumo: codUsuario,
          referencia: referencia || null,
          observaciones: observaciones || null
        },
        transaction: t
      });
      const reservaConsumida = Array.isArray(filasReservaConsumida) ? filasReservaConsumida[0] : null;
      if (!reservaConsumida) {
        throw Object.assign(new Error('No fue posible marcar la reserva como consumida'), { status: 409 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        reserva: reservaConsumida,
        inventario: inventarioConsumido,
        movimiento,
        resumen: {
          cod_reserva: codReserva,
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          cantidad_consumida: cantidad,
          stock_actual: Number(inventarioConsumido.stock || 0),
          stock_reservado_actual: Number(inventarioConsumido.stock_reservado || 0),
          stock_disponible_actual: Number(inventarioConsumido.stock || 0) - Number(inventarioConsumido.stock_reservado || 0),
          cod_movimiento: schemaMovimiento.pk ? (movimiento?.[schemaMovimiento.pk] ?? null) : null
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

export default new InventarioReservasService();

