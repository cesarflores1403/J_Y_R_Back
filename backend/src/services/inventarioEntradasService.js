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
          NULLIF(u.codigo_producto, ''),
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT)
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
}

export default new InventarioEntradasService();

