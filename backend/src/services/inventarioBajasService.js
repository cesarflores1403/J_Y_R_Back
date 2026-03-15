import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioExistenciasService from './inventarioExistenciasService.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import {
  obtenerSelectInventarioBajaPorProductoUbicacion,
  obtenerUpdateBajaSeguro,
  construirInsertBajaInventarioSql,
  construirInsertMovimientoBajaSql,
  construirSelectMovimientoBajaFormateadoSql
} from './inventarioBajasQueries.js';

// // Cache local del schema de baja_inventario para evitar consultas repetidas a information_schema
let cacheSchemaBajaInventario = null;

// // Devuelve true cuando PostgreSQL responde undefined_column para una columna especifica
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Devuelve true si el estado de ubicacion se considera activo en el schema actual
const ubicacionActiva = (estadoUbi) => {
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Construye etiqueta legible de ubicacion para respuestas fallback
const construirEtiquetaUbicacion = (u) => {
  if (!u) return null;
  const qr = String(u.codigo_producto || '').trim();
  if (qr) return qr;
  const partes = [u.pasillo, u.estanteria, u.nivel_1, u.nivel_2]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join('-') : String(u.cod_ubicacion);
};

// // Busca la primera columna existente segun una lista de candidatos
const resolverColumna = (columnasSet, candidatos = []) => {
  for (const nombre of candidatos) {
    if (columnasSet.has(nombre)) return nombre;
  }
  return null;
};

// // Construye texto descriptivo de baja usando motivo, descripcion y referencia del payload
const construirDescripcionBaja = ({ motivo, descripcion, referencia }) => {
  const bloques = [];
  if (motivo) bloques.push(`Motivo: ${motivo}`);
  if (descripcion) bloques.push(`Descripcion: ${descripcion}`);
  if (referencia) bloques.push(`Referencia: ${referencia}`);
  return bloques.join(' | ');
};

class InventarioBajasService {
  // // Obtiene schema de baja_inventario; si no existe devuelve metadata controlada
  async obtenerSchemaBajaInventario({ forceRefresh = false } = {}) {
    if (!forceRefresh && cacheSchemaBajaInventario) {
      return cacheSchemaBajaInventario;
    }

    // // Inspeccionamos columnas reales de baja_inventario en schema public
    const columnas = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'baja_inventario'
      ORDER BY ordinal_position ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // // Si no hay columnas, la tabla no existe y la baja se trazara solo en movimiento_inventario
    if (!Array.isArray(columnas) || columnas.length === 0) {
      const schemaInexistente = {
        existe: false,
        tableName: 'baja_inventario',
        columns: []
      };
      cacheSchemaBajaInventario = schemaInexistente;
      return schemaInexistente;
    }

    const columnasSet = new Set(columnas.map((c) => c.column_name));
    const schema = {
      existe: true,
      tableName: 'baja_inventario',
      columns: columnas.map((c) => c.column_name),
      pk: resolverColumna(columnasSet, ['cod_baja_inventario', 'cod_baja', 'id_baja']),
      codProducto: resolverColumna(columnasSet, ['cod_producto']),
      codUbicacion: resolverColumna(columnasSet, ['cod_ubicacion']),
      codUsuario: resolverColumna(columnasSet, ['cod_usuario', 'id_usuario']),
      fecha: resolverColumna(columnasSet, ['fecha', 'fecha_baja', 'creado_en', 'created_at']),
      cantidad: resolverColumna(columnasSet, ['cantidad', 'cant']),
      descripcion: resolverColumna(columnasSet, ['descripcion', 'motivo', 'detalle', 'observaciones'])
    };

    cacheSchemaBajaInventario = schema;
    return schema;
  }

  // // Busca inventario por producto+ubicacion aplicando lock pesimista en la fila
  async obtenerInventarioConBloqueo({ codProducto, codUbicacion, transaction }) {
    try {
      // // Intentamos leer stock_reservado real para respetar stock disponible cuando exista la columna
      const [fila] = await sequelize.query(obtenerSelectInventarioBajaPorProductoUbicacion({
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
      // // Fallback a schema legacy sin stock_reservado
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [fila] = await sequelize.query(obtenerSelectInventarioBajaPorProductoUbicacion({
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

  // // Ejecuta descuento seguro de inventario en la misma transaccion
  async descontarStockSeguro({ codInventario, cantidad, usaStockReservado, transaction }) {
    const [filas] = await sequelize.query(obtenerUpdateBajaSeguro({
      usarStockReservado: usaStockReservado
    }), {
      replacements: {
        codInventario,
        cantidad
      },
      transaction
    });

    const filasActualizadas = Array.isArray(filas) ? filas : [];
    return filasActualizadas[0] || null;
  }

  // // Inserta registro en baja_inventario si la tabla existe en el schema actual
  async insertarBajaInventario({
    schemaBaja,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    descripcionBaja,
    transaction
  }) {
    // // Si la tabla no existe, devolvemos null y se mantiene trazabilidad en movimiento_inventario
    if (!schemaBaja?.existe) return null;

    // // Si schema exige cod_usuario y no hay usuario autenticado, se rechaza por trazabilidad incompleta
    if (schemaBaja.codUsuario && !codUsuario) {
      throw Object.assign(new Error('No fue posible identificar usuario para registrar baja_inventario'), { status: 400 });
    }

    const { sql, replacements } = construirInsertBajaInventarioSql({
      schemaBaja,
      codProducto,
      codUbicacion,
      codUsuario,
      cantidad,
      descripcionBaja
    });

    const [filas] = await sequelize.query(sql, {
      replacements,
      transaction
    });

    const bajaCreada = Array.isArray(filas) ? filas[0] : null;
    return bajaCreada || null;
  }

  // // Inserta movimiento para baja usando tipo BAJA como contrato oficial
  async insertarMovimientoBaja({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    motivoTexto,
    referencia,
    descripcionDetalle,
    refTipo,
    refId,
    transaction
  }) {
    const ejecutarInsert = async (tipoMovimiento) => {
      const { sql, replacements } = construirInsertMovimientoBajaSql({
        schemaMovimiento,
        tipoMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        motivoTexto,
        referencia,
        descripcionDetalle,
        refTipo,
        refId
      });

      const [filas] = await sequelize.query(sql, {
        replacements,
        transaction
      });

      const movimientoCreado = Array.isArray(filas) ? filas[0] : null;
      return movimientoCreado || null;
    };

    const movimientoRow = await ejecutarInsert('BAJA');
    return {
      movimientoRow,
      tipoSolicitado: 'BAJA',
      tipoAplicado: 'BAJA',
      fallbackTipo: false
    };
  }

  // // Relee movimiento insertado y entrega payload consistente para respuesta y kardex
  async obtenerMovimientoFormateado({ schemaMovimiento, movimientoRow, transaction }) {
    if (!movimientoRow) return null;

    // // Si no hay PK devolvemos mapeo basico usando columnas presentes en el row insertado
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

    const sqlMovimiento = construirSelectMovimientoBajaFormateadoSql({ schemaMovimiento });
    const [fila] = await sequelize.query(sqlMovimiento, {
      replacements: { pkMovimiento: movimientoRow[schemaMovimiento.pk] },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // HU: registra baja por dano/perdida en flujo transaccional consistente
  async registrarBaja(payload, options = {}) {
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const cantidad = Number(payload.cantidad);
    const motivo = payload.motivo ? String(payload.motivo).trim() : '';
    const descripcion = payload.descripcion ? String(payload.descripcion).trim() : '';
    const referencia = payload.referencia ? String(payload.referencia).trim() : '';
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Defensa en profundidad para cantidad positiva y motivo/descripcion obligatorios
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }
    if (!motivo && !descripcion) {
      throw Object.assign(new Error('motivo o descripcion es requerido'), { status: 400 });
    }

    // // Se detecta schema de movimientos y de bajas antes de abrir transaccion
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const schemaBaja = await this.obtenerSchemaBajaInventario();
    const descripcionBaja = construirDescripcionBaja({ motivo, descripcion, referencia });

    // // Apertura de transaccion real para garantizar atomicidad baja + movimiento + inventario
    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Validacion de existencia y estado de producto
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      if (producto.estado_producto !== 'Activo') {
        throw Object.assign(new Error('El producto no esta activo para registrar bajas'), { status: 400 });
      }

      // // Validacion de existencia y estado de ubicacion
      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para registrar bajas'), { status: 400 });
      }

      // // Leemos inventario con lock para serializar bajas concurrentes
      const { inventario: inventarioRow, usaStockReservado } = await this.obtenerInventarioConBloqueo({
        codProducto,
        codUbicacion,
        transaction: t
      });
      if (!inventarioRow) {
        throw Object.assign(new Error('Inventario no encontrado para el producto y ubicacion indicados'), { status: 404 });
      }

      // // Regla de negocio de stock disponible basada en stock - stock_reservado
      const codInventario = Number(inventarioRow.cod_inventario);
      const stockAntes = Number(inventarioRow.stock || 0);
      const stockReservado = Number(inventarioRow.stock_reservado || 0);
      const stockDisponibleAntes = stockAntes - stockReservado;
      if (stockDisponibleAntes < cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente para baja. Disponible: ${stockDisponibleAntes}, solicitado: ${cantidad}`),
          { status: 409 }
        );
      }

      // // Primero insertamos baja_inventario (si existe) para poder referenciarla en movimiento
      const bajaRow = await this.insertarBajaInventario({
        schemaBaja,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        descripcionBaja,
        transaction: t
      });
      const codBaja = schemaBaja.pk ? (bajaRow?.[schemaBaja.pk] ?? null) : null;

      // // Luego registramos movimiento con tipo BAJA segun contrato oficial de kardex
      const insercionMovimiento = await this.insertarMovimientoBaja({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        motivoTexto: motivo || 'BAJA_INVENTARIO',
        referencia,
        descripcionDetalle: descripcionBaja,
        refTipo: 'BAJA_INVENTARIO',
        refId: codBaja,
        transaction: t
      });

      // // Finalmente descontamos stock; si falla, rollback elimina baja y movimiento
      const inventarioActualizadoTx = await this.descontarStockSeguro({
        codInventario,
        cantidad,
        usaStockReservado,
        transaction: t
      });
      if (!inventarioActualizadoTx) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al descontar inventario por baja. Intente nuevamente'),
          { status: 409 }
        );
      }

      // // Reconsulta formateada del movimiento para respuesta consistente
      const movimiento = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow: insercionMovimiento.movimientoRow,
        transaction: t
      });

      await t.commit();
      transaccionConfirmada = true;

      // // Relectura fuera de transaccion para devolver estado actualizado de existencias
      const inventarioActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventario);
      const stockDespues = Number(inventarioActualizado?.stock ?? inventarioActualizadoTx.stock ?? (stockAntes - cantidad));

      return {
        baja: schemaBaja.existe ? (bajaRow || null) : null,
        movimiento: movimiento || {
          cod_inventario: codInventario,
          cod_producto: codProducto,
          nombre_producto: producto.nombre_producto,
          cod_ubicacion: codUbicacion,
          ubicacion: construirEtiquetaUbicacion(ubicacion),
          tipo: insercionMovimiento.tipoAplicado,
          cantidad,
          referencia_documento: referencia || null,
          observaciones: descripcionBaja || null,
          motivo: motivo || null,
          ref_tipo: 'BAJA_INVENTARIO',
          ref_id: codBaja,
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
          cantidad_baja: cantidad,
          stock_despues: stockDespues,
          tipo_movimiento_solicitado: insercionMovimiento.tipoSolicitado,
          tipo_movimiento_aplicado: insercionMovimiento.tipoAplicado,
          fallback_tipo_movimiento: insercionMovimiento.fallbackTipo,
          tabla_baja_inventario_existe: schemaBaja.existe,
          cod_baja_inventario: codBaja
        }
      };
    } catch (error) {
      // // Rollback total para no dejar datos huerfanos o inventario inconsistente
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }
}

export default new InventarioBajasService();

