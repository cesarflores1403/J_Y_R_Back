import pool from '../config/db-connection.js';

// =====================================================
// MODELO: Producto
// Trabaja con la tabla real "producto"
// Usa Procedures: pa_insert, pa_update, pa_delete
// =====================================================

// =======================
// HU-04: Generar código formateado PROD-XXXX
// =======================
export const formatCodProducto = (cod) => {
  if (!cod) return null;
  return `PROD-${String(cod).padStart(4, '0')}`;
};

// =======================
// GET PRODUCTOS (con detalle ISV del catálogo)
// =======================
export const getProducto = async () => {
  const query = `
    SELECT p.cod_producto, p.cod_categoria, p.nombre_producto,
           p.unidad_medida, p.precio_venta, p.cod_isv,
           COALESCE(i.porcentaje, 0) AS isv_porcentaje,
           COALESCE(i.descripcion, 'Sin ISV') AS isv_descripcion,
           p.estado_producto, p.imagen_url, p.cod_ubicacion,
           u.pasillo AS ubi_pasillo, u.estanteria AS ubi_estanteria,
           u.nivel_1 AS ubi_nivel_1, u.nivel_2 AS ubi_nivel_2,
           u.codigo_qr AS ubi_codigo_qr
    FROM producto p
    LEFT JOIN catalogo_isv i ON p.cod_isv = i.cod_isv
    LEFT JOIN ubicacion u ON p.cod_ubicacion = u.cod_ubicacion
    ORDER BY p.cod_producto
  `;
  const result = await pool.query(query);

  // HU-04: Agregar codigo_producto formateado a cada fila
  return (result.rows || []).map(row => ({
    ...row,
    codigo_producto: formatCodProducto(row.cod_producto)
  }));
};

// =======================
// INSERT PRODUCTO (HU-04: retorna el producto creado con cod_producto)
// =======================
export const createProducto = async (datos) => {
  const tabla = 'producto';
  const datosJson = JSON.stringify(datos);
  const queryInsert = 'CALL public.pa_insert($1, $2::json)';

  // // 1. Insertar producto
  await pool.query(queryInsert, [tabla, datosJson]);

  // // 2. Buscar el producto recién creado por nombre (método confiable con Supabase pooler)
  const buscar = `
    SELECT cod_producto, nombre_producto, cod_categoria,
           unidad_medida, precio_venta, cod_isv, estado_producto
    FROM producto
    WHERE LOWER(TRIM(nombre_producto)) = LOWER(TRIM($1))
    ORDER BY cod_producto DESC
    LIMIT 1
  `;
  const result = await pool.query(buscar, [datos.nombre_producto]);

  // HU-04: Agregar codigo_producto formateado
  const producto = result.rows[0] || null;
  if (producto) {
    producto.codigo_producto = formatCodProducto(producto.cod_producto);
  }
  return producto;
};

// =======================
// HU-08: Obtener imagen_url de un producto
// =======================
export const getImagenProducto = async (cod_producto) => {
  const query = `SELECT imagen_url FROM producto WHERE cod_producto = $1`;
  const result = await pool.query(query, [cod_producto]);
  return result.rows[0] || null;
};

// =======================
// HU-08: Actualizar imagen_url de un producto
// =======================
export const updateImagenProducto = async (cod_producto, imagen_url) => {
  const query = `UPDATE producto SET imagen_url = $1 WHERE cod_producto = $2`;
  await pool.query(query, [imagen_url, cod_producto]);
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
