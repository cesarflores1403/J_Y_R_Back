import dotenv from 'dotenv';

dotenv.config();

const { default: app } = await import('./app.js');
const { default: pool } = await import('./config/db-connection.js');
const { sequelize, testSequelizeConnection } = await import('./config/sequelize.js');

const PORT = process.env.PORT || 5000;
const DB_STARTUP_LOGS = process.env.DB_STARTUP_LOGS === 'true';

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);

  try {
    await pool.query('SELECT 1');
    if (DB_STARTUP_LOGS) {
      console.log('Conexion PostgreSQL pg pool verificada.');
    }
  } catch (_err) {
    if (DB_STARTUP_LOGS) {
      console.error('Base de datos no disponible para pg pool. Verifica backend/.env.');
    }
  }

  try {
    await testSequelizeConnection();

    await sequelize.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rtn VARCHAR(14)');
    if (DB_STARTUP_LOGS) {
      console.log('Esquema clientes verificado (rtn).');
    }

    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS creado_por INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS modificado_por INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMP');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_costo DECIMAL(10,2)');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500)');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS especificaciones JSONB');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock_minimo INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS punto_reorden INTEGER');
    if (DB_STARTUP_LOGS) {
      console.log('Esquema producto verificado (auditoria, costo y detalle).');
    }

    await sequelize.query('ALTER TABLE detalle_factura ADD COLUMN IF NOT EXISTS descripcion_item TEXT');
    if (DB_STARTUP_LOGS) {
      console.log('Esquema detalle_factura verificado (descripcion_item).');
    }
  } catch (_err) {
    if (DB_STARTUP_LOGS) {
      console.error('Base de datos no disponible para Sequelize. Verifica backend/.env.');
    }
  }
});
