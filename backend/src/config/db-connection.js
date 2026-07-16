import pkg from 'pg';

const { Pool } = pkg;

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return value;
};

const usarSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const getDbCredentials = () => {
  const appUser = String(process.env.DB_APP_USER || '').trim();
  const appPassword = String(process.env.DB_APP_PASSWORD || '').trim();

  if (appUser && appPassword) {
    return { user: appUser, password: appPassword };
  }

  return {
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD')
  };
};

const dbCredentials = getDbCredentials();

const pool = new Pool({
  host: requiredEnv('DB_HOST'),
  port: Number(process.env.DB_PORT || 5432),
  user: dbCredentials.user,
  password: dbCredentials.password,
  database: requiredEnv('DB_NAME'),
  ssl: usarSsl ? { rejectUnauthorized: false } : false
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
