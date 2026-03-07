import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import inventarioReservasSchemaService from './inventarioReservasSchemaService.js';
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

  // // Crea reserva valida incrementando stock_reservado sin tocar stock total
  async crearReserva(payload, options = {}) {
    const schemaReserva = await this.obtenerSchemaReservasCompatible();
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const cantidad = Number(payload.cantidad);
    const referencia = payload?.referencia ? String(payload.referencia).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Defensa en profundidad del service por seguridad
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
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
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const motivo = payload?.motivo ? String(payload.motivo).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
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
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const referencia = payload?.referencia ? String(payload.referencia).trim() : '';
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
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
