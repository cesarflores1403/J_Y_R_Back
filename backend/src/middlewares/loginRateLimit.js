import { rateLimit } from 'express-rate-limit';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 15 * 60;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const loginRateLimitEnabled = process.env.LOGIN_RATE_LIMIT_ENABLED !== 'false';
const loginRateLimitMaxAttempts = parsePositiveInteger(
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  DEFAULT_MAX_ATTEMPTS
);
const loginRateLimitWindowSeconds = parsePositiveInteger(
  process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_WINDOW_SECONDS
);

export const createLoginRateLimit = ({
  enabled = loginRateLimitEnabled,
  maxAttempts = loginRateLimitMaxAttempts,
  windowSeconds = loginRateLimitWindowSeconds
} = {}) => {
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: windowSeconds * 1000,
    limit: maxAttempts,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime?.getTime();
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))
        : windowSeconds;

      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        ok: false,
        mensaje: 'Demasiados intentos de inicio de sesion. Intente nuevamente mas tarde.'
      });
    }
  });
};

export const loginRateLimit = createLoginRateLimit();
