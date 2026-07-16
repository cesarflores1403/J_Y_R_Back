import { Op } from 'sequelize';
import CategoriaProducto from '../models/CategoriaProducto.js';
import ProductoSeq from '../models/ProductoSeq.js';
import { generarReportePdf } from '../utils/pdfReport.js';

const construirWhereCategorias = (buscar = '', soloActivas = '') => {
  const where = {};

  if (buscar) {
    where[Op.or] = [
      { nombre_categoria: { [Op.iLike]: `%${buscar}%` } },
      { descripcion: { [Op.iLike]: `%${buscar}%` } }
    ];
  }

  if (soloActivas === 'true' || soloActivas === '1') {
    where.estado_categoria = true;
  }

  return where;
};

class CategoriaProductoService {
  // Listar categorías con búsqueda y paginación
  async listar({ pagina = 1, limite = 15, buscar = '', soloActivas = '' }) {
    const where = construirWhereCategorias(buscar, soloActivas);

    const { count, rows } = await CategoriaProducto.findAndCountAll({
      where,
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['nombre_categoria', 'ASC']]
    });

    return { datos: rows, total: count, pagina: parseInt(pagina), totalPaginas: Math.ceil(count / limite) };
  }

  async exportarReportePdf({ buscar = '', soloActivas = '' } = {}) {
    const categorias = await CategoriaProducto.findAll({
      where: construirWhereCategorias(buscar, soloActivas),
      order: [['nombre_categoria', 'ASC']],
      attributes: ['cod_categoria', 'nombre_categoria', 'descripcion', 'estado_categoria']
    });

    return generarReportePdf({
      titulo: 'Reporte de categorias',
      filtros: [
        { label: 'Busqueda', value: buscar || 'Todos' },
        { label: 'Solo activas', value: soloActivas === 'true' || soloActivas === '1' ? 'Si' : 'No' }
      ],
      metricas: [
        { label: 'Total de categorias', value: categorias.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 36, align: 'center' },
        { header: 'ID', key: 'id', width: 50, align: 'center' },
        { header: 'Categoria', key: 'nombre', width: 190 },
        { header: 'Descripcion', key: 'descripcion', width: 330 },
        { header: 'Estado', key: 'estado', width: 114 }
      ],
      filas: categorias.map((categoria, index) => ({
        numero: index + 1,
        id: categoria.cod_categoria,
        nombre: categoria.nombre_categoria,
        descripcion: categoria.descripcion || '-',
        estado: categoria.estado_categoria ? 'Activa' : 'Inactiva'
      }))
    });
  }
  // Listar todas las activas (para selects/dropdowns, sin paginación)
  async listarActivas() {
    const categorias = await CategoriaProducto.findAll({
      where: { estado_categoria: true },
      order: [['nombre_categoria', 'ASC']],
      attributes: ['cod_categoria', 'nombre_categoria']
    });
    return categorias;
  }

  // Obtener por ID
  async obtenerPorId(id) {
    const categoria = await CategoriaProducto.findByPk(id);
    if (!categoria) throw Object.assign(new Error('Categoría no encontrada'), { statusCode: 404 });
    return categoria;
  }

  // Crear — validar nombre único
  async crear(datos) {
    const existente = await CategoriaProducto.findOne({
      where: { nombre_categoria: { [Op.iLike]: datos.nombre_categoria.trim() } }
    });
    if (existente) {
      throw Object.assign(new Error('Ya existe una categoría con ese nombre'), { statusCode: 409 });
    }
    return CategoriaProducto.create({
      nombre_categoria: datos.nombre_categoria.trim(),
      descripcion: datos.descripcion?.trim() || null,
      estado_categoria: datos.estado_categoria !== undefined ? datos.estado_categoria : true
    });
  }

  // Actualizar — validar nombre único (excluyendo el actual)
  async actualizar(id, datos) {
    const categoria = await this.obtenerPorId(id);

    if (datos.nombre_categoria) {
      const existente = await CategoriaProducto.findOne({
        where: {
          nombre_categoria: { [Op.iLike]: datos.nombre_categoria.trim() },
          cod_categoria: { [Op.ne]: id }
        }
      });
      if (existente) {
        throw Object.assign(new Error('Ya existe otra categoría con ese nombre'), { statusCode: 409 });
      }
    }

    await categoria.update({
      nombre_categoria: datos.nombre_categoria?.trim() ?? categoria.nombre_categoria,
      descripcion: datos.descripcion !== undefined ? (datos.descripcion?.trim() || null) : categoria.descripcion,
      estado_categoria: datos.estado_categoria !== undefined ? datos.estado_categoria : categoria.estado_categoria
    });

    return categoria;
  }

  // Toggle estado (activar/inactivar)
  async toggleEstado(id) {
    const categoria = await this.obtenerPorId(id);

    // Si se va a inactivar, permitirlo (soft-delete)
    // Si se va a eliminar, verificar productos asociados
    await categoria.update({ estado_categoria: !categoria.estado_categoria });
    return categoria;
  }

  // Eliminar — bloquear si tiene productos asociados
  async eliminar(id) {
    const categoria = await this.obtenerPorId(id);

    // Verificar si tiene productos asociados
    const productosAsociados = await ProductoSeq.count({
      where: { cod_categoria: id }
    });

    if (productosAsociados > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar: la categoría tiene ${productosAsociados} producto(s) asociado(s). Puede inactivarla en su lugar.`),
        { statusCode: 409 }
      );
    }

    await categoria.destroy();
    return { mensaje: 'Categoría eliminada correctamente' };
  }
}

export default new CategoriaProductoService();
