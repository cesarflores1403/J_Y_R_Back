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
  const qr = String(u.codigo_producto || '').trim();
  if (qr) return qr;
  const partes = [u.pasillo, u.estanteria, u.nivel_1, u.nivel_2]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join('-') : String(u.cod_ubicacion);
};

// // Normaliza texto opcional para evitar guardar espacios vacios
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
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

  // // Obtiene y bloquea un movimiento especifico para procesos de anulacion seguros
  async obtenerMovimientoConBloqueoPorId({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.pk) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario sin PK; no es posible anular salidas de forma segura'),
        { status: 500 }
      );
    }

    const exprCodProducto = schemaMovimiento.codProducto
      ? `m.${schemaMovimiento.codProducto}`
      : 'i.cod_producto';
    const exprCodUbicacion = schemaMovimiento.codUbicacion
      ? `m.${schemaMovimiento.codUbicacion}`
      : 'i.cod_ubicacion';
    const joinInventario = schemaMovimiento.codInventario
      ? `LEFT JOIN inventario i ON i.cod_inventario = m.${schemaMovimiento.codInventario}`
      : '';

    const [fila] = await sequelize.query(`
      SELECT
        m.*,
        ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario}` : 'NULL::int'} AS ref_cod_inventario,
        ${exprCodProducto} AS ref_cod_producto,
        ${exprCodUbicacion} AS ref_cod_ubicacion
      FROM ${schemaMovimiento.tableName} m
      ${joinInventario}
      WHERE m.${schemaMovimiento.pk} = :codMovimiento
      LIMIT 1
      FOR UPDATE OF m
    `, {
      replacements: { codMovimiento },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Valida si una salida ya fue anulada previamente para evitar doble reverso
  async validarSalidaNoAnulada({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.refTipo || !schemaMovimiento.refId) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario no soporta ref_tipo/ref_id para anular salidas de forma segura'),
        { status: 500 }
      );
    }

    const [fila] = await sequelize.query(`
      SELECT 1 AS existe
      FROM ${schemaMovimiento.tableName} m
      WHERE UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
        AND CAST(m.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_SALIDA'
        AND m.${schemaMovimiento.refId} = :codMovimiento
      LIMIT 1
    `, {
      replacements: { codMovimiento },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    if (fila?.existe) {
      throw Object.assign(new Error('La salida ya fue anulada previamente'), { status: 409 });
    }
  }

  // // Lee inventario por id con lock y soporte a schemas sin stock_reservado
  async obtenerInventarioPorIdConBloqueo({ codInventario, transaction }) {
    try {
      const [fila] = await sequelize.query(`
        SELECT
          cod_inventario,
          cod_producto,
          cod_ubicacion,
          stock,
          COALESCE(stock_reservado, 0) AS stock_reservado,
          stock_minimo,
          stock_maximo,
          fecha_ult_mov
        FROM inventario
        WHERE cod_inventario = :codInventario
        LIMIT 1
        FOR UPDATE
      `, {
        replacements: { codInventario },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return fila || null;
    } catch (error) {
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [fila] = await sequelize.query(`
        SELECT
          cod_inventario,
          cod_producto,
          cod_ubicacion,
          stock,
          0 AS stock_reservado,
          stock_minimo,
          stock_maximo,
          fecha_ult_mov
        FROM inventario
        WHERE cod_inventario = :codInventario
        LIMIT 1
        FOR UPDATE
      `, {
        replacements: { codInventario },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return fila || null;
    }
  }

  // // Incrementa stock para revertir una salida anulada
  async incrementarStockPorAnulacion({ codInventario, cantidad, transaction }) {
    const [filas] = await sequelize.query(`
      UPDATE inventario
      SET stock = stock + :cantidad,
          fecha_ult_mov = NOW()
      WHERE cod_inventario = :codInventario
      RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
    `, {
      replacements: { codInventario, cantidad },
      transaction
    });

    const filasActualizadas = Array.isArray(filas) ? filas : [];
    return filasActualizadas[0] || null;
  }

  // // Inserta movimiento ENTRADA que compensa la salida anulada
  async insertarMovimientoAnulacionSalida({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codMovimientoSalida,
    codUsuario,
    cantidad,
    referenciaDocumento,
    motivo,
    observaciones,
    transaction
  }) {
    const columnas = [];
    const valoresSql = [];
    const replacements = {};

    if (schemaMovimiento.codInventario) {
      columnas.push(schemaMovimiento.codInventario);
      valoresSql.push(':codInventario');
      replacements.codInventario = codInventario;
    }

    if (schemaMovimiento.codProducto) {
      columnas.push(schemaMovimiento.codProducto);
      valoresSql.push(':codProducto');
      replacements.codProducto = codProducto;
    }

    if (schemaMovimiento.codUbicacion) {
      columnas.push(schemaMovimiento.codUbicacion);
      valoresSql.push(':codUbicacion');
      replacements.codUbicacion = codUbicacion;
    }

    if (schemaMovimiento.codUsuario && codUsuario) {
      columnas.push(schemaMovimiento.codUsuario);
      valoresSql.push(':codUsuario');
      replacements.codUsuario = codUsuario;
    }

    columnas.push(schemaMovimiento.tipo);
    valoresSql.push(':tipoMovimiento');
    replacements.tipoMovimiento = 'ENTRADA';

    columnas.push(schemaMovimiento.cantidad);
    valoresSql.push(':cantidad');
    replacements.cantidad = cantidad;

    columnas.push(schemaMovimiento.fecha);
    valoresSql.push('NOW()');

    if (schemaMovimiento.referencia) {
      columnas.push(schemaMovimiento.referencia);
      valoresSql.push(':referenciaDocumento');
      replacements.referenciaDocumento = referenciaDocumento;
    }

    if (schemaMovimiento.observaciones) {
      columnas.push(schemaMovimiento.observaciones);
      valoresSql.push(':observaciones');
      replacements.observaciones = observaciones || null;
    }

    if (schemaMovimiento.motivo) {
      columnas.push(schemaMovimiento.motivo);
      valoresSql.push(':motivo');
      replacements.motivo = motivo;
    }

    if (schemaMovimiento.refTipo) {
      columnas.push(schemaMovimiento.refTipo);
      valoresSql.push(':refTipo');
      replacements.refTipo = 'ANULACION_SALIDA';
    }

    if (schemaMovimiento.refId) {
      columnas.push(schemaMovimiento.refId);
      valoresSql.push(':refId');
      replacements.refId = codMovimientoSalida;
    }

    const [filas] = await sequelize.query(`
      INSERT INTO ${schemaMovimiento.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `, {
      replacements,
      transaction
    });

    const movimientoCreado = Array.isArray(filas) ? filas[0] : null;
    return movimientoCreado || null;
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

  // // Revierte una salida con movimiento compensatorio ENTRADA y control transaccional
  async anularSalida(codMovimientoSalida, payload = {}, options = {}) {
    const codMovimiento = Number(codMovimientoSalida);
    if (!Number.isInteger(codMovimiento) || codMovimiento < 1) {
      throw Object.assign(new Error('id de movimiento invalido para anular salida'), { status: 400 });
    }

    const motivo = normalizarTexto(payload.motivo) || 'ANULACION_SALIDA';
    const referenciaManual = normalizarTexto(payload.referencia);
    const observacionesManual = normalizarTexto(payload.observaciones);
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const movimientoSalida = await this.obtenerMovimientoConBloqueoPorId({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      if (!movimientoSalida) {
        throw Object.assign(new Error('Movimiento de salida no encontrado'), { status: 404 });
      }

      const tipoMovimiento = String(movimientoSalida[schemaMovimiento.tipo] || '').trim().toUpperCase();
      if (tipoMovimiento !== 'SALIDA') {
        throw Object.assign(new Error('Solo se pueden anular movimientos tipo SALIDA'), { status: 409 });
      }

      await this.validarSalidaNoAnulada({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      const cantidad = Number(movimientoSalida[schemaMovimiento.cantidad] || 0);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw Object.assign(new Error('El movimiento de salida tiene cantidad invalida para anulacion'), { status: 409 });
      }

      let codInventario = Number(movimientoSalida.ref_cod_inventario || 0);
      let codProducto = Number(movimientoSalida.ref_cod_producto || 0);
      let codUbicacion = Number(movimientoSalida.ref_cod_ubicacion || 0);

      if (!codInventario && Number.isInteger(codProducto) && codProducto > 0 && Number.isInteger(codUbicacion) && codUbicacion > 0) {
        const inventarioAsociado = await this.obtenerInventarioConBloqueo({
          codProducto,
          codUbicacion,
          transaction: t
        });
        codInventario = Number(inventarioAsociado?.inventario?.cod_inventario || 0);
      }

      if (!codInventario) {
        throw Object.assign(new Error('No fue posible resolver inventario asociado a la salida'), { status: 500 });
      }

      const inventarioAntes = await this.obtenerInventarioPorIdConBloqueo({
        codInventario,
        transaction: t
      });

      if (!inventarioAntes) {
        throw Object.assign(new Error('Inventario asociado no encontrado para anular salida'), { status: 404 });
      }

      codProducto = Number(codProducto || inventarioAntes.cod_producto || 0);
      codUbicacion = Number(codUbicacion || inventarioAntes.cod_ubicacion || 0);

      const stockAntes = Number(inventarioAntes.stock || 0);
      const stockReservado = Number(inventarioAntes.stock_reservado || 0);

      const inventarioActualizadoTx = await this.incrementarStockPorAnulacion({
        codInventario,
        cantidad,
        transaction: t
      });

      if (!inventarioActualizadoTx) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al anular salida. Intente nuevamente'),
          { status: 409 }
        );
      }

      const referenciaOriginal = schemaMovimiento.referencia
        ? normalizarTexto(movimientoSalida[schemaMovimiento.referencia])
        : null;
      const referenciaBase = referenciaOriginal
        ? referenciaOriginal.replace(/\s+/g, '-')
        : `MOV-${codMovimiento}`;
      const referenciaDocumento = (referenciaManual || `ANULA-${referenciaBase}`).slice(0, 200);

      const observacionesSistema = [
        `Anulacion de salida #${codMovimiento}`,
        observacionesManual
      ].filter(Boolean).join(' | ').slice(0, 500);

      const movimientoRow = await this.insertarMovimientoAnulacionSalida({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codMovimientoSalida: codMovimiento,
        codUsuario,
        cantidad,
        referenciaDocumento,
        motivo,
        observaciones: observacionesSistema,
        transaction: t
      });

      const movimientoAnulacion = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow,
        transaction: t
      });

      await t.commit();
      transaccionConfirmada = true;

      const inventarioActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventario);

      return {
        movimiento_original: {
          cod_movimiento: codMovimiento,
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          fecha_movimiento: movimientoSalida[schemaMovimiento.fecha] ?? null,
          tipo: 'SALIDA',
          cantidad,
          referencia_documento: referenciaOriginal
        },
        movimiento_anulacion: movimientoAnulacion || {
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          tipo: 'ENTRADA',
          cantidad,
          referencia_documento: referenciaDocumento,
          observaciones: observacionesSistema,
          cod_usuario: codUsuario,
          nombre_usuario: options?.usuario?.nombre_usuario ?? null
        },
        inventario: inventarioActualizado,
        resumen: {
          cod_inventario: codInventario,
          stock_antes: stockAntes,
          stock_reservado: stockReservado,
          cantidad_revertida: cantidad,
          stock_despues: Number(inventarioActualizado?.stock ?? inventarioActualizadoTx.stock ?? (stockAntes + cantidad))
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

export default new InventarioSalidasService();

