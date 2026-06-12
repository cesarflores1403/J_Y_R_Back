import pkg from 'pg';

const { Pool } = pkg;

const usarSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = new Pool({
  host: process.env.DB_HOST || 'aws-1-us-east-1.pooler.supabase.com',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres.eabyyyzucmjehildotvb',
  password: process.env.DB_PASSWORD || 'H0l@mundo123!',
  database: process.env.DB_NAME || 'postgres',
  ssl: usarSsl ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Conectado correctamente a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en la conexion PostgreSQL:', err);
});

export default pool;
