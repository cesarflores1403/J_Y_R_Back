import logger from '../config/logger.js';

// =============================================================
// Limitador de intentos de inicio de sesión
// Bloquea la combinación IP + usuario durante 10 minutos tras
// 10 intentos fallidos consecutivos. Un inicio de sesión exitoso
// reinicia el contador. No requiere dependencias externas.
// =============================================================

const MAX_INTENTOS = 10;                 // Intentos fallidos antes del bloqueo
const BLOQUEO_MS = 10 * 60 * 1000;       // Duración del bloqueo: 10 minutos
const LIMPIEZA_UMBRAL = 5000;            // Sweep de entradas viejas al superar este tamaño

// Registro en memoria: clave -> { fallidos, bloqueadoHasta }
const registros = new Map();

const construirClave = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || 'ip-desconocida';
  const usuario = String(req.body?.nombre_usuario || '').trim().toLowerCase();
  return `${ip}|${usuario}`;
};

// Elimina entradas ya expiradas para que el Map no crezca indefinidamente.
const limpiarExpirados = (ahora) => {
  for (const [clave, registro] of registros) {
    const inactivo = !registro.bloqueadoHasta || registro.bloqueadoHasta <= ahora;
    if (inactivo && registro.fallidos === 0) {
      registros.delete(clave);
    }
  }
};

const respuestaBloqueo = (res, bloqueadoHasta) => {
  const retryAfter = Math.max(1, Math.ceil((bloqueadoHasta - Date.now()) / 1000));
  const minutos = Math.ceil(retryAfter / 60);
  res.setHeader('Retry-After', retryAfter);
  return res.status(429).json({
    ok: false,
    mensaje: `Demasiados intentos fallidos. Acceso bloqueado temporalmente. Intenta de nuevo en ${minutos} minuto(s).`,
    bloqueadoHasta,   // epoch ms: permite al cliente persistir el bloqueo aunque se refresque
    retryAfter        // segundos restantes
  });
};

export const loginRateLimiter = (req, res, next) => {
  const ahora = Date.now();
  const clave = construirClave(req);
  const registro = registros.get(clave);

  // 1) ¿Está bloqueado actualmente? (se evalúa antes de tocar la BD)
  if (registro?.bloqueadoHasta && registro.bloqueadoHasta > ahora) {
    logger.warn('Intento de login sobre cuenta bloqueada', { clave });
    return respuestaBloqueo(res, registro.bloqueadoHasta);
  }

  // El bloqueo expiró: se reinicia el registro para volver a permitir intentos.
  if (registro?.bloqueadoHasta && registro.bloqueadoHasta <= ahora) {
    registros.delete(clave);
  }

  // 2) Se intercepta la respuesta del login para contar el resultado y
  //    devolver al cliente los intentos restantes / el estado de bloqueo.
  const jsonOriginal = res.json.bind(res);
  res.json = (body) => {
    const exito = res.statusCode >= 200 && res.statusCode < 300;
    const credencialesInvalidas = res.statusCode === 401;

    // Login correcto -> se reinicia el contador de esa clave.
    if (exito) {
      registros.delete(clave);
      return jsonOriginal(body);
    }

    // Solo las credenciales inválidas (401) cuentan como intento fallido.
    // Errores de validación (400) u otros no incrementan.
    if (!credencialesInvalidas) {
      return jsonOriginal(body);
    }

    const actual = registros.get(clave) || { fallidos: 0, bloqueadoHasta: 0 };
    actual.fallidos += 1;

    if (registros.size > LIMPIEZA_UMBRAL) {
      limpiarExpirados(Date.now());
    }

    // Se alcanzó el máximo -> se activa el bloqueo y se responde 429.
    if (actual.fallidos >= MAX_INTENTOS) {
      actual.bloqueadoHasta = Date.now() + BLOQUEO_MS;
      actual.fallidos = 0; // Se reinicia el conteo tras aplicar el bloqueo.
      registros.set(clave, actual);
      logger.warn('Cuenta/IP bloqueada por intentos fallidos', {
        clave,
        bloqueadoPorMinutos: BLOQUEO_MS / 60000
      });
      return respuestaBloqueo(res, actual.bloqueadoHasta);
    }

    // Fallo normal: se informan los intentos restantes antes del bloqueo.
    registros.set(clave, actual);
    const intentosRestantes = MAX_INTENTOS - actual.fallidos;
    logger.warn('Intento de inicio de sesión fallido', {
      clave,
      intentosFallidos: actual.fallidos,
      restantesAntesDeBloqueo: intentosRestantes
    });
    return jsonOriginal({ ...body, intentosRestantes });
  };

  next();
};

export default loginRateLimiter;
