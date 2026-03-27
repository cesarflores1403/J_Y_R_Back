import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIA_ESTE_SECRET_EN_ENV';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// =============================================
// AUTH BEARER TOKEN (para modulos Sequelize: auth, clientes, proveedores, reportes)
// =============================================
export const autenticar = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token de autenticacion no proporcionado'
    });
  }

  const token = authHeader.split(' ')[1];
  let decoded = null;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, mensaje: 'Token expirado' });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ ok: false, mensaje: 'Token invalido' });
    }

    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al validar el token'
    });
  }

  try {
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });

    if (!usuario || !usuario.estado_usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token invalido o usuario desactivado'
      });
    }

    req.usuario = usuario;
    req.usuario.rol = usuario.roles && usuario.roles.length > 0
      ? usuario.roles[0].nombre_rol
      : 'Sin rol';

    return next();
  } catch (error) {
    // No convertir errores internos de BD en 401 para no forzar logout falso
    console.error('Error interno en autenticar (consulta usuario/rol):', error.message);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al validar la sesion'
    });
  }
};

export const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
    }
    const rolUsuario = req.usuario.rol;
    // Super Administrador tiene acceso total a todas las rutas
    if (rolUsuario === 'Super Administrador') return next();
    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
      });
    }
    return next();
  };
};

export const autenticarOpcional = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });

    if (usuario && usuario.estado_usuario) {
      req.usuario = usuario;
      req.usuario.rol = usuario.roles && usuario.roles.length > 0
        ? usuario.roles[0].nombre_rol
        : 'Sin rol';
    }
  } catch (_error) {
    // Si el token es invalido/expirado en modo opcional, continuamos sin usuario.
  }

  return next();
};

// =============================================
// AUTH COOKIE (para modulo producto original)
// =============================================

export const authRequired = (req, res, next) => {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ error: true, message: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (_err) {
    // Si el token expiro o es invalido, limpiamos cookies
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'none' : 'lax';
    const secure = isProd;

    res.clearCookie('access_token', { path: '/', sameSite, secure });
    res.clearCookie('csrf_token', { path: '/', sameSite, secure });

    return res.status(401).json({ error: true, message: 'Sesion expirada o invalida' });
  }
};

export const csrfProtect = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: true, message: 'CSRF token invalido' });
  }

  return next();
};
