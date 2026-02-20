import pool from '../config/db-connection.js';

// =====================================================
// MODELO: catalogo_isv (raw SQL)
// Catálogo de tipos de ISV
// =====================================================

// =======================
// GET - Todos los ISV activos
// =======================
export const getIsv = async () => {
  const query = `SELECT cod_isv, porcentaje, descripcion, estado
                 FROM catalogo_isv
                 WHERE estado = true
                 ORDER BY cod_isv`;
  const result = await pool.query(query);
  return result.rows || [];
};

// =======================
// GET - Todos los ISV (incluye inactivos)
// =======================
export const getAllIsv = async () => {
  const query = `SELECT cod_isv, porcentaje, descripcion, estado
                 FROM catalogo_isv
                 ORDER BY cod_isv`;
  const result = await pool.query(query);
  return result.rows || [];
};

// =======================
// GET - ISV por código
// =======================
export const getIsvByCod = async (cod_isv) => {
  const query = `SELECT cod_isv, porcentaje, descripcion, estado
                 FROM catalogo_isv
                 WHERE cod_isv = $1`;
  const result = await pool.query(query, [cod_isv]);
  return result.rows[0] || null;
};
