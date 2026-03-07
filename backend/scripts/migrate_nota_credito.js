// Migración: tablas nota_credito y detalle_nota_credito (HU-FAC-12)
import { sequelize } from '../src/config/sequelize.js';

async function migrate() {
  try {
    // =============================================
    // 1) TABLA NOTA_CREDITO
    // =============================================
    console.log('🔄 Creando tabla nota_credito...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS nota_credito (
        cod_nota_credito    SERIAL PRIMARY KEY,
        cod_factura         INTEGER      NOT NULL REFERENCES factura(cod_factura),
        cod_usuario         INTEGER      NOT NULL,
        motivo              TEXT         NOT NULL,
        subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
        descuento           DECIMAL(10,2) NOT NULL DEFAULT 0,
        isv                 DECIMAL(10,2) NOT NULL DEFAULT 0,
        total               DECIMAL(10,2) NOT NULL DEFAULT 0,
        estado              BOOLEAN      NOT NULL DEFAULT true,
        devolver_inventario BOOLEAN      NOT NULL DEFAULT true,
        fecha               TIMESTAMP    NOT NULL DEFAULT NOW(),
        "createdAt"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updatedAt"         TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla nota_credito creada');

    // Índices nota_credito
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nc_factura ON nota_credito(cod_factura);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nc_usuario ON nota_credito(cod_usuario);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nc_fecha   ON nota_credito(fecha DESC);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nc_estado  ON nota_credito(estado);`);
    console.log('✅ Índices nota_credito creados');

    // =============================================
    // 2) TABLA DETALLE_NOTA_CREDITO
    // =============================================
    console.log('🔄 Creando tabla detalle_nota_credito...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS detalle_nota_credito (
        cod_detalle_nc          SERIAL PRIMARY KEY,
        cod_nota_credito        INTEGER      NOT NULL REFERENCES nota_credito(cod_nota_credito),
        cod_detalle_factura     INTEGER      NOT NULL REFERENCES detalle_factura(cod_detalle_factura),
        cod_producto            INTEGER      NULL,
        cantidad_devuelta       INTEGER      NOT NULL,
        precio_unitario         DECIMAL(10,2) NOT NULL,
        descuento               DECIMAL(10,2) NOT NULL DEFAULT 0,
        isv                     DECIMAL(10,2) NOT NULL DEFAULT 0,
        subtotal                DECIMAL(10,2) NOT NULL,
        total                   DECIMAL(10,2) NOT NULL,
        "createdAt"             TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updatedAt"             TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla detalle_nota_credito creada');

    // Índices detalle_nota_credito
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_dnc_nota    ON detalle_nota_credito(cod_nota_credito);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_dnc_detfac  ON detalle_nota_credito(cod_detalle_factura);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_dnc_prod    ON detalle_nota_credito(cod_producto);`);
    console.log('✅ Índices detalle_nota_credito creados');

    // Verificación
    const [nc] = await sequelize.query('SELECT COUNT(*) as total FROM nota_credito');
    const [dnc] = await sequelize.query('SELECT COUNT(*) as total FROM detalle_nota_credito');
    console.log(`✅ Registros nota_credito: ${nc[0].total}`);
    console.log(`✅ Registros detalle_nota_credito: ${dnc[0].total}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

migrate();
