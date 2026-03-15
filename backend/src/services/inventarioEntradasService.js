import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioExistenciasService from './inventarioExistenciasService.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';

// // Detecta error de columna faltante en PostgreSQL (undefined_column)
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Determina si el estado de ubicacion se considera activo segun valores comunes del repo
const ubicacionActiva = (estadoUbi) => {
  // // Si no viene estado, se asume activa para evitar falsos negativos en schemas parciales
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Construye representacion de ubicacion legible para respuestas
const construirEtiquetaUbicacion = (u) => {
  if (!u) return null;
  const qr = String(u.codigo_producto || '').trim();
  if (qr) return qr;
  const partes = [u.pasillo, u.estanteria, u.nivel_1, u.nivel_2]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join('-') : String(u.cod_ubicacion);
};

// // Normaliza texto opcional para evitar espacios vacios
const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

class InventarioEntradasService {
  // // Lee existencia por producto+ubicacion dentro de una transaccion (lock opcional)
  async obtenerInventarioPorProductoUbicacion({ codProducto, codUbicacion, transaction, forUpdate = false }) {
    // // Query base para localizar la fila de inventario de la combinacion
    const sql = `
      SELECT cod_inventario, cod_producto, cod_ubicacion, stock, stock_minimo, stock_maximo, fecha_ult_mov
      FROM inventario
      WHERE cod_producto = :codProducto
        AND cod_ubicacion = :codUbicacion
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `;

    const [fila] = await sequelize.query(sql, {
      replacements: { codProducto, codUbicacion },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
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

  // // Descuenta stock para reversar entrada con guardia anti inconsistencia por reservas
  async descontarStockPorAnulacion({ codInventario, cantidad, transaction }) {
    try {
      const [filas] = await sequelize.query(`
        UPDATE inventario
        SET stock = stock - :cantidad,
            fecha_ult_mov = NOW()
        WHERE cod_inventario = :codInventario
          AND (stock - COALESCE(stock_reservado, 0)) >= :cantidad
        RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
      `, {
        replacements: { codInventario, cantidad },
        transaction
      });

      const filasActualizadas = Array.isArray(filas) ? filas : [];
      return filasActualizadas[0] || null;
    } catch (error) {
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [filas] = await sequelize.query(`
        UPDATE inventario
        SET stock = stock - :cantidad,
            fecha_ult_mov = NOW()
        WHERE cod_inventario = :codInventario
          AND stock >= :cantidad
        RETURNING cod_inventario, cod_producto, cod_ubicacion, stock, fecha_ult_mov
      `, {
        replacements: { codInventario, cantidad },
        transaction
      });

      const filasActualizadas = Array.isArray(filas) ? filas : [];
      return filasActualizadas[0] || null;
    }
  }

  // // Obtiene y bloquea un movimiento puntual para procesos de anulacion seguros
  async obtenerMovimientoConBloqueoPorId({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.pk) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario sin PK; no es posible anular entradas de forma segura'),
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

  // // Valida si la entrada ya fue anulada previamente para evitar doble reverso
  async validarEntradaNoAnulada({ schemaMovimiento, codMovimiento, transaction }) {
    if (!schemaMovimiento.refTipo || !schemaMovimiento.refId) {
      throw Object.assign(
        new Error('Schema de movimiento_inventario no soporta ref_tipo/ref_id para anular entradas de forma segura'),
        { status: 500 }
      );
    }

    const [fila] = await sequelize.query(`
      SELECT 1 AS existe
      FROM ${schemaMovimiento.tableName} m
      WHERE UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) = 'SALIDA'
        AND CAST(m.${schemaMovimiento.refTipo} AS TEXT) = 'ANULACION_ENTRADA'
        AND m.${schemaMovimiento.refId} = :codMovimiento
      LIMIT 1
    `, {
      replacements: { codMovimiento },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    if (fila?.existe) {
      throw Object.assign(new Error('La entrada ya fue anulada previamente'), { status: 409 });
    }
  }

  // // Crea una nueva fila de inventario para producto+ubicacion con fallback si stock_reservado no existe
  async crearInventarioInicial({ codProducto, codUbicacion, cantidadInicial, transaction }) {
    try {
      // // Intentamos insertar incluyendo stock_reservado (schema HU2 reestructurada)
      await sequelize.query(`
        INSERT INTO inventario (
          cod_producto,
          cod_ubicacion,
          stock,
          stock_reservado,
          stock_minimo,
          stock_maximo,
          fecha_ult_mov
        ) VALUES (
          :codProducto,
          :codUbicacion,
          :cantidadInicial,
          0,
          0,
          0,
          NOW()
        )
      `, {
        replacements: { codProducto, codUbicacion, cantidadInicial },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });
    } catch (error) {
      // // Si la columna stock_reservado aun no existe, usamos insert compatible legacy
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      await sequelize.query(`
        INSERT INTO inventario (
          cod_producto,
          cod_ubicacion,
          stock,
          stock_minimo,
          stock_maximo,
          fecha_ult_mov
        ) VALUES (
          :codProducto,
          :codUbicacion,
          :cantidadInicial,
          0,
          0,
          NOW()
        )
      `, {
        replacements: { codProducto, codUbicacion, cantidadInicial },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });
    }

    // // Releemos la fila creada para obtener cod_inventario y devolverla al flujo
    return this.obtenerInventarioPorProductoUbicacion({
      codProducto,
      codUbicacion,
      transaction,
      forUpdate: true
    });
  }

  // // Inserta un movimiento ENTRADA en movimiento_inventario usando columnas reales detectadas
  async insertarMovimientoEntrada({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    referenciaDocumento,
    observaciones,
    transaction
  }) {
    // // Armamos columnas/valores dinamicos segun schema real del kardex
    const columnas = [];
    const valoresSql = [];
    const replacements = {};

    // // Vinculamos por cod_inventario si la tabla lo soporta
    if (schemaMovimiento.codInventario) {
      columnas.push(schemaMovimiento.codInventario);
      valoresSql.push(':codInventario');
      replacements.codInventario = codInventario;
    }

    // // Vinculamos por producto/ubicacion si la tabla lo soporta
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

    // // Guardamos usuario autenticado si la tabla tiene FK de usuario y viene en request
    if (schemaMovimiento.codUsuario && codUsuario) {
      columnas.push(schemaMovimiento.codUsuario);
      valoresSql.push(':codUsuario');
      replacements.codUsuario = codUsuario;
    }

    // // Campos funcionales obligatorios del kardex para la entrada
    columnas.push(schemaMovimiento.tipo);
    valoresSql.push(':tipoMovimiento');
    replacements.tipoMovimiento = 'ENTRADA';

    columnas.push(schemaMovimiento.cantidad);
    valoresSql.push(':cantidad');
    replacements.cantidad = cantidad;

    columnas.push(schemaMovimiento.fecha);
    valoresSql.push('NOW()');

    // // Referencia de documento de entrada si el schema dispone de columna
    if (schemaMovimiento.referencia) {
      columnas.push(schemaMovimiento.referencia);
      valoresSql.push(':referenciaDocumento');
      replacements.referenciaDocumento = referenciaDocumento;
    }

    // // Observaciones opcionales si el schema dispone de columna
    if (schemaMovimiento.observaciones) {
      columnas.push(schemaMovimiento.observaciones);
      valoresSql.push(':observaciones');
      replacements.observaciones = observaciones || null;
    }

    // // Insert con RETURNING para obtener el movimiento creado dentro de la misma transaccion
    const [filas] = await sequelize.query(`
      INSERT INTO ${schemaMovimiento.tableName} (${columnas.join(', ')})
      VALUES (${valoresSql.join(', ')})
      RETURNING *
    `, {
      replacements,
      transaction
    });

    // // Sequelize devuelve array de filas en la posicion 0 para INSERT ... RETURNING con pg
    const movimientoCreado = Array.isArray(filas) ? filas[0] : null;
    return movimientoCreado || null;
  }

  // // Inserta movimiento SALIDA que compensa una ENTRADA anulada
  async insertarMovimientoAnulacionEntrada({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codMovimientoEntrada,
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
    replacements.tipoMovimiento = 'SALIDA';

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
      replacements.refTipo = 'ANULACION_ENTRADA';
    }

    if (schemaMovimiento.refId) {
      columnas.push(schemaMovimiento.refId);
      valoresSql.push(':refId');
      replacements.refId = codMovimientoEntrada;
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

  // // Relee el movimiento insertado y lo devuelve con joins y aliases estables para UI/cliente
  async obtenerMovimientoFormateado({ schemaMovimiento, movimientoRow, transaction }) {
    // // Si no hubo row retornada por INSERT, devolvemos null y mantenemos respuesta minima
    if (!movimientoRow) return null;

    // // Contexto de joins segun FKs presentes en movimiento_inventario
    const exprCodProducto = schemaMovimiento.codProducto
      ? `m.${schemaMovimiento.codProducto}`
      : 'i.cod_producto';
    const exprCodUbicacion = schemaMovimiento.codUbicacion
      ? `m.${schemaMovimiento.codUbicacion}`
      : 'i.cod_ubicacion';
    const joinInventario = schemaMovimiento.codInventario
      ? `LEFT JOIN inventario i ON i.cod_inventario = m.${schemaMovimiento.codInventario}`
      : '';

    // // Si no hay PK en schema, devolvemos mapeo basico del row insertado sin reconsulta
    if (!schemaMovimiento.pk) {
      return {
        cod_movimiento: null,
        cod_inventario: movimientoRow[schemaMovimiento.codInventario] ?? null,
        cod_producto: movimientoRow[schemaMovimiento.codProducto] ?? null,
        cod_ubicacion: movimientoRow[schemaMovimiento.codUbicacion] ?? null,
        fecha_movimiento: movimientoRow[schemaMovimiento.fecha] ?? null,
        tipo: String(movimientoRow[schemaMovimiento.tipo] || 'ENTRADA').toUpperCase(),
        cantidad: Number(movimientoRow[schemaMovimiento.cantidad] || 0),
        referencia_documento: schemaMovimiento.referencia ? (movimientoRow[schemaMovimiento.referencia] ?? null) : null,
        observaciones: schemaMovimiento.observaciones ? (movimientoRow[schemaMovimiento.observaciones] ?? null) : null,
        cod_usuario: schemaMovimiento.codUsuario ? (movimientoRow[schemaMovimiento.codUsuario] ?? null) : null,
        nombre_usuario: null
      };
    }

    // // Reconsulta con joins para devolver nombres de producto/ubicacion/usuario listos para UI
    const [fila] = await sequelize.query(`
      SELECT
        m.${schemaMovimiento.pk} AS cod_movimiento,
        ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario}` : 'NULL::int'} AS cod_inventario,
        ${exprCodProducto} AS cod_producto,
        p.nombre_producto,
        ${exprCodUbicacion} AS cod_ubicacion,
        COALESCE(
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT),
          '-'
        ) AS ubicacion,
        CAST(m.${schemaMovimiento.fecha} AS TIMESTAMP) AS fecha_movimiento,
        UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) AS tipo,
        m.${schemaMovimiento.cantidad} AS cantidad,
        ${schemaMovimiento.referencia ? `CAST(m.${schemaMovimiento.referencia} AS TEXT)` : 'NULL::text'} AS referencia_documento,
        ${schemaMovimiento.observaciones ? `CAST(m.${schemaMovimiento.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaMovimiento.codUsuario ? `m.${schemaMovimiento.codUsuario}` : 'NULL::int'} AS cod_usuario,
        ${schemaMovimiento.codUsuario ? 'usu.nombre_usuario' : 'NULL::text'} AS nombre_usuario
      FROM ${schemaMovimiento.tableName} m
      ${joinInventario}
      LEFT JOIN producto p ON p.cod_producto = ${exprCodProducto}
      LEFT JOIN ubicacion u ON u.cod_ubicacion = ${exprCodUbicacion}
      ${schemaMovimiento.codUsuario ? `LEFT JOIN usuarios usu ON usu.cod_usuario = m.${schemaMovimiento.codUsuario}` : ''}
      WHERE m.${schemaMovimiento.pk} = :pkMovimiento
      LIMIT 1
    `, {
      replacements: { pkMovimiento: movimientoRow[schemaMovimiento.pk] },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // HU4: registra una entrada de inventario con trazabilidad en kardex (transaccion)
  async registrarEntrada(payload, options = {}) {
    // // Extraemos payload normalizado desde controller/ruta
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const cantidad = Number(payload.cantidad);
    const referenciaDocumento = String(payload.referencia_documento || '').trim();
    const observaciones = payload.observaciones ? String(payload.observaciones).trim() : null;
    // // Usuario autenticado (si existe) para trazabilidad del movimiento
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    // // Validacion de defensa en profundidad por si se invoca sin middleware de ruta
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('cantidad debe ser un entero mayor a 0'), { status: 400 });
    }

    // // Resolvemos schema real de movimientos para insertar el kardex dentro de la transaccion
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    // // Iniciamos transaccion Sequelize (patron usado en el repo)
    const t = await sequelize.transaction();

    try {
      // // Validamos que el producto exista y este activo
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      if (producto.estado_producto !== 'Activo') {
        throw Object.assign(new Error('El producto no esta activo para registrar entradas'), { status: 400 });
      }

      // // Validamos que la ubicacion exista y este activa
      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para registrar entradas'), { status: 400 });
      }

      // // Buscamos la fila de inventario para la combinacion producto-ubicacion con lock
      let inventarioRow = await this.obtenerInventarioPorProductoUbicacion({
        codProducto,
        codUbicacion,
        transaction: t,
        forUpdate: true
      });

      // // Si no existe, la creamos con stock inicial igual a la cantidad de entrada
      let stockAntes = 0;
      if (!inventarioRow) {
        inventarioRow = await this.crearInventarioInicial({
          codProducto,
          codUbicacion,
          cantidadInicial: cantidad,
          transaction: t
        });
      } else {
        // // Si existe, acumulamos stock y actualizamos fecha de ultimo movimiento
        stockAntes = Number(inventarioRow.stock || 0);
        await sequelize.query(`
          UPDATE inventario
          SET stock = stock + :cantidad,
              fecha_ult_mov = NOW()
          WHERE cod_inventario = :codInventario
        `, {
          replacements: {
            cantidad,
            codInventario: inventarioRow.cod_inventario
          },
          type: sequelize.QueryTypes.UPDATE,
          transaction: t
        });
      }

      // // Si la fila fue creada, el stock ya quedo con la cantidad inicial (stockAntes = 0)
      const codInventario = Number(inventarioRow?.cod_inventario);
      if (!codInventario) {
        throw Object.assign(new Error('No fue posible resolver el registro de inventario para la entrada'), { status: 500 });
      }

      // // Registramos movimiento de kardex tipo ENTRADA dentro de la misma transaccion
      const movimientoRow = await this.insertarMovimientoEntrada({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codUsuario,
        cantidad,
        referenciaDocumento,
        observaciones,
        transaction: t
      });

      // // Reconsultamos inventario actualizado para calcular stock despues y confirmar persistencia
      const inventarioDespues = await this.obtenerInventarioPorProductoUbicacion({
        codProducto,
        codUbicacion,
        transaction: t,
        forUpdate: false
      });

      // // Obtenemos movimiento formateado con joins si el schema permite PK y columnas conocidas
      const movimiento = await this.obtenerMovimientoFormateado({
        schemaMovimiento,
        movimientoRow,
        transaction: t
      });

      // // Commit de la transaccion: inventario y kardex quedan consistentes
      await t.commit();

      // // Leemos existencia completa con helper HU2 fuera de transaccion para respuesta unificada
      const inventarioActualizado = await inventarioExistenciasService.obtenerExistenciaPorId(codInventario);

      // // Respuesta final con movimiento + inventario actualizado y metadatos utiles para auditoria
      return {
        movimiento: movimiento || {
          cod_inventario: codInventario,
          cod_producto: codProducto,
          nombre_producto: producto.nombre_producto,
          cod_ubicacion: codUbicacion,
          ubicacion: construirEtiquetaUbicacion(ubicacion),
          tipo: 'ENTRADA',
          cantidad,
          referencia_documento: referenciaDocumento,
          observaciones,
          fecha_movimiento: new Date().toISOString(),
          cod_usuario: codUsuario,
          nombre_usuario: options?.usuario?.nombre_usuario ?? null
        },
        inventario: inventarioActualizado,
        resumen: {
          cod_inventario: codInventario,
          stock_antes: stockAntes,
          stock_despues: Number(inventarioDespues?.stock || cantidad),
          cantidad_entrada: cantidad
        }
      };
    } catch (error) {
      // // Rollback total si falla cualquier paso (movimiento o update de inventario)
      await t.rollback();
      throw error;
    }
  }

  // // Anula una ENTRADA con movimiento compensatorio SALIDA y control transaccional
  async anularEntrada(codMovimientoEntrada, payload = {}, options = {}) {
    const codMovimiento = Number(codMovimientoEntrada);
    if (!Number.isInteger(codMovimiento) || codMovimiento < 1) {
      throw Object.assign(new Error('id de movimiento invalido para anular entrada'), { status: 400 });
    }

    const motivo = normalizarTexto(payload.motivo) || 'ANULACION_ENTRADA';
    const referenciaManual = normalizarTexto(payload.referencia);
    const observacionesManual = normalizarTexto(payload.observaciones);
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      const movimientoEntrada = await this.obtenerMovimientoConBloqueoPorId({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      if (!movimientoEntrada) {
        throw Object.assign(new Error('Movimiento de entrada no encontrado'), { status: 404 });
      }

      const tipoMovimiento = String(movimientoEntrada[schemaMovimiento.tipo] || '').trim().toUpperCase();
      if (tipoMovimiento !== 'ENTRADA') {
        throw Object.assign(new Error('Solo se pueden anular movimientos tipo ENTRADA'), { status: 409 });
      }

      await this.validarEntradaNoAnulada({
        schemaMovimiento,
        codMovimiento,
        transaction: t
      });

      const cantidad = Number(movimientoEntrada[schemaMovimiento.cantidad] || 0);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw Object.assign(new Error('El movimiento de entrada tiene cantidad invalida para anulacion'), { status: 409 });
      }

      let codInventario = Number(movimientoEntrada.ref_cod_inventario || 0);
      let codProducto = Number(movimientoEntrada.ref_cod_producto || 0);
      let codUbicacion = Number(movimientoEntrada.ref_cod_ubicacion || 0);

      if (!codInventario && Number.isInteger(codProducto) && codProducto > 0 && Number.isInteger(codUbicacion) && codUbicacion > 0) {
        const inventarioAsociado = await this.obtenerInventarioPorProductoUbicacion({
          codProducto,
          codUbicacion,
          transaction: t,
          forUpdate: true
        });
        codInventario = Number(inventarioAsociado?.cod_inventario || 0);
      }

      if (!codInventario) {
        throw Object.assign(new Error('No fue posible resolver inventario asociado a la entrada'), { status: 500 });
      }

      const inventarioAntes = await this.obtenerInventarioPorIdConBloqueo({
        codInventario,
        transaction: t
      });

      if (!inventarioAntes) {
        throw Object.assign(new Error('Inventario asociado no encontrado para anular entrada'), { status: 404 });
      }

      codProducto = Number(codProducto || inventarioAntes.cod_producto || 0);
      codUbicacion = Number(codUbicacion || inventarioAntes.cod_ubicacion || 0);

      const stockAntes = Number(inventarioAntes.stock || 0);
      const stockReservado = Number(inventarioAntes.stock_reservado || 0);
      const stockDisponibleAntes = stockAntes - stockReservado;

      if (stockDisponibleAntes < cantidad) {
        throw Object.assign(
          new Error(`No se puede anular entrada: disponible actual ${stockDisponibleAntes}, cantidad a revertir ${cantidad}`),
          { status: 409 }
        );
      }

      const inventarioActualizadoTx = await this.descontarStockPorAnulacion({
        codInventario,
        cantidad,
        transaction: t
      });

      if (!inventarioActualizadoTx) {
        throw Object.assign(
          new Error('Conflicto de concurrencia al anular entrada. Intente nuevamente'),
          { status: 409 }
        );
      }

      const referenciaOriginal = schemaMovimiento.referencia
        ? normalizarTexto(movimientoEntrada[schemaMovimiento.referencia])
        : null;
      const referenciaBase = referenciaOriginal
        ? referenciaOriginal.replace(/\s+/g, '-')
        : `MOV-${codMovimiento}`;
      const referenciaDocumento = (referenciaManual || `ANULA-${referenciaBase}`).slice(0, 200);

      const observacionesSistema = [
        `Anulacion de entrada #${codMovimiento}`,
        observacionesManual
      ].filter(Boolean).join(' | ').slice(0, 500);

      const movimientoRow = await this.insertarMovimientoAnulacionEntrada({
        schemaMovimiento,
        codInventario,
        codProducto,
        codUbicacion,
        codMovimientoEntrada: codMovimiento,
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
          fecha_movimiento: movimientoEntrada[schemaMovimiento.fecha] ?? null,
          tipo: 'ENTRADA',
          cantidad,
          referencia_documento: referenciaOriginal
        },
        movimiento_anulacion: movimientoAnulacion || {
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          tipo: 'SALIDA',
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
          stock_disponible_antes: stockDisponibleAntes,
          cantidad_revertida: cantidad,
          stock_despues: Number(inventarioActualizado?.stock ?? inventarioActualizadoTx.stock ?? (stockAntes - cantidad))
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

export default new InventarioEntradasService();

