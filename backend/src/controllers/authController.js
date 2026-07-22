import authService from '../services/authService.js';
import { registrarEventoSeguridad } from '../utils/auditoriaSeguridad.js';
import { resetLoginAttempts } from '../middlewares/loginRateLimiter.js';

const respuestaAuthError = (res, error) => {
  const status = error.statusCode || error.status || 500;
  const mensaje = status >= 500
    ? 'No se pudo iniciar sesion en este momento. Intenta nuevamente mas tarde.'
    : error.message;

  return res.status(status).json({
    ok: false,
    mensaje
  });
};

export const login = async (req, res) => {
  const { nombre_usuario, password } = req.body;
  try {
    const resultado = await authService.login(nombre_usuario, password);
    resetLoginAttempts(req);
    await registrarEventoSeguridad(req, {
      evento: 'LOGIN_EXITOSO',
      cod_usuario: resultado.usuario?.cod_usuario || null,
      nombre_usuario: resultado.usuario?.nombre_usuario || nombre_usuario,
      detalle: {
        rol: resultado.usuario?.rol || null
      }
    });
    res.json({ ok: true, ...resultado });
  } catch (error) {
    await registrarEventoSeguridad(req, {
      evento: 'LOGIN_FALLIDO',
      nombre_usuario,
      detalle: {
        motivo: error.statusCode === 401 ? 'Credenciales invalidas' : error.message,
        status: error.statusCode || error.status || 500
      }
    });
    return respuestaAuthError(res, error);
  }
};

export const perfil = async (req, res) => {
  res.json({ ok: true, usuario: req.usuario.toJSON(), rol: req.usuario.rol });
};

export const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    const resultado = await authService.cambiarPassword(
      req.usuario.cod_usuario, password_actual, password_nuevo
    );
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      mensaje: error.message
    });
  }
};

export const solicitarRecuperacion = async (req, res) => {
  try {
    const { nombre_usuario } = req.body;
    const resultado = await authService.solicitarRecuperacion(nombre_usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
