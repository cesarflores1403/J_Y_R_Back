import pkg from 'pg'; // // Importamos el paquete pg correctamente
const { Pool } = pkg; // // Extraemos Pool del paquete

// // Configuración directa (credenciales quemadas)
const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com', // // Host de Supabase
  port: 5432, // // Puerto estándar PostgreSQL
  user: 'postgres.eabyyyzucmjehildotvb', // // Usuario
  password: 'H0l@mundo123!', // // Contraseña
  database: 'postgres', // // Base de datos
  ssl: {
    rejectUnauthorized: false // // Necesario para Supabase
  }
});

// // Evento global para detectar errores del pool
pool.on('connect', () => {
  console.log('✅ Conectado correctamente a Supabase');
});

pool.on('error', (err) => {
  console.error('❌ Error en la conexión PostgreSQL:', err);
});

export default pool;