import express from 'express';
import cors from 'cors'; // // Permite requests del frontend
import cookieParser from 'cookie-parser'; // // Permite leer cookies
import routes from './routes/index.js';

import pool from './config/db-connection.js'; // // Pool BD (conexión PostgreSQL)

import { notFound } from './middlewares/notFound.js'; // // 404 centralizado
import { errorHandler } from './middlewares/errorHandler.js'; // // Error global

const app = express();

// =======================
// MIDDLEWARES GLOBALES
// =======================

app.use(express.json()); // // Permite recibir JSON
app.use(express.urlencoded({ extended: true })); // // Permite recibir form-data
app.use(cookieParser()); // // Habilita cookies

// =======================
// CONFIGURACIÓN CORS
// =======================

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', // // Permitir frontend Vite
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
