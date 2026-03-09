// =====================================================
// HU-10: Migración — Agregar cod_ubicacion a producto
// Vincula producto con catálogo de ubicaciones (bodega)
// =====================================================
import pool from '../src/config/db-connection.js';

const run = async () => {
  try {
    console.log('🔄 Verificando columna cod_ubicacion en producto...');

    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'producto' AND column_name = 'cod_ubicacion'
    `);

    if (check.rows.length > 0) {
      console.log('✅ La columna cod_ubicacion ya existe. No se requieren cambios.');
    } else {
      await pool.query(`
        ALTER TABLE producto
        ADD COLUMN cod_ubicacion INTEGER NULL
        REFERENCES ubicacion(cod_ubicacion)
      `);
      console.log('✅ Columna cod_ubicacion agregada a producto con FK a ubicacion.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  }
};

run();
