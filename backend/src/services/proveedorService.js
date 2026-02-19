import { Op } from 'sequelize';
import Proveedor from '../models/ProveedorModel.js';

class ProveedorService {
  async listar({ pagina = 1, limite = 15, buscar = '' }) {
    const where = {};
    if (buscar) {
      where[Op.or] = [
        { nombre_proveedor: { [Op.iLike]: `%${buscar}%` } },
        { correo: { [Op.iLike]: `%${buscar}%` } },
        { pais: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    const { count, rows } = await Proveedor.findAndCountAll({
      where,
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['nombre_proveedor', 'ASC']]
    });

    return { datos: rows, total: count, pagina: parseInt(pagina), totalPaginas: Math.ceil(count / limite) };
  }

  async obtenerPorId(id) {
    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) throw Object.assign(new Error('Proveedor no encontrado'), { statusCode: 404 });
    return proveedor;
  }

  async crear(datos) {
    return Proveedor.create(datos);
  }

  async actualizar(id, datos) {
    const proveedor = await this.obtenerPorId(id);
    await proveedor.update(datos);
    return proveedor;
  }

  async toggleEstado(id) {
    const proveedor = await this.obtenerPorId(id);
    await proveedor.update({ estado_proveedor: !proveedor.estado_proveedor });
    return proveedor;
  }
}

export default new ProveedorService();
