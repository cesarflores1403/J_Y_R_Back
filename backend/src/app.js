import express from 'express';
import cors from 'cors'; // // Permite requests del frontend
import cookieParser from 'cookie-parser'; // // Permite leer cookies
import helmet from 'helmet'; // // Seguridad HTTP headers
import morgan from 'morgan'; // // Logger HTTP requests
import routes from './routes/index.js';

import pool from './config/db-connection.js'; // // Pool BD (conexión PostgreSQL)
import { getCorsOriginValidator, getHelmetOptions, getJsonBodyLimit, isProduction } from './config/security.js';

// Importar asociaciones Sequelize (registra las relaciones entre modelos)
import './models/associations.js';

import { notFound } from './middlewares/notFound.js'; // // 404 centralizado
import { errorHandler } from './middlewares/errorHandler.js'; // // Error global

const app = express();

// =======================
// MIDDLEWARES GLOBALES
// =======================

app.use(helmet(getHelmetOptions())); // // Seguridad HTTP
if (!isProduction()) {
  app.use(morgan('dev')); // // Log de requests en desarrollo
}
app.use(express.json({ limit: getJsonBodyLimit() })); // // Permite recibir JSON
app.use(express.urlencoded({ extended: true })); // // Permite recibir form-data
app.use(cookieParser()); // // Habilita cookies

// =======================
// CONFIGURACIÓN CORS
// =======================

app.use(cors({
  origin: getCorsOriginValidator(),
  credentials: true
}));

// =======================
// RUTA TEST CONEXIÓN FE ↔ BE
// =======================

app.get('/api/test', (req, res) => {
  res.status(200).json({
    ok: true, // // Indica éxito
    message: 'Backend conectado correctamente 🚀', // // Mensaje
    data: null // // Consistencia
  });
});

// =======================
// RUTA HEALTH CHECK API
// =======================

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true, // // Indica éxito
    message: 'API funcionando correctamente 🚀', // // Estado general
    data: null // // Consistencia
  });
});

// =======================
// RUTA HEALTH CHECK BD
// =======================

app.get('/health/db', async (req, res, next) => {
  try {
    await pool.query('SELECT 1'); // // Ping real a la base de datos

    res.status(200).json({
      ok: true, // // Indica éxito
      message: 'BD conectada correctamente ✅', // // Mensaje
      data: null // // Consistencia
    });
  } catch (err) {
    next(err); // // Envía el error al middleware global
  }
});

// =======================
// RUTAS API
// =======================

// =======================
// ARCHIVOS ESTÁTICOS (uploads)
// =======================
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(__dirname, '../uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

app.use('/api', routes); // // Prefijo global de la API

// =======================
// 404 (RUTAS NO EXISTENTES)
// =======================

app.use(notFound); // // Si no coincide ninguna ruta

// =======================
// ERROR GLOBAL (TRY/CATCH CENTRAL)
// =======================

app.use(errorHandler); // // Maneja cualquier error lanzado con next(err)

export default app;
