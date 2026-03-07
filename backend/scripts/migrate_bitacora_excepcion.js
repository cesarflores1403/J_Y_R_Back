import { sequelize } from '../src/config/sequelize.js';

async function migrate() {
  try {
    console.log('=== Migración: bitacora_excepcion_stock (HU-FAC-09) ===');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bitacora_excepcion_stock (
        cod_excepcion    SERIAL PRIMARY KEY,
        cod_factura      INTEGER NOT NULL,
        cod_usuario      INTEGER NOT NULL,
        cod_producto     INTEGER NOT NULL,
        nombre_producto  TEXT NOT NULL,
        stock_disponible INTEGER NOT NULL DEFAULT 0,
        cantidad_vendida INTEGER NOT NULL,
        deficit          INTEGER NOT NULL,
        justificacion    TEXT,
        fecha            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "createdAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla bitacora_excepcion_stock creada');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_bitexc_factura ON bitacora_excepcion_stock(cod_factura);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_bitexc_usuario ON bitacora_excepcion_stock(cod_usuario);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_bitexc_producto ON bitacora_excepcion_stock(cod_producto);
    `);
    console.log('✅ Índices creados');

    const [rows] = await sequelize.query(`SELECT COUNT(*) as total FROM bitacora_excepcion_stock`);
    console.log('✅ Registros actuales:', rows[0].total);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
