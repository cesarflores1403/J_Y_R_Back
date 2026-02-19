import dotenv from 'dotenv'; // // Carga variables de entorno

dotenv.config(); // // Carga .env ANTES de importar app

const { default: app } = await import('./app.js'); // // Import dinámico para respetar dotenv
const { default: pool } = await import('./config/db-connection.js'); // // Pool BD (dinámico)
const { testSequelizeConnection } = await import('./config/sequelize.js'); // // Sequelize ORM (dinámico)

const PORT = process.env.PORT || 5000; // // Puerto configurable

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`); // // Log server
  try {
    await pool.query('SELECT 1'); // // Verificar conexión a BD al arrancar
    console.log('✅ Conectado correctamente a Supabase (pg pool)');
  } catch (err) {
    console.error('❌ Error al conectar a Supabase (pg pool):', err.message);
  }
  try {
    await testSequelizeConnection(); // // Verificar conexión Sequelize
    console.log('✅ Conectado correctamente a Supabase (Sequelize)');
  } catch (err) {
    console.error('❌ Error al conectar Sequelize:', err.message);
  }
});