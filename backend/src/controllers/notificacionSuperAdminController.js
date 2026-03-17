import notificacionSuperAdminService from '../services/notificacionSuperAdminService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await notificacionSuperAdminService.listar(req.query, req.usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const marcarLeida = async (req, res) => {
  try {
    const notificacion = await notificacionSuperAdminService.marcarLeida(parseInt(req.params.id, 10), req.usuario);
    res.json({ ok: true, datos: notificacion, mensaje: 'Notificación actualizada' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const marcarTodasLeidas = async (req, res) => {
  try {
    const resultado = await notificacionSuperAdminService.marcarTodasLeidas(req.usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
