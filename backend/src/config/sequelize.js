import { Sequelize } from 'sequelize';

// dialectOptions: sin SSL para pooler Supabase (el pooler en puerto 5432 no requiere SSL)
const dialectOptions = {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
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
