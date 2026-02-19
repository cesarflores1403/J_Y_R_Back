import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIA_ESTE_SECRET_EN_ENV';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// =============================================
// AUTH BEARER TOKEN (para módulos Sequelize: auth, clientes, proveedores, reportes)
// =============================================
export const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });

    if (!usuario || !usuario.estado_usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token inválido o usuario desactivado'
      });
    }

    req.usuario = usuario;
    req.usuario.rol = usuario.roles && usuario.roles.length > 0
      ? usuario.roles[0].nombre_rol
      : 'Sin rol';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, mensaje: 'Token expirado' });
    }
    return res.status(401).json({ ok: false, mensaje: 'Token inválido' });
  }
};

export const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
    }
    const rolUsuario = req.usuario.rol;
    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
      });
    }
    next();
  };
};

// =============================================
// AUTH COOKIE (para módulo producto original)
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
  } catch (err) {
    // Si el token expiró o es inválido, limpiamos cookies
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'none' : 'lax';
    const secure = isProd;

    res.clearCookie('access_token', { path: '/', sameSite, secure });
    res.clearCookie('csrf_token', { path: '/', sameSite, secure });

    return res.status(401).json({ error: true, message: 'Sesión expirada o inválida' });
  }
};

export const csrfProtect = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: true, message: 'CSRF token inválido' });
  }

  return next();
};
