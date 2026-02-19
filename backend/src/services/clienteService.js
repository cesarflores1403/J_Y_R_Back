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
    return Cliente.create(datos);
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
