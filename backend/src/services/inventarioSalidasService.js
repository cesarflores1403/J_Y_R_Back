import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioExistenciasService from './inventarioExistenciasService.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import {
  obtenerSelectInventarioPorProductoUbicacion,
  obtenerUpdateSalidaSeguro,
  construirInsertMovimientoSalidaSql,
  construirSelectMovimientoFormateadoSql
} from './inventarioSalidasQueries.js';

// // Detecta error de PostgreSQL por columna inexistente (undefined_column)
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Determina si la ubicacion se considera operativa para registrar salidas
const ubicacionActiva = (estadoUbi) => {
  // // Si estado es null/undefined se asume activa para no bloquear entornos legacy
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Construye etiqueta legible de ubicacion para respuesta fallback
const construirEtiquetaUbicacion = (u) => {
  if (!u) return null;
  const qr = String(u.codigo_qr || '').trim();
  if (qr) return qr;
  const partes = [u.pasillo, u.estanteria, u.nivel_1, u.nivel_2]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join('-') : String(u.cod_ubicacion);
};

class InventarioSalidasService {
  // // Busca inventario por producto+ubicacion con lock pesimista dentro de la transaccion
  async obtenerInventarioConBloqueo({ codProducto, codUbicacion, transaction }) {
    try {
      // // Intentamos leer stock_reservado real cuando la columna existe en inventario
      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: true
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
      // // Fallback para esquemas donde stock_reservado aun no existe
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: false
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

  // // Ejecuta descuento seguro de stock con condicion anti sobreventa en el UPDATE
  async descontarStockSeguro({ codInventario, cantidad, usaStockReservado, transaction }) {
    const [filas] = await sequelize.query(obtenerUpdateSalidaSeguro({
      usarStockReservado: usaStockReservado
    }), {
      replacements: {
        codInventario,
        cantidad
      },
      transaction
    });

    // // Si no se actualizo ninguna fila, hubo conflicto de concurrencia o stock insuficiente
    const filasActualizadas = Array.isArray(filas) ? filas : [];
    return filasActualizadas[0] || null;
  }

  // // Inserta el movimiento SALIDA en kardex con schema dinamico de movimiento_inventario
  async insertarMovimientoSalida({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    referencia,
    observaciones,
    transaction
  }) {
    // // Se genera SQL y replacements segun columnas realmente disponibles en la tabla
    const { sql, replacements } = construirInsertMovimientoSalidaSql({
      schemaMovimiento,
      codInventario,
      codProducto,
      codUbicacion,
      codUsuario,
      cantidad,
      referencia,
      observaciones
    });

    // // Insert con RETURNING para recuperar fila del movimiento dentro de la misma transaccion
    const [filas] = await sequelize.query(sql, {
      replacements,
      transaction
    });

    const movimientoCreado = Array.isArray(filas) ? filas[0] : null;
    return movimientoCreado || null;
  }

  // // Relee el movimiento con joins a producto/ubicacion/usuario para respuesta uniforme
  async obtenerMovimientoFormateado({ schemaMovimiento, movimientoRow, transaction }) {
    // // Si no hubo row de INSERT, devolvemos null para fallback de respuesta
    if (!movimientoRow) return null;

    // // Si no hay PK en tabla de movimientos se responde mapeo basico del row insertado
    if (!schemaMovimiento.pk) {
      return {
        cod_movimiento: null,
        cod_inventario: schemaMovimiento.codInventario ? (movimientoRow[schemaMovimiento.codInventario] ?? null) : null,
        cod_producto: schemaMovimiento.codProducto ? (movimientoRow[schemaMovimiento.codProducto] ?? null) : null,
        cod_ubicacion: schemaMovimiento.codUbicacion ? (movimientoRow[schemaMovimiento.codUbicacion] ?? null) : null,
        fecha_movimiento: movimientoRow[schemaMovimiento.fecha] ?? null,
        tipo: String(movimientoRow[schemaMovimiento.tipo] || 'SALIDA').toUpperCase(),
        cantidad: Number(movimientoRow[schemaMovimiento.cantidad] || 0),
        referencia_documento: schemaMovimiento.referencia ? (movimientoRow[schemaMovimiento.referencia] ?? null) : null,
        observaciones: schemaMovimiento.observaciones ? (movimientoRow[schemaMovimiento.observaciones] ?? null) : null,
        cod_usuario: schemaMovimiento.codUsuario ? (movimientoRow[schemaMovimiento.codUsuario] ?? null) : null,
        nombre_usuario: null
      };
    }

    // // Query de relectura con aliases estables para mantener contrato del kardex
    const sqlMovimiento = construirSelectMovimientoFormateadoSql({ schemaMovimiento });
    const [fila] = await sequelize.query(sqlMovimiento, {
      replacements: { pkMovimiento: movimientoRow[schemaMovimiento.pk] },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // HU: registra salida de inventario de forma transaccional y segura ante concurrencia
  async registrarSalida(payload, options = {}) {
    // // Normalizamos payload base para validacion y persistencia
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const cantidad = Number(payload.cantidad);
    const referencia = String(payload.referencia || '').trim();
    const observaciones = payload.observaciones ? String(payload.observaciones).trim() : null;
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Defensa en profundidad por si el servicio se invoca sin express-validator
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }

    // // Resolucion de schema real del kardex para insertar SALIDA sin asumir columnas fijas
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    // // Apertura de transaccion real para garantizar consistencia inventario + kardex
    const t = await sequelize.transaction();
    // // Bandera para evitar rollback sobre transaccion ya confirmada
    let transaccionConfirmada = false;

    try {
      // // Validamos existencia y estado del producto antes de descontar stock
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      if (producto.estado_producto !== 'Activo') {
        throw Object.assign(new Error('El producto no esta activo para registrar salidas'), { status: 400 });
      }

      // // Validamos existencia y estado de ubicacion para no operar fuera de zonas activas
      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para registrar salidas'), { status: 400 });
      }

      // // Leemos inventario con lock para serializar descuentos concurrentes sobre la misma fila
      const { inventario: inventarioRow, usaStockReservado } = await this.obtenerInventarioConBloqueo({
        codProducto,
        codUbicacion,
        transaction: t
      });

      // // Si no existe inventario para la combinacion solicitada se devuelve 404
      if (!inventarioRow) {
        throw Object.assign(new Error('Inventario no encontrado para el producto y ubicacion indicados'), { status: 404 });
      }

      // // Calculamos stock disponible segun regla de negocio: stock - stock_reservado
      const stockAntes = Number(inventarioRow.stock || 0);
      const stockReservado = Number(inventarioRow.stock_reservado || 0);
      const stockDisponibleAntes = stockAntes - stockReservado;
      const codInventario = Number(inventarioRow.cod_inventario);

      // // Validacion funcional previa al UPDATE seguro para dar mensaje de negocio claro
      if (stockDisponibleAntes < cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente. Disponible: ${stockDisponibleAntes}, solicitado: ${cantidad}`),
          { status: 409 }
        );
      }

      // // UPDATE condicional dentro de la misma transaccion para blindaje adicional de concurrencia
      const inventarioActualizadoTx = await this.descontarStockSeguro({
        codInventario,
        cantidad,
        usaStockReservado,
        transaction: t
      });

      // // Si no hubo fila actualizada se trata como conflicto concurrente
      if (!inventarioActualizadoTx) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al descontar inventario. Intente nuevamente'),
          { status: 409 }
        );
      }

      // // Registramos movimiento SALIDA en kardex en la misma transaccion del descuento
      const movimientoRow = await this.insertarMovimientoSalida({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        referencia,
        observaciones,
        transaction: t
      });

      // // Reconsulta del movimiento para devolver respuesta consistente con kardex
      const movimiento = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow,
        transaction: t
      });

      // // Commit confirma atomica y consistentemente inventario + kardex
      await t.commit();
      transaccionConfirmada = true;

      // // Relectura final de existencia para obtener stock_disponible y estado_stock calculados
      const inventarioActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventario);
      const stockDespues = Number(inventarioActualizado?.stock ?? inventarioActualizadoTx.stock ?? (stockAntes - cantidad));

      // // Respuesta de servicio con resumen operativo para consumidores internos/externos
      return {
        movimiento: movimiento || {
          cod_inventario: codInventario,
          cod_producto: codProducto,
          nombre_producto: producto.nombre_producto,
          cod_ubicacion: codUbicacion,
          ubicacion: construirEtiquetaUbicacion(ubicacion),
          tipo: 'SALIDA',
          cantidad,
          referencia_documento: referencia,
          observaciones,
          fecha_movimiento: new Date().toISOString(),
          cod_usuario: codUsuario,
          nombre_usuario: options?.usuario?.nombre_usuario ?? null
        },
        inventario: inventarioActualizado,
        resumen: {
          cod_inventario: codInventario,
          stock_antes: stockAntes,
          stock_reservado: stockReservado,
          stock_disponible_antes: stockDisponibleAntes,
          cantidad_salida: cantidad,
          stock_despues: stockDespues
        }
      };
    } catch (error) {
      // // Ante cualquier fallo se revierte completo para evitar descuadres de inventario/kardex
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }
}

export default new InventarioSalidasService();
