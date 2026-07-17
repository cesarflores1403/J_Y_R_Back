import { Sequelize } from 'sequelize';

const DEFAULT_DB_PORT = 5432;

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return value;
};

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

const dbConfig = {
  host: requiredEnv('DB_HOST'),
  port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
  name: requiredEnv('DB_NAME'),
  user: dbCredentials.user,
  password: dbCredentials.password
};

const dbTimezone = process.env.DB_TIMEZONE || '-06:00';
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
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
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

