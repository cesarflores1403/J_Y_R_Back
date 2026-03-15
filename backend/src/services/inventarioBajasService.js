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

// // Normaliza texto opcional para evitar guardar espacios vacios
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
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

  // // Actualiza baja_inventario por PK cuando existen columnas de auditoria/estado en el schema real
  async actualizarBajaInventarioPorPk({ schemaBaja, codBaja, cambios = {}, transaction }) {
    if (!schemaBaja?.existe || !schemaBaja.pk) return;
    if (!Number.isInteger(Number(codBaja)) || Number(codBaja) <= 0) return;

    const columnasSet = new Set(schemaBaja.columns || []);
    const setSql = [];
    const replacements = {
      pkBaja: Number(codBaja)
    };

    const agregarCambio = (candidatos, claveCambio, transform = (value) => value) => {
      if (!(claveCambio in cambios)) return;
      const columna = resolverColumna(columnasSet, candidatos);
      if (!columna) return;
      const placeholder = `valor_${columna}`;
      setSql.push(`${columna} = :${placeholder}`);
      replacements[placeholder] = transform(cambios[claveCambio]);
    };

    agregarCambio(['estado'], 'estado', (value) => String(value || '').trim().toUpperCase());
    agregarCambio(['cod_movimiento_baja', 'cod_movimiento'], 'codMovimientoBaja', (value) => {
      if (value === null || value === undefined || value === '') return null;
      const numero = Number(value);
      return Number.isInteger(numero) && numero > 0 ? numero : null;
    });
    agregarCambio(['cod_movimiento_anulacion'], 'codMovimientoAnulacion', (value) => {
      if (value === null || value === undefined || value === '') return null;
      const numero = Number(value);
      return Number.isInteger(numero) && numero > 0 ? numero : null;
    });
    agregarCambio(['cod_usuario_anulacion'], 'codUsuarioAnulacion', (value) => {
      if (value === null || value === undefined || value === '') return null;
      const numero = Number(value);
      return Number.isInteger(numero) && numero > 0 ? numero : null;
    });
    agregarCambio(['fecha_anulacion'], 'fechaAnulacion', (value) => value || null);

    if (setSql.length === 0) return;

    await sequelize.query(`
      UPDATE ${schemaBaja.tableName}
      SET ${setSql.join(', ')}
      WHERE ${schemaBaja.pk} = :pkBaja
    `, {
      replacements,
      transaction
    });
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

  // // Obtiene y bloquea un movimiento especifico para anular bajas con seguridad transaccional
  async obtenerMovimientoConBloqueoPorId({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.pk) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario sin PK; no es posible anular bajas de forma segura'),
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

  // // Valida que la baja no haya sido anulada previamente para evitar doble reverso
  async validarBajaNoAnulada({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.refTipo || !schemaMovimiento.refId) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario no soporta ref_tipo/ref_id para anular bajas de forma segura'),
        { status: 500 }
      );
    }

    const [fila] = await sequelize.query(`
      SELECT 1 AS existe
      FROM ${schemaMovimiento.tableName} m
      WHERE UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'ENTRADA'
        AND CAST(m.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_BAJA'
        AND m.${schemaMovimiento.refId} = :codMovimiento
      LIMIT 1
    `, {
      replacements: { codMovimiento },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    if (fila?.existe) {
      throw Object.assign(new Error('La baja ya fue anulada previamente'), { status: 409 });
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

  // // Incrementa stock para revertir una baja anulada
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

  // // Inserta movimiento ENTRADA que compensa una BAJA anulada
  async insertarMovimientoAnulacionBaja({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codMovimientoBaja,
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
      replacements.refTipo = 'ANULACION_BAJA';
    }

    if (schemaMovimiento.refId) {
      columnas.push(schemaMovimiento.refId);
      valoresSql.push(':refId');
      replacements.refId = codMovimientoBaja;
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

      // // Si existe baja_inventario, sincronizamos cod_movimiento y estado inicial para auditoria cruzada
      if (schemaBaja.existe && Number.isInteger(Number(codBaja)) && Number(codBaja) > 0) {
        const codMovimientoBaja = schemaMovimiento.pk
          ? (insercionMovimiento?.movimientoRow?.[schemaMovimiento.pk] ?? null)
          : null;

        await this.actualizarBajaInventarioPorPk({
          schemaBaja,
          codBaja: Number(codBaja),
          cambios: {
            estado: 'ACTIVA',
            codMovimientoBaja
          },
          transaction: t
        });
      }

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

  // // Revierte una BAJA con movimiento compensatorio ENTRADA y control transaccional
  async anularBaja(codMovimientoBaja, payload = {}, options = {}) {
    const codMovimiento = Number(codMovimientoBaja);
    if (!Number.isInteger(codMovimiento) || codMovimiento < 1) {
      throw Object.assign(new Error('id de movimiento invalido para anular baja'), { status: 400 });
    }

    const motivo = normalizarTexto(payload.motivo) || 'ANULACION_BAJA';
    const referenciaManual = normalizarTexto(payload.referencia);
    const observacionesManual = normalizarTexto(payload.observaciones);
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const schemaBaja = await this.obtenerSchemaBajaInventario();
    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const movimientoBaja = await this.obtenerMovimientoConBloqueoPorId({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      if (!movimientoBaja) {
        throw Object.assign(new Error('Movimiento de baja no encontrado'), { status: 404 });
      }

      const tipoMovimiento = String(movimientoBaja[schemaMovimiento.tipo] || '').trim().toUpperCase();
      if (tipoMovimiento !== 'BAJA') {
        throw Object.assign(new Error('Solo se pueden anular movimientos tipo BAJA'), { status: 409 });
      }

      await this.validarBajaNoAnulada({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      const cantidad = Number(movimientoBaja[schemaMovimiento.cantidad] || 0);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw Object.assign(new Error('El movimiento de baja tiene cantidad invalida para anulacion'), { status: 409 });
      }

      let codInventario = Number(movimientoBaja.ref_cod_inventario || 0);
      let codProducto = Number(movimientoBaja.ref_cod_producto || 0);
      let codUbicacion = Number(movimientoBaja.ref_cod_ubicacion || 0);

      if (!codInventario && Number.isInteger(codProducto) && codProducto > 0 && Number.isInteger(codUbicacion) && codUbicacion > 0) {
        const inventarioAsociado = await this.obtenerInventarioConBloqueo({
          codProducto,
          codUbicacion,
          transaction: t
        });
        codInventario = Number(inventarioAsociado?.inventario?.cod_inventario || 0);
      }

      if (!codInventario) {
        throw Object.assign(new Error('No fue posible resolver inventario asociado a la baja'), { status: 500 });
      }

      const inventarioAntes = await this.obtenerInventarioPorIdConBloqueo({
        codInventario,
        transaction: t
      });

      if (!inventarioAntes) {
        throw Object.assign(new Error('Inventario asociado no encontrado para anular baja'), { status: 404 });
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
          new Error('Conflicto de concurrencia al anular baja. Intente nuevamente'),
          { status: 409 }
        );
      }

      const referenciaOriginal = schemaMovimiento.referencia
        ? normalizarTexto(movimientoBaja[schemaMovimiento.referencia])
        : null;
      const referenciaBase = referenciaOriginal
        ? referenciaOriginal.replace(/\s+/g, '-')
        : `MOV-${codMovimiento}`;
      const referenciaDocumento = (referenciaManual || `ANULA-${referenciaBase}`).slice(0, 200);

      const observacionesSistema = [
        `Anulacion de baja #${codMovimiento}`,
        observacionesManual
      ].filter(Boolean).join(' | ').slice(0, 500);

      const movimientoRow = await this.insertarMovimientoAnulacionBaja({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codMovimientoBaja: codMovimiento,
        codUsuario,
        cantidad,
        referenciaDocumento,
        motivo,
        observaciones: observacionesSistema,
        transaction: t
      });

      // // Si existe baja_inventario y la BAJA original trae ref_id al registro, marcamos ANULADA
      const codBaja = schemaMovimiento.refId
        ? Number(movimientoBaja[schemaMovimiento.refId] || 0)
        : 0;
      if (schemaBaja.existe && Number.isInteger(codBaja) && codBaja > 0) {
        const codMovimientoAnulacion = schemaMovimiento.pk
          ? (movimientoRow?.[schemaMovimiento.pk] ?? null)
          : null;

        await this.actualizarBajaInventarioPorPk({
          schemaBaja,
          codBaja,
          cambios: {
            estado: 'ANULADA',
            codMovimientoAnulacion,
            codUsuarioAnulacion: codUsuario || null,
            fechaAnulacion: new Date()
          },
          transaction: t
        });
      }

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
          fecha_movimiento: movimientoBaja[schemaMovimiento.fecha] ?? null,
          tipo: 'BAJA',
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

export default new InventarioBajasService();

