// =====================================================
// MIGRACIÓN: Agregar campo imagen_url a tabla producto
// HU-08: Cargar imagen del producto y vincularla al código
// Ejecutar: node scripts/migrate_producto_imagen.js
// =====================================================
import pool from '../src/config/db-connection.js';

const migrate = async () => {
  try {
    console.log('Verificando columna imagen_url en tabla producto...');

    // Verificar si la columna ya existe
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'producto' AND column_name = 'imagen_url'
    `);

    if (check.rows.length > 0) {
      console.log('✅ La columna imagen_url ya existe. No se requiere migración.');
    } else {
      await pool.query(`
        ALTER TABLE producto
        ADD COLUMN imagen_url VARCHAR(500) DEFAULT NULL
      `);
      console.log('✅ Columna imagen_url agregada exitosamente a tabla producto.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  }
};

migrate();
