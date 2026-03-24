import * as productoModel from '../models/productoModel.js';
import pool from '../config/db-connection.js';
import fs from 'fs';
import path from 'path';
import bitacoraFacturacionService from './bitacoraFacturacionService.js';

// =====================================================
// SERVICE: Producto
// Intermediario entre controller y model
// HU-03: Normalización y validación de reglas de negocio
// =====================================================

// =======================
// NORMALIZAR DATOS (trim, mayúsculas donde aplica)
// =======================
const normalizar = (datos) => {
  const resultado = { ...datos };

  // Trim de strings
  if (resultado.nombre_producto && typeof resultado.nombre_producto === 'string') {
    resultado.nombre_producto = resultado.nombre_producto.trim();
  }

  // Unidad de medida: trim + MAYÚSCULAS
  if (resultado.unidad_medida && typeof resultado.unidad_medida === 'string') {
    resultado.unidad_medida = resultado.unidad_medida.trim().toUpperCase();
  }

  // Numéricos
  if (resultado.precio_venta !== undefined) {
    resultado.precio_venta = Number(resultado.precio_venta);
  }
  if (resultado.cod_categoria !== undefined) {
    resultado.cod_categoria = Number(resultado.cod_categoria);
  }
  if (resultado.cod_isv !== undefined) {
    resultado.cod_isv = Number(resultado.cod_isv);
  }

  // HU-10: Normalizar cod_ubicacion
  if (resultado.cod_ubicacion !== undefined) {
    resultado.cod_ubicacion = resultado.cod_ubicacion === '' || resultado.cod_ubicacion === null
      ? null
      : Number(resultado.cod_ubicacion);
  }

  return resultado;
};

// =======================
// HU-04: VERIFICAR UNICIDAD DE cod_producto
// =======================
const verificarCodProductoExistente = async (cod_producto) => {
  const query = `SELECT cod_producto, nombre_producto FROM producto WHERE cod_producto = $1`;
  const result = await pool.query(query, [cod_producto]);
  if (result.rows.length > 0) {
    const error = new Error(
      `Ya existe un producto con el código ${cod_producto} ("${result.rows[0].nombre_producto}"). El código de producto debe ser único.`
    );
    error.status = 409;
    throw error;
  }
};

// =======================
// HU-10: VERIFICAR UBICACIÓN EXISTENTE Y ACTIVA
// =======================
const verificarUbicacionExistente = async (cod_ubicacion) => {
  const query = `SELECT cod_ubicacion, estado_ubi FROM ubicacion WHERE cod_ubicacion = $1`;
  const result = await pool.query(query, [cod_ubicacion]);
  if (result.rows.length === 0) {
    const error = new Error(`La ubicación con código ${cod_ubicacion} no existe.`);
    error.status = 400;
    throw error;
  }
  if (result.rows[0].estado_ubi !== 'ACTIVA') {
    const error = new Error(`La ubicación ${cod_ubicacion} está inactiva. Solo se pueden asignar ubicaciones activas.`);
    error.status = 400;
    throw error;
  }
};

// =======================
// VERIFICAR NOMBRE DUPLICADO
// =======================
const verificarDuplicado = async (nombre_producto, codExcluir = null) => {
  const nombre = nombre_producto.trim().toLowerCase();
  let query = `SELECT cod_producto, nombre_producto FROM producto WHERE LOWER(TRIM(nombre_producto)) = $1`;
  const params = [nombre];

  if (codExcluir) {
    query += ` AND cod_producto != $2`;
    params.push(codExcluir);
  }

  const result = await pool.query(query, params);
  if (result.rows.length > 0) {
    const error = new Error(`Ya existe un producto con el nombre "${result.rows[0].nombre_producto}".`);
    error.status = 409;
    throw error;
  }
};

// =======================
// GET PRODUCTO(S)
// =======================
export const getProducto = async () => {
  return await productoModel.getProducto();
};

