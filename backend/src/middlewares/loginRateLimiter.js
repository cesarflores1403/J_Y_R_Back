import logger from '../config/logger.js';
import { registrarEventoSeguridad } from '../utils/auditoriaSeguridad.js';

// =============================================================
// Limitador de intentos de inicio de sesion por IP.
// Protege el endpoint de login contra fuerza bruta y credential stuffing
// sin registrar credenciales ni depender del nombre de usuario enviado.
// =============================================================

const leerEnteroPositivo = (valor, fallback) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : fallback;
};

const RATE_LIMIT_ENABLED = process.env.LOGIN_RATE_LIMIT_ENABLED !== 'false';
const MAX_INTENTOS = leerEnteroPositivo(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, 5);
const VENTANA_MS = leerEnteroPositivo(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS, 15 * 60) * 1000;
const LIMPIEZA_UMBRAL = 5000;

// Registro en memoria: ip -> { intentos, reiniciaEn }
const registros = new Map();

const construirClave = (req) => String(req.ip || req.socket?.remoteAddress || 'ip-desconocida');

const limpiarExpirados = (ahora) => {
  for (const [clave, registro] of registros) {
    if (!registro.reiniciaEn || registro.reiniciaEn <= ahora) {
      registros.delete(clave);
    }
  }
};

const respuestaBloqueo = (res, reiniciaEn) => {
  const retryAfter = Math.max(1, Math.ceil((reiniciaEn - Date.now()) / 1000));
  res.setHeader('Retry-After', retryAfter);
  return res.status(429).json({
    ok: false,
    mensaje: 'Demasiados intentos de inicio de sesion. Intenta nuevamente mas tarde.'
  });
};

const auditarBloqueo = (req, reiniciaEn) => {
  registrarEventoSeguridad(req, {
    evento: 'LOGIN_BLOQUEADO',
    detalle: {
      motivo: 'Rate limit de login excedido',
      max_intentos: MAX_INTENTOS,
      ventana_segundos: Math.ceil(VENTANA_MS / 1000),
      bloqueado_hasta: new Date(reiniciaEn).toISOString()
    }
  });
};

export const loginRateLimiter = (req, res, next) => {
  if (!RATE_LIMIT_ENABLED) {
    return next();
  }

  const ahora = Date.now();
  const clave = construirClave(req);

  if (registros.size > LIMPIEZA_UMBRAL) {
    limpiarExpirados(ahora);
  }

  let registro = registros.get(clave);
  if (!registro || registro.reiniciaEn <= ahora) {
    registro = {
      intentos: 0,
      reiniciaEn: ahora + VENTANA_MS
    };
  }

  registro.intentos += 1;
  registros.set(clave, registro);

  if (registro.intentos > MAX_INTENTOS) {
    logger.warn('Rate limit de login excedido', { ip: clave });
    auditarBloqueo(req, registro.reiniciaEn);
    return respuestaBloqueo(res, registro.reiniciaEn);
  }

  req.loginRateLimitKey = clave;
  return next();
};

export const resetLoginAttempts = (req) => {
  const clave = req?.loginRateLimitKey || construirClave(req);
  registros.delete(clave);
};

export default loginRateLimiter;
