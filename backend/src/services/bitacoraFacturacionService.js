import BitacoraFacturacion from '../models/BitacoraFacturacion.js';
import Usuario from '../models/Usuario.js';
import { Op } from 'sequelize';

const sequelize = BitacoraFacturacion.sequelize;

const extraerNumeroBusqueda = (termino) => {
  const digitos = String(termino).match(/\d+/g)?.join('');
  if (!digitos) return null;

  const numero = parseInt(digitos, 10);
  return Number.isNaN(numero) ? null : numero;
};

const construirWhere = ({ evento, entidad, cod_factura, cod_usuario, fecha_desde, fecha_hasta, buscar }) => {
  const where = {};

  if (evento) where.evento = evento;
  if (entidad) where.entidad = entidad;
  if (cod_factura) where.cod_factura = parseInt(cod_factura, 10);
  if (cod_usuario) where.cod_usuario = parseInt(cod_usuario, 10);

  if (fecha_desde || fecha_hasta) {
    where.fecha = {};
    if (fecha_desde) where.fecha[Op.gte] = new Date(fecha_desde);
    if (fecha_hasta) {
      const hasta = new Date(fecha_hasta);
      hasta.setHours(23, 59, 59, 999);
      where.fecha[Op.lte] = hasta;
    }
  }

  const termino = String(buscar || '').trim();
  if (termino) {
    const busqueda = `%${termino}%`;
    const condiciones = [
      { nombre_usuario: { [Op.iLike]: busqueda } },
      { evento: { [Op.iLike]: busqueda } },
      { entidad: { [Op.iLike]: busqueda } },
      sequelize.where(sequelize.cast(sequelize.col('detalle'), 'TEXT'), { [Op.iLike]: busqueda })
    ];

    const numero = extraerNumeroBusqueda(termino);
    if (numero !== null) {
      condiciones.push(
        { cod_bitacora: numero },
        { cod_factura: numero },
        { cod_usuario: numero }
      );
    }

    where[Op.or] = condiciones;
  }

  return where;
};

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
    const where = construirWhere({ evento, entidad, cod_factura, cod_usuario, fecha_desde, fecha_hasta, buscar });

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
    const where = construirWhere({ evento, entidad, cod_factura, cod_usuario, fecha_desde, fecha_hasta, buscar });

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

  async tiposEntidad() {
    const result = await BitacoraFacturacion.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('entidad')), 'entidad']],
      order: [['entidad', 'ASC']],
      raw: true
    });
    return result.map(r => r.entidad).filter(Boolean);
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
