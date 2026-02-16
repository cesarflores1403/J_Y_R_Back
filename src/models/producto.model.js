import pool from '../config/db-connection.js';

// =====================================================
// MODELO: Producto
// Trabaja con la tabla real "producto"
// Usa Procedures: pa_insert, pa_update, pa_delete
// =====================================================

// =======================
// GET PRODUCTOS
// =======================
export const getProducto = async () => {
  const tabla = 'producto'; // // Nombre real de la tabla

  const columnas =
    'cod_producto, cod_categoria, nombre_producto, unidad_medida, precio_venta, isv, estado_producto'; // // Columnas reales

  const query = 'SELECT function_select($1, $2) as resultado'; // // Llama función select genérica
  const result = await pool.query(query, [tabla, columnas]); // // Ejecuta query

  return result.rows[0].resultado || []; // // Retorna arreglo o vacío
};

// =======================
// INSERT PRODUCTO
// =======================
export const createProducto = async (datos) => {
  const tabla = 'producto'; // // Tabla real

  const datosJson = JSON.stringify(datos); // // Convertir objeto JS a JSON válido

  const query = 'CALL public.pa_insert($1, $2::json)'; // // Forzamos tipo JSON

  await pool.query(query, [tabla, datosJson]); // // Ejecuta procedure
};

// =======================
// UPDATE PRODUCTO
// =======================
export const updateProducto = async ({ cod_producto, datos }) => {
  const tabla = 'producto'; // // Tabla real
  const id_campo = 'cod_producto'; // // PK real

  // // Validación mínima
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('Datos inválidos para actualizar');
  }

  const entries = Object.entries(datos);

  if (entries.length === 0) {
    throw new Error('No se enviaron campos para actualizar');
  }

  // // 1 campo por vez (pa_update)
  for (const [campo, valor] of entries) {
    const datosJson = JSON.stringify({ [campo]: valor }); // // JSON con 1 campo

    const query = 'CALL public.pa_update($1::text, $2::json, $3::text, $4::text)'; // // Firma real

    await pool.query(query, [
      tabla, // // tbl_nombre
      datosJson, // // datos_json
      id_campo, // // col_condicion
      String(cod_producto), // // val_condicion
    ]);
  }
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (cod_producto) => {
  const tabla = 'producto'; // // Tabla real

  const query = 'CALL public.pa_delete($1, $2, $3)'; // // (tabla, columna, valor)

  await pool.query(query, [
    tabla,
    'cod_producto', // // PK real
    String(cod_producto), // // Valor como texto
  ]);
};
