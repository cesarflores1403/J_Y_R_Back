import NotificacionSuperAdmin from '../models/NotificacionSuperAdmin.js';
import NotificacionSuperAdminLeida from '../models/NotificacionSuperAdminLeida.js';
import { Op } from 'sequelize';

class NotificacionSuperAdminService {
  async inicializarTabla() {
    await NotificacionSuperAdmin.sync();
    await NotificacionSuperAdminLeida.sync();
  }

  obtenerCodUsuario(usuario = {}) {
    const codUsuario = parseInt(usuario?.cod_usuario, 10);
    if (!codUsuario) {
      throw Object.assign(new Error('Usuario no válido para gestionar notificaciones'), { statusCode: 400 });
    }
    return codUsuario;
  }

  async crearSolicitudRecuperacion(correo) {
    await this.inicializarTabla();
    const correoLimpio = (correo || '').trim();
    const titulo = 'Solicitud de recuperación de contraseña';
    const mensaje = correoLimpio
      ? `Se recibió una solicitud de recuperación para el correo: ${correoLimpio}`
      : 'Se recibió una solicitud de recuperación sin correo especificado';

    return NotificacionSuperAdmin.create({
      tipo: 'RECUPERACION_PASSWORD',
      titulo,
      mensaje,
      correo_solicitante: correoLimpio || null,
      leida: false
    });
  }

  async listar({ limite = 20 } = {}, usuario = {}) {
    await this.inicializarTabla();
    const codUsuario = this.obtenerCodUsuario(usuario);

    const lista = await NotificacionSuperAdmin.findAll({
      order: [['creado_en', 'DESC']],
      limit: Math.max(1, Math.min(parseInt(limite, 10) || 20, 100))
    });

    const idsNotificaciones = lista.map((n) => n.cod_notificacion);

    const lecturasUsuario = idsNotificaciones.length > 0
      ? await NotificacionSuperAdminLeida.findAll({
        where: {
          cod_usuario: codUsuario,
          cod_notificacion: { [Op.in]: idsNotificaciones }
        },
        attributes: ['cod_notificacion']
      })
      : [];

    const leidasEnPantalla = new Set(lecturasUsuario.map((l) => l.cod_notificacion));

    const datos = lista.map((n) => ({
      ...n.toJSON(),
      leida: Boolean(n.leida) || leidasEnPantalla.has(n.cod_notificacion)
    }));

    const lecturasTotalesUsuario = await NotificacionSuperAdminLeida.findAll({
      where: { cod_usuario: codUsuario },
      attributes: ['cod_notificacion']
    });
    const idsLeidos = lecturasTotalesUsuario.map((l) => l.cod_notificacion);

    const noLeidas = await NotificacionSuperAdmin.count({
      where: {
        leida: false,
        ...(idsLeidos.length > 0 ? { cod_notificacion: { [Op.notIn]: idsLeidos } } : {})
      }
    });

    return { datos, noLeidas };
  }

  async marcarLeida(codNotificacion, usuario = {}) {
    await this.inicializarTabla();
    const codUsuario = this.obtenerCodUsuario(usuario);

    const notificacion = await NotificacionSuperAdmin.findByPk(codNotificacion);
    if (!notificacion) {
      throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 });
    }

    await NotificacionSuperAdminLeida.findOrCreate({
      where: {
        cod_notificacion: parseInt(codNotificacion, 10),
        cod_usuario: codUsuario
      },
      defaults: {
        leida_en: new Date()
      }
    });

    return {
      ...notificacion.toJSON(),
      leida: true
    };
  }

  async marcarTodasLeidas(usuario = {}) {
    await this.inicializarTabla();
    const codUsuario = this.obtenerCodUsuario(usuario);

    const lecturasUsuario = await NotificacionSuperAdminLeida.findAll({
      where: { cod_usuario: codUsuario },
      attributes: ['cod_notificacion']
    });
    const idsLeidos = lecturasUsuario.map((l) => l.cod_notificacion);

    const pendientes = await NotificacionSuperAdmin.findAll({
      attributes: ['cod_notificacion'],
      where: {
        leida: false,
        ...(idsLeidos.length > 0 ? { cod_notificacion: { [Op.notIn]: idsLeidos } } : {})
      }
    });

    if (pendientes.length > 0) {
      await NotificacionSuperAdminLeida.bulkCreate(
        pendientes.map((n) => ({
          cod_notificacion: n.cod_notificacion,
          cod_usuario: codUsuario,
          leida_en: new Date()
        })),
        { ignoreDuplicates: true }
      );
    }

    return { mensaje: 'Notificaciones marcadas como leídas' };
  }
}

export default new NotificacionSuperAdminService();
