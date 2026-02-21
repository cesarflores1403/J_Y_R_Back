// =====================================================
// MIGRACIÓN: HU-FAC-04 - Campos de descuento
// Ejecutar: node scripts/migrationDescuentos.js
// =====================================================
import dotenv from 'dotenv';
dotenv.config();

// Import dinámico para respetar que dotenv cargue primero
const { sequelize } = await import('../src/config/sequelize.js');

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // ---- DetalleFactura: nuevas columnas ----
    const detalleCols = [
      `ALTER TABLE detalle_factura ADD COLUMN IF NOT EXISTS tipo_descuento TEXT NOT NULL DEFAULT 'PORCENTAJE'`,
      `ALTER TABLE detalle_factura ADD COLUMN IF NOT EXISTS monto_descuento DECIMAL(10,2) NOT NULL DEFAULT 0`,
      // Cambiar descuento a DECIMAL(10,2) si era DECIMAL(5,2)
      `ALTER TABLE detalle_factura ALTER COLUMN descuento TYPE DECIMAL(10,2)`,
    ];

    // ---- Factura: nuevas columnas ----
    const facturaCols = [
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS descuento_global DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS tipo_descuento_global TEXT DEFAULT NULL`,
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS monto_descuento_global DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE factura ADD COLUMN IF NOT EXISTS descuento_aplicado_por INTEGER DEFAULT NULL`,
    ];

    const allQueries = [...detalleCols, ...facturaCols];

    for (const sql of allQueries) {
      try {
        await sequelize.query(sql);
        console.log(`  ✅ ${sql.substring(0, 80)}...`);
      } catch (err) {
        // Ignorar si ya existe
        if (err.message.includes('already exists') || err.message.includes('ya existe')) {
          console.log(`  ⚠️  Ya existe: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Migración completada');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error de migración:', err.message);
    process.exit(1);
  }
};

run();
