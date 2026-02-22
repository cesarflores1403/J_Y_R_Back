import * as productoModel from '../models/productoModel.js';
import pool from '../config/db-connection.js';

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

  // HU-04: Si se envió cod_producto manual, verificar unicidad
  if (datosNorm.cod_producto !== undefined && datosNorm.cod_producto !== null) {
    await verificarCodProductoExistente(datosNorm.cod_producto);
  }

  // Verificar duplicado por nombre
  await verificarDuplicado(datosNorm.nombre_producto);

  // Insertar y retornar el producto creado (con cod_producto asignado)
  const productoCreado = await productoModel.createProducto(datosNorm);
  return productoCreado;
};

// =======================
// UPDATE PRODUCTO
// =======================
export const updateProducto = async ({ cod_producto, datos }) => {
  const datosNorm = normalizar(datos);

  // Si se actualiza nombre, verificar duplicado excluyendo el producto actual
  if (datosNorm.nombre_producto) {
    await verificarDuplicado(datosNorm.nombre_producto, cod_producto);
  }

  return await productoModel.updateProducto({
    cod_producto,
    datos: datosNorm
  });
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (cod_producto) => {
  return await productoModel.deleteProducto(cod_producto);
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