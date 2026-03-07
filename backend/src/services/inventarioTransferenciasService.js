import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioExistenciasService from './inventarioExistenciasService.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import {
  obtenerSelectInventariosTransferenciaConBloqueo,
  obtenerSelectInventarioTransferenciaPorProductoUbicacion,
  obtenerInsertInventarioDestinoInicial,
  obtenerUpdateTransferenciaSalidaSeguro,
  obtenerUpdateTransferenciaEntradaDestino,
  construirInsertMovimientoTransferenciaSql,
  construirSelectMovimientoTransferenciaFormateadoSql
} from './inventarioTransferenciasQueries.js';

// // Detecta error undefined_column (42703) para soportar fallback sin stock_reservado
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Detecta violacion UNIQUE para carrera al crear inventario destino
const esErrorUniqueViolation = (error) => {
  if (!error) return false;
  return error.code === '23505';
};

// // Determina si una ubicacion puede operar segun estado configurado en BD
const ubicacionActiva = (estadoUbi) => {
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Arma etiqueta de ubicacion para respuestas fallback cuando no se puede reconsultar movimiento
const construirEtiquetaUbicacion = (u) => {
  if (!u) return null;
  const qr = String(u.codigo_qr || '').trim();
  if (qr) return qr;
  const partes = [u.pasillo, u.estanteria, u.nivel_1, u.nivel_2]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join('-') : String(u.cod_ubicacion);
};

class InventarioTransferenciasService {
  // // Lee inventarios de origen/destino con lock pesimista y orden estable para mitigar carreras
  async obtenerInventariosConBloqueo({ codProducto, codUbicacionOrigen, codUbicacionDestino, transaction }) {
    try {
      // // Intentamos usar stock_reservado real si existe en la tabla inventario
      const filas = await sequelize.query(obtenerSelectInventariosTransferenciaConBloqueo({
        usarStockReservado: true
      }), {
        replacements: {
          codProducto,
          codUbicacionOrigen,
          codUbicacionDestino
        },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventarios: Array.isArray(filas) ? filas : [],
        usaStockReservado: true
      };
    } catch (error) {
      // // Fallback compatible para schemas legacy sin columna stock_reservado
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const filas = await sequelize.query(obtenerSelectInventariosTransferenciaConBloqueo({
        usarStockReservado: false
      }), {
        replacements: {
          codProducto,
          codUbicacionOrigen,
          codUbicacionDestino
        },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventarios: Array.isArray(filas) ? filas : [],
        usaStockReservado: false
      };
    }
  }

  // // Busca y bloquea un inventario puntual por producto+ubicacion dentro de la transaccion
  async obtenerInventarioPorUbicacionConBloqueo({
    codProducto,
    codUbicacion,
    usaStockReservado,
    transaction
  }) {
    const [fila] = await sequelize.query(obtenerSelectInventarioTransferenciaPorProductoUbicacion({
      usarStockReservado: usaStockReservado
    }), {
      replacements: {
        codProducto,
        codUbicacion
      },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Crea inventario destino si no existe y luego lo relee con lock para operar de forma consistente
  async obtenerOCrearInventarioDestinoConBloqueo({
    codProducto,
    codUbicacionDestino,
    usaStockReservado,
    transaction
  }) {
    // // Primer intento: si ya existe fila destino, devolvemos sin crear
    let inventarioDestino = await this.obtenerInventarioPorUbicacionConBloqueo({
      codProducto,
      codUbicacion: codUbicacionDestino,
      usaStockReservado,
      transaction
    });
    if (inventarioDestino) return inventarioDestino;

    try {
      // // Creamos existencia inicial en destino con stock cero, siguiendo patron de entradas
      await sequelize.query(obtenerInsertInventarioDestinoInicial({
        usarStockReservado: usaStockReservado
      }), {
        replacements: {
          codProducto,
          codUbicacionDestino
        },
        transaction
      });
    } catch (error) {
      // // Si otra transaccion la creo antes, releeremos con lock y continuamos
      if (!esErrorUniqueViolation(error)) {
        throw error;
      }
    }

    // // Relectura bloqueada para obtener cod_inventario final de destino
    inventarioDestino = await this.obtenerInventarioPorUbicacionConBloqueo({
      codProducto,
      codUbicacion: codUbicacionDestino,
      usaStockReservado,
      transaction
    });

    return inventarioDestino || null;
  }

  // // Actualiza origen con guardia anti sobreventa y fecha_ult_mov
  async descontarOrigenSeguro({ codInventarioOrigen, cantidad, usaStockReservado, transaction }) {
    const [filas] = await sequelize.query(obtenerUpdateTransferenciaSalidaSeguro({
      usarStockReservado: usaStockReservado
    }), {
      replacements: {
        codInventarioOrigen,
        cantidad
      },
      transaction
    });

    const filasActualizadas = Array.isArray(filas) ? filas : [];
    return filasActualizadas[0] || null;
  }

  // // Actualiza destino incrementando stock y fecha_ult_mov dentro de la misma transaccion
  async incrementarDestino({ codInventarioDestino, cantidad, transaction }) {
    const [filas] = await sequelize.query(obtenerUpdateTransferenciaEntradaDestino(), {
      replacements: {
        codInventarioDestino,
        cantidad
      },
      transaction
    });

    const filasActualizadas = Array.isArray(filas) ? filas : [];
    return filasActualizadas[0] || null;
  }

  // // Inserta movimiento de kardex para cada tramo de la transferencia (SALIDA/ENTRADA)
  async insertarMovimientoTransferencia({
    schemaMovimiento,
    tipoMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    referencia,
    motivo,
    observaciones,
    transaction
  }) {
    const { sql, replacements } = construirInsertMovimientoTransferenciaSql({
      schemaMovimiento,
      tipoMovimiento,
      codInventario,
      codProducto,
      codUbicacion,
      codUsuario,
      cantidad,
      referencia,
      motivo,
      observaciones,
      refTipo: 'TRANSFERENCIA',
      refId: null
    });

    const [filas] = await sequelize.query(sql, {
      replacements,
      transaction
    });

    const movimientoCreado = Array.isArray(filas) ? filas[0] : null;
    return movimientoCreado || null;
  }

  // // Relee movimiento con joins para respuesta uniforme; usa fallback si no hay PK
  async obtenerMovimientoFormateado({ schemaMovimiento, movimientoRow, transaction }) {
    if (!movimientoRow) return null;

    // // Si no existe PK en tabla de movimientos devolvemos mapeo basico desde RETURNING
    if (!schemaMovimiento.pk) {
      return {
        cod_movimiento: null,
        cod_inventario: schemaMovimiento.codInventario ? (movimientoRow[schemaMovimiento.codInventario] ?? null) : null,
        cod_producto: schemaMovimiento.codProducto ? (movimientoRow[schemaMovimiento.codProducto] ?? null) : null,
        cod_ubicacion: schemaMovimiento.codUbicacion ? (movimientoRow[schemaMovimiento.codUbicacion] ?? null) : null,
        fecha_movimiento: movimientoRow[schemaMovimiento.fecha] ?? null,
        tipo: String(movimientoRow[schemaMovimiento.tipo] || '').toUpperCase(),
        cantidad: Number(movimientoRow[schemaMovimiento.cantidad] || 0),
        referencia_documento: schemaMovimiento.referencia ? (movimientoRow[schemaMovimiento.referencia] ?? null) : null,
        observaciones: schemaMovimiento.observaciones ? (movimientoRow[schemaMovimiento.observaciones] ?? null) : null,
        motivo: schemaMovimiento.motivo ? (movimientoRow[schemaMovimiento.motivo] ?? null) : null,
        ref_tipo: schemaMovimiento.refTipo ? (movimientoRow[schemaMovimiento.refTipo] ?? null) : null,
        ref_id: schemaMovimiento.refId ? (movimientoRow[schemaMovimiento.refId] ?? null) : null,
        cod_usuario: schemaMovimiento.codUsuario ? (movimientoRow[schemaMovimiento.codUsuario] ?? null) : null,
        nombre_usuario: null
      };
    }

    const sqlMovimiento = construirSelectMovimientoTransferenciaFormateadoSql({ schemaMovimiento });
    const [fila] = await sequelize.query(sqlMovimiento, {
      replacements: { pkMovimiento: movimientoRow[schemaMovimiento.pk] },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // HU: registra transferencia origen->destino con transaccion y trazabilidad doble en kardex
  async registrarTransferencia(payload, options = {}) {
    // // Normalizamos payload para validaciones de negocio y persistencia
    const codProducto = Number(payload.cod_producto);
    const codUbicacionOrigen = Number(payload.cod_ubicacion_origen);
    const codUbicacionDestino = Number(payload.cod_ubicacion_destino);
    const cantidad = Number(payload.cantidad);
    const referencia = String(payload.referencia || '').trim();
    const motivo = payload.motivo ? String(payload.motivo).trim() : '';
    const observaciones = payload.observaciones ? String(payload.observaciones).trim() : '';
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Defensa en profundidad por si el endpoint se usa sin express-validator
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }
    if (!Number.isInteger(codUbicacionOrigen) || !Number.isInteger(codUbicacionDestino)) {
      throw Object.assign(new Error('Las ubicaciones de origen y destino deben ser enteros validos'), { status: 400 });
    }
    if (codUbicacionOrigen === codUbicacionDestino) {
      throw Object.assign(new Error('La ubicacion origen y destino no pueden ser iguales'), { status: 400 });
    }
    if (!referencia) {
      throw Object.assign(new Error('referencia es requerida'), { status: 400 });
    }

    // // Resolvemos schema dinamico de movimientos antes de iniciar la operacion transaccional
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Validamos producto existente y activo para permitir transferencias
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      if (producto.estado_producto !== 'Activo') {
        throw Object.assign(new Error('El producto no esta activo para transferencias'), { status: 400 });
      }

      // // Validamos ubicacion origen existente y operativa
      const ubicacionOrigen = await Ubicacion.findByPk(codUbicacionOrigen, { transaction: t });
      if (!ubicacionOrigen) {
        throw Object.assign(new Error('Ubicacion origen no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacionOrigen.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion origen no esta activa para transferencias'), { status: 400 });
      }

      // // Validamos ubicacion destino existente y operativa
      const ubicacionDestino = await Ubicacion.findByPk(codUbicacionDestino, { transaction: t });
      if (!ubicacionDestino) {
        throw Object.assign(new Error('Ubicacion destino no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacionDestino.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion destino no esta activa para transferencias'), { status: 400 });
      }

      // // Bloqueamos inventarios de ambas ubicaciones en orden estable para mitigar condiciones de carrera
      const { inventarios, usaStockReservado } = await this.obtenerInventariosConBloqueo({
        codProducto,
        codUbicacionOrigen,
        codUbicacionDestino,
        transaction: t
      });

      // // Construimos mapa por ubicacion tomando la primera fila (si hay duplicados legacy)
      const inventarioPorUbicacion = new Map();
      for (const fila of inventarios) {
        const clave = Number(fila.cod_ubicacion);
        if (!inventarioPorUbicacion.has(clave)) {
          inventarioPorUbicacion.set(clave, fila);
        }
      }

      // // Inventario de origen es obligatorio para permitir transferencia
      const inventarioOrigenRow = inventarioPorUbicacion.get(codUbicacionOrigen) || null;
      if (!inventarioOrigenRow) {
        throw Object.assign(new Error('Inventario de origen no encontrado para el producto indicado'), { status: 404 });
      }

      // // Inventario destino puede crearse en cero si no existe, siguiendo patron de entradas
      let inventarioDestinoRow = inventarioPorUbicacion.get(codUbicacionDestino) || null;
      if (!inventarioDestinoRow) {
        inventarioDestinoRow = await this.obtenerOCrearInventarioDestinoConBloqueo({
          codProducto,
          codUbicacionDestino,
          usaStockReservado,
          transaction: t
        });
      }
      if (!inventarioDestinoRow) {
        throw Object.assign(new Error('No fue posible resolver inventario destino para la transferencia'), { status: 500 });
      }

      // // Calculamos disponible real en origen para decidir si la transferencia es permitida
      const codInventarioOrigen = Number(inventarioOrigenRow.cod_inventario);
      const codInventarioDestino = Number(inventarioDestinoRow.cod_inventario);
      const stockOrigenAntes = Number(inventarioOrigenRow.stock || 0);
      const stockReservadoOrigen = Number(inventarioOrigenRow.stock_reservado || 0);
      const stockDisponibleOrigen = stockOrigenAntes - stockReservadoOrigen;
      const stockDestinoAntes = Number(inventarioDestinoRow.stock || 0);

      if (stockDisponibleOrigen < cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente en origen. Disponible: ${stockDisponibleOrigen}, solicitado: ${cantidad}`),
          { status: 409 }
        );
      }

      // // Descontamos origen con UPDATE condicional para blindaje de concurrencia en la misma sentencia
      const origenActualizadoTx = await this.descontarOrigenSeguro({
        codInventarioOrigen,
        cantidad,
        usaStockReservado,
        transaction: t
      });
      if (!origenActualizadoTx) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al descontar inventario de origen. Intente nuevamente'),
          { status: 409 }
        );
      }

      // // Incrementamos destino dentro de la misma transaccion para conservar balance global de stock
      const destinoActualizadoTx = await this.incrementarDestino({
        codInventarioDestino,
        cantidad,
        transaction: t
      });
      if (!destinoActualizadoTx) {
        throw Object.assign(new Error('Conflicto de concurrencia al incrementar inventario destino'), { status: 409 });
      }

      // // Registramos SALIDA en origen con referencia compartida de transferencia
      const movimientoSalidaRow = await this.insertarMovimientoTransferencia({
        schemaMovimiento,
        tipoMovimiento: 'SALIDA',
        codInventario: codInventarioOrigen,
        codProducto,
        codUbicacion: codUbicacionOrigen,
        codUsuario,
        cantidad,
        referencia,
        motivo: motivo || 'TRANSFERENCIA',
        observaciones,
        transaction: t
      });

      // // Registramos ENTRADA en destino con la misma referencia para trazabilidad cruzada
      const movimientoEntradaRow = await this.insertarMovimientoTransferencia({
        schemaMovimiento,
        tipoMovimiento: 'ENTRADA',
        codInventario: codInventarioDestino,
        codProducto,
        codUbicacion: codUbicacionDestino,
        codUsuario,
        cantidad,
        referencia,
        motivo: motivo || 'TRANSFERENCIA',
        observaciones,
        transaction: t
      });

      // // Reconsultamos ambos movimientos con formato de kardex
      const movimientoSalida = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow: movimientoSalidaRow,
        transaction: t
      });
      const movimientoEntrada = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow: movimientoEntradaRow,
        transaction: t
      });

      // // Confirmamos atomicidad: inventario origen/destino y ambos movimientos quedan consistentes
      await t.commit();
      transaccionConfirmada = true;

      // // Relectura final de existencias para responder stock y estado actualizado en ambos lados
      const inventarioOrigenActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventarioOrigen);
      const inventarioDestinoActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventarioDestino);
      const stockOrigenDespues = Number(inventarioOrigenActualizado?.stock ?? origenActualizadoTx.stock ?? (stockOrigenAntes - cantidad));
      const stockDestinoDespues = Number(inventarioDestinoActualizado?.stock ?? destinoActualizadoTx.stock ?? (stockDestinoAntes + cantidad));

      return {
        movimientos: {
          salida: movimientoSalida || {
            cod_movimiento: null,
            cod_inventario: codInventarioOrigen,
            cod_producto: codProducto,
            nombre_producto: producto.nombre_producto,
            cod_ubicacion: codUbicacionOrigen,
            ubicacion: construirEtiquetaUbicacion(ubicacionOrigen),
            tipo: 'SALIDA',
            cantidad,
            referencia_documento: referencia,
            observaciones: observaciones || null,
            motivo: motivo || 'TRANSFERENCIA',
            fecha_movimiento: new Date().toISOString(),
            cod_usuario: codUsuario,
            nombre_usuario: options?.usuario?.nombre_usuario ?? null
          },
          entrada: movimientoEntrada || {
            cod_movimiento: null,
            cod_inventario: codInventarioDestino,
            cod_producto: codProducto,
            nombre_producto: producto.nombre_producto,
            cod_ubicacion: codUbicacionDestino,
            ubicacion: construirEtiquetaUbicacion(ubicacionDestino),
            tipo: 'ENTRADA',
            cantidad,
            referencia_documento: referencia,
            observaciones: observaciones || null,
            motivo: motivo || 'TRANSFERENCIA',
            fecha_movimiento: new Date().toISOString(),
            cod_usuario: codUsuario,
            nombre_usuario: options?.usuario?.nombre_usuario ?? null
          }
        },
        inventario_origen: inventarioOrigenActualizado,
        inventario_destino: inventarioDestinoActualizado,
        resumen: {
          cod_producto: codProducto,
          cod_inventario_origen: codInventarioOrigen,
          cod_inventario_destino: codInventarioDestino,
          cod_ubicacion_origen: codUbicacionOrigen,
          cod_ubicacion_destino: codUbicacionDestino,
          cantidad_transferida: cantidad,
          referencia_transferencia: referencia,
          stock_origen_antes: stockOrigenAntes,
          stock_origen_disponible_antes: stockDisponibleOrigen,
          stock_origen_despues: stockOrigenDespues,
          stock_destino_antes: stockDestinoAntes,
          stock_destino_despues: stockDestinoDespues,
          inventario_destino_creado: !inventarioPorUbicacion.get(codUbicacionDestino)
        }
      };
    } catch (error) {
      // // Rollback total para evitar stock descuadrado o movimientos huerfanos
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }
}

export default new InventarioTransferenciasService();
