import BitacoraFacturacion from '../models/BitacoraFacturacion.js';
import Usuario from '../models/Usuario.js';
import { Op } from 'sequelize';

class BitacoraFacturacionService {

  // =============================================
  // REGISTRAR EVENTO (uso interno por otros servicios)
  // =============================================
  async registrar({ evento, entidad = 'FACTURA', cod_factura = null, cod_usuario = null, nombre_usuario = null, detalle = null, ip = null }) {
    // Si no se pasó nombre_usuario, intentar obtenerlo
    if (cod_usuario && !nombre_usuario) {
      try {
        const user = await Usuario.findByPk(cod_usuario, { attributes: ['nombre_usuario'] });
        nombre_usuario = user?.nombre_usuario || 'Desconocido';
      } catch { nombre_usuario = 'Desconocido'; }
    }

    return BitacoraFacturacion.create({
      evento,
      entidad,
      cod_factura,
      cod_usuario,
      nombre_usuario,
      detalle: detalle ? (typeof detalle === 'string' ? JSON.parse(detalle) : detalle) : null,
      ip,
      fecha: new Date()
    });
  }

  // =============================================
  // LISTAR CON FILTROS + PAGINACIÓN
  // =============================================
  async listar({ pagina = 1, limite = 25, evento, entidad, cod_factura, cod_usuario, fecha_desde, fecha_hasta, buscar }) {
    const where = {};

    if (evento) where.evento = evento;
    if (entidad) where.entidad = entidad;
    if (cod_factura) where.cod_factura = parseInt(cod_factura);
    if (cod_usuario) where.cod_usuario = parseInt(cod_usuario);

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha[Op.lte] = hasta;
      }
    }

    if (buscar) {
      where[Op.or] = [
        { nombre_usuario: { [Op.iLike]: `%${buscar}%` } },
        { evento: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    const { count, rows } = await BitacoraFacturacion.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: (parseInt(pagina) - 1) * parseInt(limite),
      order: [['fecha', 'DESC']]
    });

    return {
      datos: rows,
      total: count,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(count / parseInt(limite))
    };
  }

  // =============================================
  // EXPORTAR (todos los registros filtrados, sin paginación)
  // =============================================
  async exportar({ evento, entidad, cod_factura, cod_usuario, fecha_desde, fecha_hasta, buscar }) {
    const where = {};

    if (evento) where.evento = evento;
    if (entidad) where.entidad = entidad;
    if (cod_factura) where.cod_factura = parseInt(cod_factura);
    if (cod_usuario) where.cod_usuario = parseInt(cod_usuario);

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha[Op.lte] = hasta;
      }
    }

    if (buscar) {
      where[Op.or] = [
        { nombre_usuario: { [Op.iLike]: `%${buscar}%` } },
        { evento: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    return BitacoraFacturacion.findAll({
      where,
      order: [['fecha', 'DESC']],
      limit: 5000
    });
  }

  // =============================================
  // TIPOS DE EVENTO ÚNICOS (para filtro del frontend)
  // =============================================
  async tiposEvento() {
    const result = await BitacoraFacturacion.findAll({
      attributes: [[BitacoraFacturacion.sequelize.fn('DISTINCT', BitacoraFacturacion.sequelize.col('evento')), 'evento']],
      order: [['evento', 'ASC']],
      raw: true
    });
    return result.map(r => r.evento);
  }

  async eliminar(codBitacora) {
    const id = parseInt(codBitacora, 10);
    if (Number.isNaN(id) || id <= 0) {
      throw Object.assign(new Error('Código de bitácora inválido'), { statusCode: 400 });
    }

    const registro = await BitacoraFacturacion.findByPk(id);
    if (!registro) {
      throw Object.assign(new Error('Evento de auditoría no encontrado'), { statusCode: 404 });
    }

    await registro.destroy();
    return { mensaje: 'Evento de auditoría eliminado correctamente' };
  }
}

export default new BitacoraFacturacionService();
