import pkg from 'pg';
import { getAppDatabaseCredentials } from './security.js';

const { Pool } = pkg;

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return value;
};

const usarSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbTimezone = String(process.env.DB_TIMEZONE || '-06:00').trim() || '-06:00';
const dbCredentials = getAppDatabaseCredentials();

const pool = new Pool({
  host: requiredEnv('DB_HOST'),
  port: Number(process.env.DB_PORT || 5432),
  user: dbCredentials.user,
  password: dbCredentials.password,
  database: requiredEnv('DB_NAME'),
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
  application_name: process.env.DB_APPLICATION_NAME || 'jyr-back',
  options: `-c TimeZone=${dbTimezone}`,
  max: Number(process.env.DB_POOL_MAX || 10),
  min: Number(process.env.DB_POOL_MIN || 0),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  keepAlive: true
});

pool.on('connect', () => {
  if (process.env.DB_STARTUP_LOGS === 'true') {
    console.log('Conectado correctamente a PostgreSQL');
  }
});

pool.on('error', (_err) => {
  if (process.env.DB_STARTUP_LOGS === 'true') {
    console.error('Error en la conexion PostgreSQL. Verifica backend/.env.');
  }
});

export default pool;
