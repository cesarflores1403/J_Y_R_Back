import express from 'express';
import cors from 'cors'; // // Permite requests del frontend
import cookieParser from 'cookie-parser'; // // Permite leer cookies
import helmet from 'helmet'; // // Seguridad HTTP headers
import morgan from 'morgan'; // // Logger HTTP requests
import routes from './routes/index.js';

import pool from './config/db-connection.js'; // // Pool BD (conexión PostgreSQL)

// Importar asociaciones Sequelize (registra las relaciones entre modelos)
import './models/associations.js';

import { notFound } from './middlewares/notFound.js'; // // 404 centralizado
import { errorHandler } from './middlewares/errorHandler.js'; // // Error global

const app = express();

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  fontSrc: ["'self'", 'https:', 'data:'],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
  upgradeInsecureRequests: []
};

// =======================
// MIDDLEWARES GLOBALES
// =======================

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives
  },
  xFrameOptions: {
    action: 'sameorigin'
  },
  xContentTypeOptions: true
})); // // Seguridad HTTP
app.use(morgan('dev')); // // Log de requests en desarrollo
app.use(express.json()); // // Permite recibir JSON
app.use(express.urlencoded({ extended: true })); // // Permite recibir form-data
app.use(cookieParser()); // // Habilita cookies

// =======================
// CONFIGURACIÓN CORS
// =======================

app.use(cors({
  origin: function (origin, callback) {
    // // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);

    // // Permitir localhost y dominios temporales de tuneles para compartir entorno local
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
      /^https:\/\/[a-z0-9-]+\.loca\.lt$/,
      /^https:\/\/[a-z0-9-]+\.lhr\.life$/
    ];

    if (allowedPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }

    callback(new Error('No permitido por CORS'));
  },
  credentials: true // // Permitir cookies
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
  res.setHeader('Access-Control-Allow-Origin', '*');
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
