// Ejemplo de servicio (lógica de negocio)
const pool = require('../config/database');

const getAllUsers = async () => {
  try {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  } catch (error) {
    throw new Error('Error al obtener usuarios: ' + error.message);
  }
};

const getUserById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    throw new Error('Error al obtener usuario: ' + error.message);
  }
};

const createUser = async (userData) => {
  try {
    const { name, email, password } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, password]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error('Error al crear usuario: ' + error.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser
};
