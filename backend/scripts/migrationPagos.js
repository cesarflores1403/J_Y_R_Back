// =====================================================
// MIGRACIÓN: HU-FAC-05 - Tabla pagos + campos de estado de pago en factura
// Ejecutar: node scripts/migrationPagos.js
// =====================================================
import dotenv from 'dotenv';
dotenv.config();

const { sequelize } = await import('../src/config/sequelize.js');

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    const queries = [
      // Crear tabla pagos
      `CREATE TABLE IF NOT EXISTS pago (
        cod_pago SERIAL PRIMARY KEY,
        cod_factura INTEGER NOT NULL REFERENCES factura(cod_factura) ON DELETE CASCADE,
        monto DECIMAL(10,2) NOT NULL,
        metodo_pago INTEGER NOT NULL,
        ref_pago VARCHAR(200),
        fecha_pago TIMESTAMP DEFAULT NOW() NOT NULL,
        observacion TEXT,
        estado BOOLEAN DEFAULT TRUE,
        cod_usuario INTEGER NOT NULL REFERENCES usuarios(cod_usuario)
      )`,

      // Campos en factura para control de pagos
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'PENDIENTE'`,
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS total_pagado DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS saldo DECIMAL(10,2) DEFAULT 0`,

      // Índice para búsquedas de pagos por factura
      `CREATE INDEX IF NOT EXISTS idx_pago_cod_factura ON pago(cod_factura)`,
    ];

    for (const sql of queries) {
      try {
        await sequelize.query(sql);
        console.log(`  ✅ ${sql.substring(0, 80)}...`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('ya existe')) {
          console.log(`  ⚠️  Ya existe: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }

    // Actualizar saldo de facturas existentes (saldo = total - total_pagado)
    await sequelize.query(`
      UPDATE factura SET saldo = total - COALESCE(total_pagado, 0)
      WHERE saldo IS NULL OR saldo = 0
    `);
    console.log('  ✅ Saldo actualizado en facturas existentes');

    console.log('\n✅ Migración HU-FAC-05 completada');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error de migración:', err.message);
    process.exit(1);
  }
};

run();
