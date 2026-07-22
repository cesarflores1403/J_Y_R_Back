const MIN_JWT_SECRET_LENGTH = 32;

const parseBoolean = (value) => String(value || '').trim().toLowerCase() === 'true';

const parseCsvOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const readCredentialPair = (userKey, passwordKey) => {
  const user = String(process.env[userKey] || '').trim();
  const password = String(process.env[passwordKey] || '').trim();

  if (user && password) {
    return { user, password };
  }

  return null;
};

export const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret) {
    throw new Error('JWT_SECRET es obligatorio');
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
  }

  return secret;
};

export const getJwtExpiresIn = () => {
  const expiresIn = String(process.env.JWT_EXPIRES_IN || '').trim();
  if (!expiresIn) {
    throw new Error('JWT_EXPIRES_IN debe definirse en variables de entorno');
  }
  return expiresIn;
};

export const getAppDatabaseCredentials = () => {
  const appCredentials = readCredentialPair('DB_APP_USER', 'DB_APP_PASSWORD');
  if (appCredentials) {
    return appCredentials;
  }

  const legacyCredentials = readCredentialPair('DB_USER', 'DB_PASSWORD');
  if (legacyCredentials) {
    return legacyCredentials;
  }

  throw new Error('Credenciales de aplicacion no configuradas');
};

export const getMaintenanceDatabaseCredentials = () => {
  const maintenanceCredentials = readCredentialPair('DB_MAINTENANCE_USER', 'DB_MAINTENANCE_PASSWORD');
  if (maintenanceCredentials) {
    return maintenanceCredentials;
  }

  const legacyCredentials = readCredentialPair('DB_USER', 'DB_PASSWORD');
  if (legacyCredentials) {
    return legacyCredentials;
  }

  throw new Error('Credenciales de mantenimiento no configuradas');
};

const isLocalOrigin = (origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

const isTunnelOrigin = (origin) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      return false;
    }

    return /(trycloudflare\.com|loca\.lt|lhr\.life)$/i.test(url.hostname);
  } catch {
    return false;
  }
};

export const getCorsOriginValidator = () => {
  const allowedOrigins = parseCsvOrigins(process.env.CORS_ALLOWED_ORIGINS);
  const allowTunnelOrigins = parseBoolean(process.env.ALLOW_TUNNEL_ORIGINS);

  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && isLocalOrigin(origin)) {
      return callback(null, true);
    }

    if (allowTunnelOrigins && isTunnelOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS'));
  };
};

export const getHelmetOptions = () => ({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:']
    }
  },
  frameguard: { action: 'deny' },
  hsts: process.env.NODE_ENV === 'production'
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    : false,
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

export const getJsonBodyLimit = () => process.env.JSON_BODY_LIMIT || '1mb';

export const isProduction = () => process.env.NODE_ENV === 'production';