// Migración: tabla bitacora_facturacion (HU-FAC-10)
import { sequelize } from '../src/config/sequelize.js';

async function migrate() {
  try {
    console.log('🔄 Creando tabla bitacora_facturacion...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bitacora_facturacion (
        cod_bitacora      SERIAL PRIMARY KEY,
        evento            VARCHAR(50)  NOT NULL,
        entidad           VARCHAR(50)  NOT NULL DEFAULT 'FACTURA',
        cod_factura       INTEGER      NULL,
        cod_usuario       INTEGER      NULL,
        nombre_usuario    VARCHAR(150) NULL,
        detalle           JSONB        NULL,
        ip                VARCHAR(45)  NULL,
        fecha             TIMESTAMP    NOT NULL DEFAULT NOW(),
        "createdAt"       TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla bitacora_facturacion creada');

    // Índices
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bitfac_evento ON bitacora_facturacion(evento);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bitfac_fecha ON bitacora_facturacion(fecha DESC);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bitfac_usuario ON bitacora_facturacion(cod_usuario);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bitfac_factura ON bitacora_facturacion(cod_factura);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bitfac_entidad ON bitacora_facturacion(entidad);`);
    console.log('✅ Índices creados');

    const [rows] = await sequelize.query('SELECT COUNT(*) as total FROM bitacora_facturacion');
    console.log(`✅ Registros actuales: ${rows[0].total}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

migrate();