// =======================
// CREATE PRODUCTO (HU-04: validar unicidad + retornar producto creado)
// =======================
export const createProducto = async (datos) => {
  const datosNorm = normalizar(datos);
  const stockInicial = Number.isFinite(Number(datosNorm.stock_inicial))
    ? Number(datosNorm.stock_inicial)
    : 0;

  if (!Number.isInteger(stockInicial) || stockInicial < 0) {
    const error = new Error('stock_inicial debe ser un entero mayor o igual a 0.');
    error.status = 400;
    throw error;
  }

  if (stockInicial > 0 && !datosNorm.cod_ubicacion) {
    const error = new Error('Debe seleccionar una ubicación para asignar stock inicial.');
    error.status = 400;
    throw error;
  }

  const datosProducto = { ...datosNorm };
  delete datosProducto.stock_inicial;

  // HU-04: Si se envió cod_producto manual, verificar unicidad
  if (datosProducto.cod_producto !== undefined && datosProducto.cod_producto !== null) {
    await verificarCodProductoExistente(datosProducto.cod_producto);
  }

  // Verificar duplicado por nombre
  await verificarDuplicado(datosProducto.nombre_producto);

  // HU-10: Validar que la ubicación exista si se envió
  if (datosProducto.cod_ubicacion) {
    await verificarUbicacionExistente(datosProducto.cod_ubicacion);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insertar y retornar el producto creado (con cod_producto asignado)
    const productoCreado = await productoModel.createProducto(datosProducto, client);

    if (!productoCreado?.cod_producto) {
      throw Object.assign(new Error('No se pudo identificar el producto recién creado.'), { status: 500 });
    }

    if (stockInicial > 0) {
      const codProducto = Number(productoCreado.cod_producto);
      const codUbicacion = Number(datosProducto.cod_ubicacion);

      const inventarioExistente = await client.query(
        `
          SELECT cod_inventario
          FROM inventario
          WHERE cod_producto = $1 AND cod_ubicacion = $2
          LIMIT 1
          FOR UPDATE
        `,
        [codProducto, codUbicacion]
      );

      if (inventarioExistente.rows.length > 0) {
        await client.query(
          `
            UPDATE inventario
            SET stock = stock + $3,
                fecha_ult_mov = NOW()
            WHERE cod_producto = $1 AND cod_ubicacion = $2
          `,
          [codProducto, codUbicacion, stockInicial]
        );
      } else {
        try {
          await client.query(
            `
              INSERT INTO inventario (
                cod_producto,
                cod_ubicacion,
                stock,
                stock_reservado,
                stock_minimo,
                stock_maximo,
                fecha_ult_mov
              )
              VALUES ($1, $2, $3, 0, 0, 0, NOW())
            `,
            [codProducto, codUbicacion, stockInicial]
          );
        } catch (error) {
          // Compatibilidad con esquemas donde stock_reservado todavía no existe.
          if (error?.code !== '42703') throw error;

          await client.query(
            `
              INSERT INTO inventario (
                cod_producto,
                cod_ubicacion,
                stock,
                stock_minimo,
                stock_maximo,
                fecha_ult_mov
              )
              VALUES ($1, $2, $3, 0, 0, NOW())
            `,
            [codProducto, codUbicacion, stockInicial]
          );
        }
      }

      productoCreado.stock_total = stockInicial;
    } else {
      productoCreado.stock_total = 0;
    }

    await client.query('COMMIT');
    return productoCreado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// =======================
// UPDATE PRODUCTO
// =======================
export const updateProducto = async ({ cod_producto, datos = {}, stock_agregar = 0, stock_nuevo = null }) => {
  const datosNorm = normalizar(datos || {});
  const stockAgregar = Number.isFinite(Number(stock_agregar))
    ? Number(stock_agregar)
    : 0;
  const stockNuevoDefinido = stock_nuevo !== undefined && stock_nuevo !== null && stock_nuevo !== '';
  const stockNuevo = stockNuevoDefinido ? Number(stock_nuevo) : null;

  if (!Number.isInteger(stockAgregar) || stockAgregar < 0) {
    const error = new Error('stock_agregar debe ser un entero mayor o igual a 0.');
    error.status = 400;
    throw error;
  }

  if (stockNuevoDefinido && (!Number.isInteger(stockNuevo) || stockNuevo < 0)) {
    const error = new Error('stock_nuevo debe ser un entero mayor o igual a 0.');
    error.status = 400;
    throw error;
  }

  // Si se actualiza nombre, verificar duplicado excluyendo el producto actual
  if (datosNorm.nombre_producto) {
    await verificarDuplicado(datosNorm.nombre_producto, cod_producto);
  }

  // HU-10: Validar ubicación si se envió
  if (datosNorm.cod_ubicacion) {
    await verificarUbicacionExistente(datosNorm.cod_ubicacion);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (Object.keys(datosNorm).length > 0) {
      await productoModel.updateProducto({
        cod_producto,
        datos: datosNorm
      }, client);
    }

    if (stockAgregar > 0 || stockNuevoDefinido) {
      const productoResult = await client.query(
        `
          SELECT cod_ubicacion
          FROM producto
          WHERE cod_producto = $1
          LIMIT 1
          FOR UPDATE
        `,
        [cod_producto]
      );

      if (productoResult.rows.length === 0) {
        const error = new Error(`Producto con código ${cod_producto} no encontrado.`);
        error.status = 404;
        throw error;
      }

      let codUbicacionFinal = productoResult.rows[0].cod_ubicacion;

      if (!codUbicacionFinal) {
        // Fallback para datos heredados: si existe inventario previo,
        // usar esa ubicación para no bloquear la suma de stock.
        const inventarioBase = await client.query(
          `
            SELECT cod_ubicacion
            FROM inventario
            WHERE cod_producto = $1
            ORDER BY stock DESC, fecha_ult_mov DESC NULLS LAST, cod_inventario DESC
            LIMIT 1
            FOR UPDATE
          `,
          [cod_producto]
        );

        if (inventarioBase.rows.length > 0 && inventarioBase.rows[0].cod_ubicacion) {
          codUbicacionFinal = inventarioBase.rows[0].cod_ubicacion;

          await productoModel.updateProducto({
            cod_producto,
            datos: { cod_ubicacion: codUbicacionFinal }
          }, client);
        } else {
          const error = new Error('El producto no tiene ubicación asignada. Asigne una ubicación antes de agregar stock.');
          error.status = 400;
          throw error;
        }
      }

      const inventarioExistente = await client.query(
        `
          SELECT cod_inventario, cod_ubicacion
          FROM inventario
          WHERE cod_producto = $1 AND cod_ubicacion = $2
          LIMIT 1
          FOR UPDATE
        `,
        [cod_producto, codUbicacionFinal]
      );

      const stockObjetivo = stockNuevoDefinido ? (stockNuevo + stockAgregar) : null;

      if (inventarioExistente.rows.length > 0) {
        if (stockObjetivo !== null) {
          await client.query(
            `
              UPDATE inventario
              SET stock = $3,
                  fecha_ult_mov = NOW()
              WHERE cod_producto = $1 AND cod_ubicacion = $2
            `,
            [cod_producto, codUbicacionFinal, stockObjetivo]
          );
        } else {
          await client.query(
            `
              UPDATE inventario
              SET stock = stock + $3,
                  fecha_ult_mov = NOW()
              WHERE cod_producto = $1 AND cod_ubicacion = $2
            `,
            [cod_producto, codUbicacionFinal, stockAgregar]
          );
        }
      } else {
        const inventarioAlterno = await client.query(
          `
            SELECT cod_inventario, cod_ubicacion
            FROM inventario
            WHERE cod_producto = $1
            ORDER BY stock DESC, fecha_ult_mov DESC NULLS LAST, cod_inventario DESC
            LIMIT 1
            FOR UPDATE
          `,
          [cod_producto]
        );

        if (inventarioAlterno.rows.length > 0) {
          if (stockObjetivo !== null) {
            await client.query(
              `
                UPDATE inventario
                SET cod_ubicacion = $2,
                    stock = $3,
                    fecha_ult_mov = NOW()
                WHERE cod_inventario = $1
              `,
              [inventarioAlterno.rows[0].cod_inventario, codUbicacionFinal, stockObjetivo]
            );
          } else {
            await client.query(
              `
                UPDATE inventario
                SET cod_ubicacion = $2,
                    stock = stock + $3,
                    fecha_ult_mov = NOW()
                WHERE cod_inventario = $1
              `,
              [inventarioAlterno.rows[0].cod_inventario, codUbicacionFinal, stockAgregar]
            );
          }
        } else {
          try {
            await client.query(
              `
                INSERT INTO inventario (
                  cod_producto,
                  cod_ubicacion,
                  stock,
                  stock_reservado,
                  stock_minimo,
                  stock_maximo,
                  fecha_ult_mov
                )
                VALUES ($1, $2, $3, 0, 0, 0, NOW())
              `,
              [cod_producto, codUbicacionFinal, stockObjetivo !== null ? stockObjetivo : stockAgregar]
            );
          } catch (error) {
            if (error?.code !== '42703') throw error;

            await client.query(
              `
                INSERT INTO inventario (
                  cod_producto,
                  cod_ubicacion,
                  stock,
                  stock_minimo,
                  stock_maximo,
                  fecha_ult_mov
                )
                VALUES ($1, $2, $3, 0, 0, NOW())
              `,
              [cod_producto, codUbicacionFinal, stockObjetivo !== null ? stockObjetivo : stockAgregar]
            );
          }
        }
      }

      // Limpia filas huérfanas vacías del mismo producto para evitar duplicados visuales.
      try {
        await client.query(
          `
            DELETE FROM inventario
            WHERE cod_producto = $1
              AND cod_ubicacion <> $2
              AND stock = 0
              AND COALESCE(stock_reservado, 0) = 0
          `,
          [cod_producto, codUbicacionFinal]
        );
      } catch (error) {
        if (error?.code !== '42703') throw error;

        await client.query(
          `
            DELETE FROM inventario
            WHERE cod_producto = $1
              AND cod_ubicacion <> $2
              AND stock = 0
          `,
          [cod_producto, codUbicacionFinal]
        );
      }
    }

    await client.query('COMMIT');
    return {
      cod_producto,
      stock_agregado: stockAgregar,
      stock_nuevo: stockNuevoDefinido ? stockNuevo : null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (cod_producto) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Intentar limpiar existencias del producto para habilitar eliminación cuando solo hay inventario asociado.
    await client.query('DELETE FROM inventario WHERE cod_producto = $1', [cod_producto]);

    await productoModel.deleteProducto(cod_producto, client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23503') {
      const err = new Error('No se puede eliminar el producto porque ya tiene historial relacionado (ventas, compras, kardex o documentos). Puede marcarlo como Inactivo o Descontinuado.');
      err.status = 400;
      throw err;
    }
    throw error;
  } finally {
    client.release();
  }
};

// =======================
// CAMBIAR ESTADO PRODUCTO (Activo / Inactivo / Descontinuado)
// =======================
export const cambiarEstado = async (cod_producto, estado) => {
  const estadosValidos = ['Activo', 'Inactivo', 'Descontinuado'];
  if (!estadosValidos.includes(estado)) {
    const error = new Error(`Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`);
    error.status = 400;
    throw error;
  }
  return await productoModel.updateProducto({
    cod_producto,
    datos: { estado_producto: estado }
  });
};

// =======================
// CAMBIAR ESTADO MASIVO PRODUCTOS
// =======================
export const cambiarEstadoMasivo = async ({ cod_productos, estado, cod_usuario = null, nombre_usuario = null, ip = null }) => {
  const estadosValidos = ['Activo', 'Inactivo', 'Descontinuado'];
  if (!estadosValidos.includes(estado)) {
    const error = new Error(`Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const exitos = [];
  const fallos = [];

  for (const cod of cod_productos) {
    try {
      const id = Number(cod);
      const existe = await pool.query(
        'SELECT cod_producto, nombre_producto, estado_producto FROM producto WHERE cod_producto = $1',
        [id]
      );

      if (existe.rows.length === 0) {
        fallos.push({ cod_producto: id, motivo: 'Producto no encontrado' });
        continue;
      }

      const actual = existe.rows[0];

      await productoModel.updateProducto({
        cod_producto: id,
        datos: { estado_producto: estado }
      });

      exitos.push({
        cod_producto: id,
        nombre_producto: actual.nombre_producto,
        estado_anterior: actual.estado_producto,
        estado_nuevo: estado
      });
    } catch (err) {
      fallos.push({ cod_producto: Number(cod), motivo: err.message || 'Error al actualizar estado' });
    }
  }

  // Registrar en bitácora (sin bloquear la operación principal)
  try {
    await bitacoraFacturacionService.registrar({
      evento: 'PRODUCTO_ESTADO_MASIVO',
      entidad: 'PRODUCTO',
      cod_usuario,
      nombre_usuario,
      ip,
      detalle: {
        estado_objetivo: estado,
        total_solicitados: cod_productos.length,
        exitos: exitos.length,
        fallos: fallos.length,
        codigos_exitos: exitos.map(x => x.cod_producto),
        codigos_fallos: fallos.map(f => ({ cod_producto: f.cod_producto, motivo: f.motivo }))
      }
    });
  } catch (logErr) {
    console.error('⚠️ Error al registrar bitácora (estado masivo producto):', logErr.message);
  }

  return {
    resumen: {
      solicitados: cod_productos.length,
      exitos: exitos.length,
      fallos: fallos.length,
      estado_objetivo: estado
    },
    exitos,
    fallos
  };
};

// =======================
// HU-08: Subir/reemplazar imagen del producto
// =======================
export const subirImagen = async (cod_producto, file) => {
  // Verificar que el producto existe
  const existe = await pool.query('SELECT cod_producto, imagen_url FROM producto WHERE cod_producto = $1', [cod_producto]);
  if (existe.rows.length === 0) {
    const error = new Error(`Producto con código ${cod_producto} no encontrado.`);
    error.status = 404;
    throw error;
  }

  // Si ya tiene imagen, eliminar el archivo anterior
  const imagenAnterior = existe.rows[0].imagen_url;
  if (imagenAnterior) {
    const rutaAnterior = path.resolve(imagenAnterior.replace(/^\//, ''));
    if (fs.existsSync(rutaAnterior)) {
      fs.unlinkSync(rutaAnterior);
    }
  }

  // Guardar nueva ruta en BD
  const imagen_url = `/uploads/productos/${file.filename}`;
  await productoModel.updateImagenProducto(cod_producto, imagen_url);

  return imagen_url;
};

// =======================
// HU-08: Eliminar imagen del producto
// =======================
export const eliminarImagen = async (cod_producto) => {
  const existe = await pool.query('SELECT cod_producto, imagen_url FROM producto WHERE cod_producto = $1', [cod_producto]);
  if (existe.rows.length === 0) {
    const error = new Error(`Producto con código ${cod_producto} no encontrado.`);
    error.status = 404;
    throw error;
  }

  const imagenActual = existe.rows[0].imagen_url;
  if (!imagenActual) {
    const error = new Error('El producto no tiene imagen asignada.');
    error.status = 400;
    throw error;
  }

  // Eliminar archivo físico
  const rutaArchivo = path.resolve(imagenActual.replace(/^\//, ''));
  if (fs.existsSync(rutaArchivo)) {
    fs.unlinkSync(rutaArchivo);
  }

  // Limpiar campo en BD
  await productoModel.updateImagenProducto(cod_producto, null);
};