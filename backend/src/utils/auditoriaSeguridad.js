import bitacoraFacturacionService from '../services/bitacoraFacturacionService.js';

const obtenerIp = (req) => req?.ip || req?.socket?.remoteAddress || null;

export const registrarEventoSeguridad = async (req, {
  evento,
  nombre_usuario = null,
  cod_usuario = null,
  detalle = {}
} = {}) => {
  try {
    await bitacoraFacturacionService.registrar({
      evento,
      entidad: 'SEGURIDAD',
      cod_usuario,
      nombre_usuario,
      ip: obtenerIp(req),
      detalle: {
        usuario_intentado: nombre_usuario || String(req?.body?.nombre_usuario || '').trim() || null,
        user_agent: req?.headers?.['user-agent'] || null,
        ruta: req?.originalUrl || req?.url || null,
        ...detalle
      }
    });
  } catch (error) {
    console.error('Error al registrar auditoria de seguridad:', error.message);
  }
};
