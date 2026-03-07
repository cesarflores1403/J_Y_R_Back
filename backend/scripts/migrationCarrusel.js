import { sequelize } from '../src/config/sequelize.js';

const migrationCarrusel = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la BD.');

    // Crear tabla carrusel_imagenes
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS carrusel_imagenes (
        cod_imagen    SERIAL PRIMARY KEY,
        titulo        VARCHAR(100),
        descripcion   VARCHAR(255),
        imagen_url    VARCHAR(500) NOT NULL,
        orden         INTEGER NOT NULL DEFAULT 0,
        activo        BOOLEAN NOT NULL DEFAULT TRUE,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla carrusel_imagenes creada correctamente.');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
};

migrationCarrusel();
