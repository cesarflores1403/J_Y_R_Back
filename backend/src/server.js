import dotenv from 'dotenv';

dotenv.config();

const { default: app } = await import('./app.js');
const { default: pool } = await import('./config/db-connection.js');
const { testSequelizeConnection } = await import('./config/sequelize.js');

const PORT = process.env.PORT || 5000;
const DB_STARTUP_LOGS = process.env.DB_STARTUP_LOGS === 'true';

const start = async () => {
  try {
    await pool.query('SELECT 1');
    if (DB_STARTUP_LOGS) {
      console.log('Conexion PostgreSQL pg pool verificada.');
    }
  } catch (_err) {
    console.error('Base de datos no disponible para pg pool.');
    process.exitCode = 1;
    return;
  }

  try {
    await testSequelizeConnection();
  } catch (_err) {
    console.error('Base de datos no disponible para Sequelize.');
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
};

await start();
