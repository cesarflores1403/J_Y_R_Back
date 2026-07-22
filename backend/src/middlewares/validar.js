import { validationResult } from 'express-validator';
import { registrarEventoSeguridad } from '../utils/auditoriaSeguridad.js';

export const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    const listaErrores = errores.array().map(e => ({
      campo: e.path,
      mensaje: e.msg
    }));

    // Mensaje legible con el primer error
    const primerError = listaErrores[0];
    const message = primerError
      ? `${primerError.mensaje}`
      : 'Error de validación';

    if (req.originalUrl?.includes('/auth/login')) {
      registrarEventoSeguridad(req, {
        evento: 'LOGIN_FALLIDO',
        nombre_usuario: String(req.body?.nombre_usuario || '').trim() || null,
        detalle: {
          motivo: 'Validacion de credenciales fallida',
          status: 400,
          errores: listaErrores
        }
      });
    }

    return res.status(400).json({
      ok: false,
      mensaje: message
    });
  }
  next();
};
