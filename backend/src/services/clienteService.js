import { Op } from 'sequelize';
import Cliente from '../models/Cliente.js';

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

const limpiarTextoPdf = (valor = '') => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escaparTextoPdf = (valor = '') => limpiarTextoPdf(valor)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const truncar = (valor = '', largo = 20) => {
  const texto = limpiarTextoPdf(valor);
  return texto.length > largo ? `${texto.slice(0, largo - 1)}.` : texto;
};

const crearPdfDesdeLineas = (lineas = []) => {
  const lineasPorPagina = 38;
  const paginas = [];

  for (let i = 0; i < lineas.length; i += lineasPorPagina) {
    paginas.push(lineas.slice(i, i + lineasPorPagina));
  }

  const objetos = [];
  objetos[1] = '';
  objetos[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';
  objetos[3] = '';

  const kids = [];

  for (const lineasPagina of paginas) {
    const contenido = [
      'BT',
      '/F1 8 Tf',
      '12 TL',
      '36 550 Td',
      ...lineasPagina.map((linea) => `(${escaparTextoPdf(linea)}) Tj T*`),
      'ET'
    ].join('\n');

    const contenidoIndice = objetos.length;
    objetos[contenidoIndice] = `<< /Length ${Buffer.byteLength(contenido, 'latin1')} >>\nstream\n${contenido}\nendstream`;

    const paginaIndice = objetos.length;
    objetos[paginaIndice] = `<< /Type /Page /Parent 3 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 2 0 R >> >> /Contents ${contenidoIndice} 0 R >>`;
    kids.push(`${paginaIndice} 0 R`);
  }

  objetos[1] = '<< /Type /Catalog /Pages 3 0 R >>';
  objetos[3] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i < objetos.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;

  for (let i = 1; i < objetos.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
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
    await cliente.destroy();
    return { mensaje: 'Cliente eliminado' };
  }

  async exportarReportePdf({ buscar = '' } = {}) {
    const clientes = await Cliente.findAll({
      where: construirWhereClientes(buscar),
      attributes: ['cod_cliente', 'nombre', 'apellido', 'dni', 'rtn', 'empresa', 'telefono', 'correo', 'direccion'],
      order: [['cod_cliente', 'DESC']]
    });

    const fecha = new Date().toLocaleString();
    const lineas = [
      'REPORTE DE CLIENTES',
      `Fecha de generacion: ${fecha}`,
      buscar ? `Filtro aplicado: ${buscar}` : 'Filtro aplicado: Todos',
      `Total de clientes: ${clientes.length}`,
      '',
      '#    Nombre                   DNI           RTN            Empresa          Telefono  Correo',
      '---- ------------------------ ------------- -------------- ---------------- -------- ------------------------------'
    ];

    clientes.forEach((cliente, index) => {
      const nombre = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
      lineas.push([
        String(index + 1).padEnd(4),
        truncar(nombre, 24).padEnd(24),
        truncar(cliente.dni || '-', 13).padEnd(13),
        truncar(cliente.rtn || '-', 14).padEnd(14),
        truncar(cliente.empresa || '-', 16).padEnd(16),
        truncar(cliente.telefono || '-', 8).padEnd(8),
        truncar(cliente.correo || '-', 30).padEnd(30)
      ].join(' '));

      const direccion = truncar(cliente.direccion || '-', 100);
      if (direccion && direccion !== '-') {
        lineas.push(`     Direccion: ${direccion}`);
      }
    });

    return crearPdfDesdeLineas(lineas);
  }
}

export default new ClienteService();
