import { Sequelize } from 'sequelize';
import { getAppDatabaseCredentials } from './security.js';

const DEFAULT_DB_PORT = 5432;

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return value;
};

const dbCredentials = getAppDatabaseCredentials();

const dbConfig = {
  host: requiredEnv('DB_HOST'),
  port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
  name: requiredEnv('DB_NAME'),
  user: dbCredentials.user,
  password: dbCredentials.password
};

const dbTimezone = String(process.env.DB_TIMEZONE || '-06:00').trim() || '-06:00';
const usarSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dialectOptions = usarSsl ? {
  ssl: {
    rejectUnauthorized: false
  }
} : {};

const sequelize = new Sequelize(
  dbConfig.name,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: false,
    timezone: dbTimezone,
    dialectOptions,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
      idle: Number(process.env.DB_POOL_IDLE_MS || 10000)
    },
    define: {
      timestamps: false,
      freezeTableName: true
    }
  }
);

const testSequelizeConnection = async () => {
  await sequelize.authenticate();
  console.log('Sequelize: conexion a PostgreSQL establecida.');
};

export { sequelize, testSequelizeConnection };

