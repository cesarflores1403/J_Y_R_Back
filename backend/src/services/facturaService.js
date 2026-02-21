import { sequelize } from '../config/sequelize.js';
import Factura from '../models/Factura.js';
import DetalleFactura from '../models/DetalleFactura.js';
import Cliente from '../models/Cliente.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Usuario from '../models/Usuario.js';
import Pago from '../models/Pago.js';
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
        },
        {
          model: Pago,
          as: 'pagos',
          include: [{ model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }],
          order: [['fecha_pago', 'DESC']]
        }
      ]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    return factura;
  }

  // =============================================
  // CREAR FACTURA (transacción: factura + detalles + inventario)
  // HU-FAC-03: Cálculo ISV y totales por línea con redondeo a 2 decimales
  // HU-FAC-04: Descuentos por línea (% o monto) y/o descuento global por factura
  // =============================================
  async crear(datos, codUsuario) {
    const { cod_cliente, metodo_pago, ref_pago, items, descuento_global, tipo_descuento_global } = datos;

    // Función de redondeo preciso a 2 decimales
    const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

    // Validaciones básicas
    if (!cod_cliente) throw Object.assign(new Error('El cliente es requerido'), { statusCode: 400 });
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Debe incluir al menos 1 ítem'), { statusCode: 400 });
    }

    // Validar descuento global si se envía
    const descGlobal = parseFloat(descuento_global) || 0;
    const tipoDescGlobal = tipo_descuento_global || null;
    if (descGlobal > 0 && !['PORCENTAJE', 'MONTO'].includes(tipoDescGlobal)) {
      throw Object.assign(new Error('tipo_descuento_global debe ser PORCENTAJE o MONTO'), { statusCode: 400 });
    }
    if (descGlobal < 0) {
      throw Object.assign(new Error('El descuento global no puede ser negativo'), { statusCode: 400 });
    }
    if (tipoDescGlobal === 'PORCENTAJE' && descGlobal > 100) {
      throw Object.assign(new Error('El descuento global en porcentaje no puede ser mayor a 100%'), { statusCode: 400 });
    }

    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(cod_cliente);
    if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });

    // Iniciar transacción
    const t = await sequelize.transaction();

    try {
      let subtotalBrutoGeneral = 0;   // Suma de (precio * cantidad) antes de descuentos
      let descuentoLineasTotal = 0;    // Suma monetaria de descuentos de línea
      let subtotalGeneral = 0;         // Suma de subtotales después de desc. línea
      let isvGeneral = 0;
      const detallesCalculados = [];

      for (const item of items) {
        // Validar item
        if (!item.cod_producto || !item.cantidad || item.cantidad <= 0) {
          throw Object.assign(new Error('Cada ítem debe tener cod_producto y cantidad > 0'), { statusCode: 400 });
        }

        // Validar tipo de descuento de línea
        const tipoDescLinea = item.tipo_descuento || 'PORCENTAJE';
        if (!['PORCENTAJE', 'MONTO'].includes(tipoDescLinea)) {
          throw Object.assign(new Error('tipo_descuento del ítem debe ser PORCENTAJE o MONTO'), { statusCode: 400 });
        }
        const descLinea = round2(parseFloat(item.descuento) || 0);
        if (descLinea < 0) {
          throw Object.assign(new Error('El descuento del ítem no puede ser negativo'), { statusCode: 400 });
        }
        if (tipoDescLinea === 'PORCENTAJE' && descLinea > 100) {
          throw Object.assign(new Error('El descuento en porcentaje no puede ser mayor a 100%'), { statusCode: 400 });
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

        // Obtener ISV del catálogo usando cod_isv del producto
        let isvPorcentaje = 0;
        if (producto.cod_isv) {
          const [isvInfo] = await sequelize.query(
            'SELECT porcentaje FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1',
            { replacements: { codIsv: producto.cod_isv }, type: sequelize.QueryTypes.SELECT, transaction: t }
          );
          isvPorcentaje = isvInfo ? parseFloat(isvInfo.porcentaje) : 0;
        }

        // --- Cálculo de descuento por línea (HU-FAC-04) ---
        const subtotalBruto = round2(precioUnitario * item.cantidad);
        let montoDescuento = 0;
        if (tipoDescLinea === 'PORCENTAJE') {
          montoDescuento = round2((descLinea / 100) * subtotalBruto);
        } else {
          // MONTO: no puede exceder el subtotal bruto
          montoDescuento = round2(Math.min(descLinea, subtotalBruto));
        }

        const subtotalItem = round2(subtotalBruto - montoDescuento);
        const isvItem = round2((isvPorcentaje / 100) * subtotalItem);
        const totalItem = round2(subtotalItem + isvItem);

        subtotalBrutoGeneral = round2(subtotalBrutoGeneral + subtotalBruto);
        descuentoLineasTotal = round2(descuentoLineasTotal + montoDescuento);
        subtotalGeneral = round2(subtotalGeneral + subtotalItem);
        isvGeneral = round2(isvGeneral + isvItem);

        detallesCalculados.push({
          tipo_item: 'PRODUCTO',
          cod_producto: item.cod_producto,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          tipo_descuento: tipoDescLinea,
          descuento: descLinea,
          monto_descuento: montoDescuento,
          isv: isvItem,
          subtotal: subtotalItem,
          total: totalItem
        });
      }

      // --- Descuento global de factura (HU-FAC-04) ---
      let montoDescGlobal = 0;
      if (descGlobal > 0 && tipoDescGlobal) {
        if (tipoDescGlobal === 'PORCENTAJE') {
          montoDescGlobal = round2((descGlobal / 100) * subtotalGeneral);
        } else {
          // MONTO: no puede exceder el subtotal general
          montoDescGlobal = round2(Math.min(descGlobal, subtotalGeneral));
        }

        // Recalcular ISV proporcionalmente al descuento global
        // factor = porción que queda del subtotal después del descuento global
        if (subtotalGeneral > 0) {
          const factor = round2((subtotalGeneral - montoDescGlobal) / subtotalGeneral);
          isvGeneral = round2(isvGeneral * factor);
        }
        subtotalGeneral = round2(subtotalGeneral - montoDescGlobal);
      }

      const descuentoTotal = round2(descuentoLineasTotal + montoDescGlobal);
      const totalGeneral = round2(subtotalGeneral + isvGeneral);

      // Determinar si se aplicó algún descuento (para auditoría)
      const hayDescuento = descuentoLineasTotal > 0 || montoDescGlobal > 0;

      // Crear factura
      const factura = await Factura.create({
        cod_cliente,
        cod_usuario: codUsuario,
        metodo_pago: metodo_pago || null,
        ref_pago: ref_pago || null,
        subtotal: subtotalGeneral,
        descuento: descuentoTotal,
        descuento_global: descGlobal,
        tipo_descuento_global: tipoDescGlobal,
        monto_descuento_global: montoDescGlobal,
        descuento_aplicado_por: hayDescuento ? codUsuario : null,
        isv: isvGeneral,
        total: totalGeneral,
        estado_pago: 'PENDIENTE',
        total_pagado: 0,
        saldo: totalGeneral,
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
      const esNumero = /^\d+$/.test(busqueda);
      if (esNumero) {
        where[Op.or] = [
          { cod_producto: parseInt(busqueda) },
          { nombre_producto: { [Op.iLike]: `%${busqueda}%` } }
        ];
      } else {
        where.nombre_producto = { [Op.iLike]: `%${busqueda}%` };
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
