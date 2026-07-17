import { Op, ForeignKeyConstraintError } from 'sequelize';
import Cliente from '../models/Cliente.js';
import { generarReportePdf } from '../utils/pdfReport.js';

const construirWhereClientes = (buscar = '') => {
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

  return where;
};

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
    const where = construirWhereClientes(buscar);

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

    try {
      await cliente.destroy();
      return { mensaje: 'Cliente eliminado' };
    } catch (error) {
      // El cliente tiene registros dependientes (facturas, cotizaciones, etc.).
      // Devolvemos un mensaje genérico y registramos el detalle técnico
      // solo en los logs internos, sin exponerlo al cliente HTTP.
      const esViolacionFK =
        error instanceof ForeignKeyConstraintError ||
        error?.name === 'SequelizeForeignKeyConstraintError' ||
        error?.original?.code === '23503' ||
        error?.parent?.code === '23503';

      if (esViolacionFK) {
        console.error(`[clienteService.eliminar] No se pudo eliminar el cliente ${id}:`, error);
        throw Object.assign(
          new Error('No es posible eliminar el cliente porque tiene registros asociados'),
          { statusCode: 409 }
        );
      }
      throw error;
    }
  }

  async exportarReportePdf({ buscar = '' } = {}) {
    const clientes = await Cliente.findAll({
      where: construirWhereClientes(buscar),
      attributes: ['cod_cliente', 'nombre', 'apellido', 'dni', 'rtn', 'empresa', 'telefono', 'correo', 'direccion'],
      order: [['cod_cliente', 'DESC']]
    });

    return generarReportePdf({
      titulo: 'Reporte de clientes',
      filtros: [
        { label: 'Filtro', value: buscar || 'Todos' }
      ],
      metricas: [
        { label: 'Total de clientes', value: clientes.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 28, align: 'center' },
        { header: 'Cliente', key: 'cliente', width: 105 },
        { header: 'DNI', key: 'dni', width: 75 },
        { header: 'RTN', key: 'rtn', width: 78 },
        { header: 'Empresa', key: 'empresa', width: 80 },
        { header: 'Telefono', key: 'telefono', width: 55 },
        { header: 'Correo', key: 'correo', width: 125 },
        { header: 'Direccion', key: 'direccion', width: 174 }
      ],
      filas: clientes.map((cliente, index) => ({
        numero: index + 1,
        cliente: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
        dni: cliente.dni,
        rtn: cliente.rtn,
        empresa: cliente.empresa,
        telefono: cliente.telefono,
        correo: cliente.correo,
        direccion: cliente.direccion
      }))
    });
  }
}

export default new ClienteService();
