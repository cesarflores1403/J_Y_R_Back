import { Op } from 'sequelize';
import Cliente from '../models/Cliente.js';

class ClienteService {
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

    const { count, rows } = await Cliente.findAndCountAll({
      where,
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['nombre', 'ASC']]
    });

    return { datos: rows, total: count, pagina: parseInt(pagina), totalPaginas: Math.ceil(count / limite) };
  }

  async obtenerPorId(id) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });
    return cliente;
  }

  async crear(datos) {
    if (datos.dni) {
      const existe = await Cliente.findOne({ where: { dni: datos.dni } });
      if (existe) throw Object.assign(new Error('El DNI ya está registrado'), { statusCode: 409 });
    }
    if (datos.correo) {
      const existeCorreo = await Cliente.findOne({ where: { correo: datos.correo } });
      if (existeCorreo) throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 });
    }
    return Cliente.create(datos);
  }

  async verificarDuplicado({ dni, correo }) {
    const resultado = { duplicado: false, campo: null, cliente: null };
    if (dni) {
      const existe = await Cliente.findOne({ where: { dni }, attributes: ['cod_cliente', 'nombre', 'apellido', 'dni', 'empresa'] });
      if (existe) return { duplicado: true, campo: 'dni', cliente: existe };
    }
    if (correo) {
      const existe = await Cliente.findOne({ where: { correo }, attributes: ['cod_cliente', 'nombre', 'apellido', 'correo', 'empresa'] });
      if (existe) return { duplicado: true, campo: 'correo', cliente: existe };
    }
    return resultado;
  }

  async actualizar(id, datos) {
    const cliente = await this.obtenerPorId(id);
    await cliente.update(datos);
    return cliente;
  }

  async eliminar(id) {
    const cliente = await this.obtenerPorId(id);
    await cliente.destroy();
    return { mensaje: 'Cliente eliminado' };
  }
}

export default new ClienteService();
