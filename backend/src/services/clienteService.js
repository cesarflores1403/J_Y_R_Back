import { Op } from 'sequelize';
import Cliente from '../models/Cliente.js';

class ClienteService {
  normalizarDatos(datos = {}) {
    const normalizado = { ...datos };
    const camposTexto = ['nombre', 'apellido', 'empresa', 'direccion'];

    for (const campo of camposTexto) {
      if (typeof normalizado[campo] === 'string') {
        normalizado[campo] = normalizado[campo].trim();
      }
    }

    if (typeof normalizado.correo === 'string') {
      normalizado.correo = normalizado.correo.trim().toLowerCase();
    }

    if (typeof normalizado.dni === 'string') {
      normalizado.dni = normalizado.dni.trim();
    }

    if (typeof normalizado.telefono === 'string') {
      normalizado.telefono = normalizado.telefono.trim();
    }

    if (typeof normalizado.rtn === 'string') {
      const rtnLimpio = normalizado.rtn.trim();
      normalizado.rtn = rtnLimpio === '' ? null : rtnLimpio;
    }

    return normalizado;
  }

  async listar({ pagina = 1, limite = 15, buscar = '' }) {
    const where = {};

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { apellido: { [Op.iLike]: `%${buscar}%` } },
        { dni: { [Op.iLike]: `%${buscar}%` } },
        { empresa: { [Op.iLike]: `%${buscar}%` } },
        { correo: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    const paginaNum = parseInt(pagina, 10) || 1;
    const limiteNum = parseInt(limite, 10) || 15;

    const { count, rows } = await Cliente.findAndCountAll({
      where,
      limit: limiteNum,
      offset: (paginaNum - 1) * limiteNum,
      order: [['cod_cliente', 'DESC']]
    });

    return {
      datos: rows,
      total: count,
      pagina: paginaNum,
      totalPaginas: Math.ceil(count / limiteNum)
    };
  }

  async obtenerPorId(id) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });
    }
    return cliente;
  }

  async crear(datos) {
    const payload = this.normalizarDatos(datos);

    if (payload.dni) {
      const existe = await Cliente.findOne({ where: { dni: payload.dni } });
      if (existe) {
        throw Object.assign(new Error('El DNI ya está registrado'), { statusCode: 409 });
      }
    }

    if (payload.correo) {
      const existeCorreo = await Cliente.findOne({ where: { correo: payload.correo } });
      if (existeCorreo) {
        throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 });
      }
    }

    return Cliente.create(payload);
  }

  async verificarDuplicado({ dni, correo }) {
    const resultado = { duplicado: false, campo: null, cliente: null };

    if (dni) {
      const existe = await Cliente.findOne({
        where: { dni },
        attributes: ['cod_cliente', 'nombre', 'apellido', 'dni', 'empresa']
      });
      if (existe) return { duplicado: true, campo: 'dni', cliente: existe };
    }

    if (correo) {
      const existe = await Cliente.findOne({
        where: { correo },
        attributes: ['cod_cliente', 'nombre', 'apellido', 'correo', 'empresa']
      });
      if (existe) return { duplicado: true, campo: 'correo', cliente: existe };
    }

    return resultado;
  }

  async actualizar(id, datos) {
    const payload = this.normalizarDatos(datos);
    const cliente = await this.obtenerPorId(id);
    await cliente.update(payload);
    return cliente;
  }

  async eliminar(id) {
    const cliente = await this.obtenerPorId(id);
    await cliente.destroy();
    return { mensaje: 'Cliente eliminado' };
  }
}

export default new ClienteService();
