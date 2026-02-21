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
  // HU-FAC-03: Cálculo ISV y totales por línea con redondeo a 2 decimales
  // =============================================
  async crear(datos, codUsuario) {
    const { cod_cliente, metodo_pago, ref_pago, items } = datos;

    // Función de redondeo preciso a 2 decimales
    const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

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
      let subtotalGeneral = 0;
      let descuentoGeneral = 0;
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
        if (producto.estado_producto !== 'Activo') {
          throw Object.assign(
            new Error(`El producto "${producto.nombre_producto}" no está disponible para venta (Estado: ${producto.estado_producto})`),
            { statusCode: 400 }
          );
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

        const precioUnitario = round2(producto.precio_venta);
        const descuento = round2(item.descuento || 0); // porcentaje 0-100

        // Obtener ISV del catálogo usando cod_isv del producto
        let isvPorcentaje = 0;
        if (producto.cod_isv) {
          const [isvInfo] = await sequelize.query(
            'SELECT porcentaje FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1',
            { replacements: { codIsv: producto.cod_isv }, type: sequelize.QueryTypes.SELECT, transaction: t }
          );
          isvPorcentaje = isvInfo ? parseFloat(isvInfo.porcentaje) : 0;
        }

        // Cálculo por línea con redondeo
        const subtotalBruto = round2(precioUnitario * item.cantidad);
        const montoDescuento = round2((descuento / 100) * subtotalBruto);
        const subtotalItem = round2(subtotalBruto - montoDescuento);
        const isvItem = round2((isvPorcentaje / 100) * subtotalItem);
        const totalItem = round2(subtotalItem + isvItem);

        subtotalGeneral = round2(subtotalGeneral + subtotalItem);
        descuentoGeneral = round2(descuentoGeneral + montoDescuento);
        isvGeneral = round2(isvGeneral + isvItem);

        detallesCalculados.push({
          tipo_item: 'PRODUCTO',
          cod_producto: item.cod_producto,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          descuento: descuento,
          isv: isvItem,
          subtotal: subtotalItem,
          total: totalItem
        });
      }

      const totalGeneral = round2(subtotalGeneral + isvGeneral);

      // Crear factura
      const factura = await Factura.create({
        cod_cliente,
        cod_usuario: codUsuario,
        metodo_pago: metodo_pago || null,
        ref_pago: ref_pago || null,
        subtotal: subtotalGeneral,
        descuento: descuentoGeneral,
        isv: isvGeneral,
        total: totalGeneral,
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
  // ELIMINAR FACTURA PERMANENTEMENTE
  // (Primero restaura inventario si estaba activa, luego borra detalles y factura)
  // =============================================
  async eliminar(id) {
    const factura = await Factura.findByPk(id, {
      include: [{ model: DetalleFactura, as: 'detalles' }]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });

    const t = await sequelize.transaction();
    try {
      // Si la factura estaba activa, restaurar inventario antes de eliminar
      if (factura.estado) {
        for (const detalle of factura.detalles) {
          if (detalle.cod_producto) {
            await sequelize.query(
              'UPDATE inventario SET stock = stock + :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
              { replacements: { cant: detalle.cantidad, codProd: detalle.cod_producto }, transaction: t }
            );
          }
        }
      }

      // Eliminar detalles
      await DetalleFactura.destroy({ where: { cod_factura: id }, transaction: t });

      // Eliminar factura
      await factura.destroy({ transaction: t });

      await t.commit();
      return { mensaje: 'Factura eliminada permanentemente' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // OBTENER PRODUCTOS DISPONIBLES (para el selector)
  // Busca por código o nombre del producto
  // =============================================
  async productosDisponibles({ buscar = '' }) {
    const where = { estado_producto: 'Activo' };
    if (buscar) {
      const busqueda = buscar.trim();
      // Si es numérico, buscamos por cod_producto exacto o parcial
      // Si es texto, buscamos por nombre
      const esNumero = /^\d+$/.test(busqueda);
      if (esNumero) {
        where[Op.or] = [
          { cod_producto: parseInt(busqueda) },
          { nombre_producto: { [Op.iLike]: `%${busqueda}%` } }
        ];
      } else {
        where[Op.or] = [
          { nombre_producto: { [Op.iLike]: `%${busqueda}%` } },
          sequelize.where(
            sequelize.cast(sequelize.col('cod_producto'), 'TEXT'),
            { [Op.iLike]: `%${busqueda}%` }
          )
        ];
      }
    }

    const productos = await ProductoSeq.findAll({
      where,
      attributes: ['cod_producto', 'nombre_producto', 'unidad_medida', 'precio_venta', 'cod_isv'],
      order: [['nombre_producto', 'ASC']],
      limit: 20
    });

    // Agregar stock e ISV a cada producto
    const resultado = [];
    for (const p of productos) {
      const [inv] = await sequelize.query(
        'SELECT stock FROM inventario WHERE cod_producto = :codProd LIMIT 1',
        { replacements: { codProd: p.cod_producto }, type: sequelize.QueryTypes.SELECT }
      );
      const [isvInfo] = await sequelize.query(
        'SELECT porcentaje, descripcion FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1',
        { replacements: { codIsv: p.cod_isv }, type: sequelize.QueryTypes.SELECT }
      );
      resultado.push({
        ...p.toJSON(),
        stock: inv ? parseInt(inv.stock) : 0,
        isv: isvInfo ? parseFloat(isvInfo.porcentaje) : 0,
        isv_descripcion: isvInfo ? isvInfo.descripcion : 'Sin ISV'
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
