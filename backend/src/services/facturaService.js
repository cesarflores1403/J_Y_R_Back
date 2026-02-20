import { sequelize } from '../config/sequelize.js';
import Factura from '../models/Factura.js';
import DetalleFactura from '../models/DetalleFactura.js';
import Cliente from '../models/Cliente.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Usuario from '../models/Usuario.js';
import { Op } from 'sequelize';

class FacturaService {

  // =============================================
  // LISTAR FACTURAS (con paginación y búsqueda)
  // =============================================
  async listar({ pagina = 1, limite = 15, buscar = '' }) {
    const where = {};
    if (buscar) {
      where[Op.or] = [
        { '$cliente.nombre$': { [Op.iLike]: `%${buscar}%` } },
        { '$cliente.apellido$': { [Op.iLike]: `%${buscar}%` } },
        { '$cliente.dni$': { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    const { count, rows } = await Factura.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['cod_cliente', 'nombre', 'apellido', 'dni'] },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
      ],
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['cod_factura', 'DESC']],
      subQuery: false
    });

    return {
      datos: rows,
      total: count,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(count / limite)
    };
  }

  // =============================================
  // OBTENER FACTURA POR ID (con detalles)
  // =============================================
  async obtenerPorId(id) {
    const factura = await Factura.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] },
        {
          model: DetalleFactura,
          as: 'detalles',
          include: [{ model: ProductoSeq, as: 'producto', attributes: ['cod_producto', 'nombre_producto', 'unidad_medida'] }]
        }
      ]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    return factura;
  }

  // =============================================
  // CREAR FACTURA (transacción: factura + detalles + inventario)
  // =============================================
  async crear(datos, codUsuario) {
    const { cod_cliente, metodo_pago, ref_pago, items } = datos;

    // Validaciones
    if (!cod_cliente) throw Object.assign(new Error('El cliente es requerido'), { statusCode: 400 });
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Debe incluir al menos 1 ítem'), { statusCode: 400 });
    }

    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(cod_cliente);
    if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });

    // Iniciar transacción
    const t = await sequelize.transaction();

    try {
      // Calcular totales por cada ítem
      let subtotalGeneral = 0;
      let isvGeneral = 0;

      const detallesCalculados = [];

      for (const item of items) {
        // Validar item
        if (!item.cod_producto || !item.cantidad || item.cantidad <= 0) {
          throw Object.assign(new Error('Cada ítem debe tener cod_producto y cantidad > 0'), { statusCode: 400 });
        }

        // Obtener producto
        const producto = await ProductoSeq.findByPk(item.cod_producto, { transaction: t });
        if (!producto) {
          throw Object.assign(new Error(`Producto con código ${item.cod_producto} no encontrado`), { statusCode: 404 });
        }
        if (!producto.estado_producto) {
          throw Object.assign(new Error(`El producto "${producto.nombre_producto}" está inactivo`), { statusCode: 400 });
        }

        // Verificar stock en inventario
        const [invResult] = await sequelize.query(
          'SELECT stock FROM inventario WHERE cod_producto = :codProd LIMIT 1',
          { replacements: { codProd: item.cod_producto }, type: sequelize.QueryTypes.SELECT, transaction: t }
        );

        const stockActual = invResult ? parseInt(invResult.stock) : 0;
        if (stockActual < item.cantidad) {
          throw Object.assign(
            new Error(`Stock insuficiente para "${producto.nombre_producto}". Disponible: ${stockActual}, solicitado: ${item.cantidad}`),
            { statusCode: 400 }
          );
        }

        const precioUnitario = parseFloat(producto.precio_venta);
        const isvProducto = parseFloat(producto.isv) || 0;
        const subtotalItem = precioUnitario * item.cantidad;
        const isvItem = (isvProducto / 100) * subtotalItem;
        const totalItem = subtotalItem + isvItem;

        subtotalGeneral += subtotalItem;
        isvGeneral += isvItem;

        detallesCalculados.push({
          tipo_item: 'PRODUCTO',
          cod_producto: item.cod_producto,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario.toFixed(2),
          isv: isvItem.toFixed(2),
          subtotal: subtotalItem.toFixed(2),
          total: totalItem.toFixed(2)
        });
      }

      const totalGeneral = subtotalGeneral + isvGeneral;

      // Crear factura
      const factura = await Factura.create({
        cod_cliente,
        cod_usuario: codUsuario,
        metodo_pago: metodo_pago || null,
        ref_pago: ref_pago || null,
        subtotal: subtotalGeneral.toFixed(2),
        isv: isvGeneral.toFixed(2),
        total: totalGeneral.toFixed(2),
        estado: true
      }, { transaction: t });

      // Crear detalles
      const detallesConFactura = detallesCalculados.map(d => ({
        ...d,
        cod_factura: factura.cod_factura
      }));
      await DetalleFactura.bulkCreate(detallesConFactura, { transaction: t });

      // Actualizar inventario (restar stock)
      for (const item of items) {
        await sequelize.query(
          'UPDATE inventario SET stock = stock - :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
          { replacements: { cant: item.cantidad, codProd: item.cod_producto }, transaction: t }
        );
      }

      await t.commit();

      // Retornar factura completa
      return this.obtenerPorId(factura.cod_factura);

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // ANULAR FACTURA (restaurar inventario)
  // =============================================
  async anular(id) {
    const factura = await Factura.findByPk(id, {
      include: [{ model: DetalleFactura, as: 'detalles' }]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    if (!factura.estado) throw Object.assign(new Error('La factura ya está anulada'), { statusCode: 400 });

    const t = await sequelize.transaction();
    try {
      // Restaurar inventario
      for (const detalle of factura.detalles) {
        if (detalle.cod_producto) {
          await sequelize.query(
            'UPDATE inventario SET stock = stock + :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
            { replacements: { cant: detalle.cantidad, codProd: detalle.cod_producto }, transaction: t }
          );
        }
      }

      // Marcar como anulada
      await factura.update({ estado: false }, { transaction: t });
      await t.commit();

      return { mensaje: 'Factura anulada correctamente' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // OBTENER PRODUCTOS DISPONIBLES (para el selector)
  // =============================================
  async productosDisponibles({ buscar = '' }) {
    const where = { estado_producto: true };
    if (buscar) {
      where.nombre_producto = { [Op.iLike]: `%${buscar}%` };
    }

    const productos = await ProductoSeq.findAll({
      where,
      attributes: ['cod_producto', 'nombre_producto', 'unidad_medida', 'precio_venta', 'isv'],
      order: [['nombre_producto', 'ASC']],
      limit: 50
    });

    // Agregar stock a cada producto
    const resultado = [];
    for (const p of productos) {
      const [inv] = await sequelize.query(
        'SELECT stock FROM inventario WHERE cod_producto = :codProd LIMIT 1',
        { replacements: { codProd: p.cod_producto }, type: sequelize.QueryTypes.SELECT }
      );
      resultado.push({
        ...p.toJSON(),
        stock: inv ? parseInt(inv.stock) : 0
      });
    }

    return resultado;
  }

  // =============================================
  // CLIENTES (para el selector)
  // =============================================
  async clientesDisponibles({ buscar = '' }) {
    const where = {};
    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { apellido: { [Op.iLike]: `%${buscar}%` } },
        { dni: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    return Cliente.findAll({
      where,
      attributes: ['cod_cliente', 'nombre', 'apellido', 'dni', 'empresa'],
      order: [['nombre', 'ASC']],
      limit: 50
    });
  }
}

export default new FacturaService();
