import dotenv from 'dotenv'; // // Carga variables de entorno

dotenv.config(); // // Carga .env ANTES de importar app

const { default: app } = await import('./app.js'); // // Import dinámico para respetar dotenv
import pool from './config/db-connection.js'; // // Pool BD

const PORT = process.env.PORT || 5000; // // Puerto configurable

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`); // // Log server
  try {
    await pool.query('SELECT 1'); // // Verificar conexión a BD al arrancar
    console.log('✅ Conectado correctamente a Supabase');
  } catch (err) {
    console.error('❌ Error al conectar a Supabase:', err.message);
  }
});