import { Sequelize } from 'sequelize';

const DEFAULT_DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_NAME = 'postgres';
const DEFAULT_DB_USER = 'postgres.eabyyyzucmjehildotvb';
const DEFAULT_DB_PASSWORD = 'H0l@mundo123!';

const dbConfig = {
  host: process.env.DB_HOST || DEFAULT_DB_HOST,
  port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
  name: process.env.DB_NAME || DEFAULT_DB_NAME,
  user: process.env.DB_USER || DEFAULT_DB_USER,
  password: process.env.DB_PASSWORD || DEFAULT_DB_PASSWORD
};

const dialectOptions = {
  ssl: {
    rejectUnauthorized: false
  }
};

const sequelize = new Sequelize(
  dbConfig.name,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: false,
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
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize: conexión a PostgreSQL establecida.');
  } catch (error) {
    console.error('❌ Sequelize: error al conectar:', error.message);
  }
};

export { sequelize, testSequelizeConnection };
