import { sequelize } from '../config/sequelize.js';
import Cotizacion from '../models/Cotizacion.js';
import DetalleCotizacion from '../models/DetalleCotizacion.js';
import Factura from '../models/Factura.js';
import DetalleFactura from '../models/DetalleFactura.js';
import Cliente from '../models/Cliente.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Usuario from '../models/Usuario.js';
import { Op } from 'sequelize';

const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

class CotizacionService {

  // =============================================
  // LISTAR COTIZACIONES
  // =============================================
  async listar({ pagina = 1, limite = 15, buscar = '', estado = '' }) {
    const where = {};
    if (buscar) {
      where[Op.or] = [
        { '$cliente.nombre$': { [Op.iLike]: `%${buscar}%` } },
        { '$cliente.apellido$': { [Op.iLike]: `%${buscar}%` } },
        { '$cliente.dni$': { [Op.iLike]: `%${buscar}%` } }
      ];
    }
    if (estado) {
      where.estado_cotizacion = estado;
    }

    const { count, rows } = await Cotizacion.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['cod_cliente', 'nombre', 'apellido', 'dni'] },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
      ],
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['cod_cotizacion', 'DESC']],
      subQuery: false
    });

    // Auto-vencer cotizaciones expiradas
    const ahora = new Date();
    for (const cot of rows) {
      if (cot.estado_cotizacion === 'VIGENTE' && cot.fecha_vencimiento && new Date(cot.fecha_vencimiento) < ahora) {
        await cot.update({ estado_cotizacion: 'VENCIDA' });
        cot.estado_cotizacion = 'VENCIDA';
      }
    }

    return {
      datos: rows,
      total: count,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(count / limite)
    };
  }

  // =============================================
  // OBTENER COTIZACIÓN POR ID
  // =============================================
  async obtenerPorId(id) {
    const cotizacion = await Cotizacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] },
        {
          model: DetalleCotizacion,
          as: 'detalles',
          include: [{ model: ProductoSeq, as: 'producto', attributes: ['cod_producto', 'nombre_producto', 'unidad_medida'] }]
        }
      ]
    });
    if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada'), { statusCode: 404 });

    // Auto-vencer si expirada
    if (cotizacion.estado_cotizacion === 'VIGENTE' && cotizacion.fecha_vencimiento && new Date(cotizacion.fecha_vencimiento) < new Date()) {
      await cotizacion.update({ estado_cotizacion: 'VENCIDA' });
      cotizacion.estado_cotizacion = 'VENCIDA';
    }

    const empresa = (await import('../config/empresa.js')).default;
    return { cotizacion, empresa };
  }

  // =============================================
  // CREAR COTIZACIÓN (misma lógica de ítems/ISV/descuentos que factura, SIN descontar inventario)
  // =============================================
  async crear(datos, codUsuario) {
    const { cod_cliente, items, descuento_global, tipo_descuento_global, vigencia_dias, observaciones } = datos;

    if (!cod_cliente) throw Object.assign(new Error('El cliente es requerido'), { statusCode: 400 });
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Debe incluir al menos 1 ítem'), { statusCode: 400 });
    }

    const descGlobal = parseFloat(descuento_global) || 0;
    const tipoDescGlobal = tipo_descuento_global || null;
    if (descGlobal > 0 && !['PORCENTAJE', 'MONTO'].includes(tipoDescGlobal)) {
      throw Object.assign(new Error('tipo_descuento_global debe ser PORCENTAJE o MONTO'), { statusCode: 400 });
    }
    if (descGlobal < 0) throw Object.assign(new Error('El descuento global no puede ser negativo'), { statusCode: 400 });
    if (tipoDescGlobal === 'PORCENTAJE' && descGlobal > 100) throw Object.assign(new Error('El descuento global en porcentaje no puede ser mayor a 100%'), { statusCode: 400 });

    const cliente = await Cliente.findByPk(cod_cliente);
    if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });

    const t = await sequelize.transaction();
    try {
      let subtotalBrutoGeneral = 0, descuentoLineasTotal = 0, subtotalGeneral = 0, isvGeneral = 0;
      const detallesCalculados = [];

      for (const item of items) {
        if (!item.cod_producto || !item.cantidad || item.cantidad <= 0) {
          throw Object.assign(new Error('Cada ítem debe tener cod_producto y cantidad > 0'), { statusCode: 400 });
        }

        const tipoDescLinea = item.tipo_descuento || 'PORCENTAJE';
        const descLinea = round2(parseFloat(item.descuento) || 0);

        const producto = await ProductoSeq.findByPk(item.cod_producto, { transaction: t });
        if (!producto) throw Object.assign(new Error(`Producto ${item.cod_producto} no encontrado`), { statusCode: 404 });

        const precioUnitario = round2(producto.precio_venta);

        let isvPorcentaje = 0;
        if (producto.cod_isv) {
          const [isvInfo] = await sequelize.query(
            'SELECT porcentaje FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1',
            { replacements: { codIsv: producto.cod_isv }, type: sequelize.QueryTypes.SELECT, transaction: t }
          );
          isvPorcentaje = isvInfo ? parseFloat(isvInfo.porcentaje) : 0;
        }

        const subtotalBruto = round2(precioUnitario * item.cantidad);
        let montoDescuento = 0;
        if (tipoDescLinea === 'PORCENTAJE') {
          montoDescuento = round2((descLinea / 100) * subtotalBruto);
        } else {
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

      // Descuento global
      let montoDescGlobal = 0;
      if (descGlobal > 0 && tipoDescGlobal) {
        if (tipoDescGlobal === 'PORCENTAJE') {
          montoDescGlobal = round2((descGlobal / 100) * subtotalGeneral);
        } else {
          montoDescGlobal = round2(Math.min(descGlobal, subtotalGeneral));
        }
        if (subtotalGeneral > 0) {
          const factor = round2((subtotalGeneral - montoDescGlobal) / subtotalGeneral);
          isvGeneral = round2(isvGeneral * factor);
        }
        subtotalGeneral = round2(subtotalGeneral - montoDescGlobal);
      }

      const descuentoTotal = round2(descuentoLineasTotal + montoDescGlobal);
      const totalGeneral = round2(subtotalGeneral + isvGeneral);

      // Vigencia
      const dias = parseInt(vigencia_dias) || 15;
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

      const cotizacion = await Cotizacion.create({
        cod_cliente,
        cod_usuario: codUsuario,
        subtotal: subtotalGeneral,
        descuento: descuentoTotal,
        descuento_global: descGlobal,
        tipo_descuento_global: tipoDescGlobal,
        monto_descuento_global: montoDescGlobal,
        isv: isvGeneral,
        total: totalGeneral,
        estado_cotizacion: 'VIGENTE',
        vigencia_dias: dias,
        fecha_vencimiento: fechaVencimiento,
        observaciones: observaciones || null,
        estado: true
      }, { transaction: t });

      const detallesConCot = detallesCalculados.map(d => ({
        ...d,
        cod_cotizacion: cotizacion.cod_cotizacion
      }));
      await DetalleCotizacion.bulkCreate(detallesConCot, { transaction: t });

      await t.commit();
      return this.obtenerPorId(cotizacion.cod_cotizacion);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // ANULAR COTIZACIÓN
  // =============================================
  async anular(id) {
    const cotizacion = await Cotizacion.findByPk(id);
    if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada'), { statusCode: 404 });
    if (cotizacion.estado_cotizacion === 'CONVERTIDA') throw Object.assign(new Error('No se puede anular una cotización ya convertida'), { statusCode: 400 });
    if (cotizacion.estado_cotizacion === 'ANULADA') throw Object.assign(new Error('La cotización ya fue anulada'), { statusCode: 400 });

    await cotizacion.update({ estado_cotizacion: 'ANULADA', estado: false });
    return { mensaje: 'Cotización anulada correctamente' };
  }

  // =============================================
  // CONVERTIR COTIZACIÓN → FACTURA
  // Copia detalle, recalcula precios actuales, descuenta inventario
  // =============================================
  async convertirAFactura(id, codUsuario) {
    const cotizacion = await Cotizacion.findByPk(id, {
      include: [{ model: DetalleCotizacion, as: 'detalles' }]
    });
    if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada'), { statusCode: 404 });
    if (cotizacion.estado_cotizacion !== 'VIGENTE') {
      throw Object.assign(new Error(`No se puede convertir una cotización con estado "${cotizacion.estado_cotizacion}"`), { statusCode: 400 });
    }

    // Verificar vencimiento
    if (cotizacion.fecha_vencimiento && new Date(cotizacion.fecha_vencimiento) < new Date()) {
      await cotizacion.update({ estado_cotizacion: 'VENCIDA' });
      throw Object.assign(new Error('La cotización ha vencido y no puede convertirse en factura'), { statusCode: 400 });
    }

    const t = await sequelize.transaction();
    try {
      let subtotalGeneral = 0, descuentoLineasTotal = 0, isvGeneral = 0;
      const detallesFactura = [];

      for (const det of cotizacion.detalles) {
        const producto = await ProductoSeq.findByPk(det.cod_producto, { transaction: t });
        if (!producto || producto.estado_producto !== 'Activo') {
          throw Object.assign(new Error(`Producto "${producto?.nombre_producto || det.cod_producto}" no disponible`), { statusCode: 400 });
        }

        // Verificar stock
        const [invResult] = await sequelize.query(
          'SELECT stock FROM inventario WHERE cod_producto = :codProd LIMIT 1',
          { replacements: { codProd: det.cod_producto }, type: sequelize.QueryTypes.SELECT, transaction: t }
        );
        const stockActual = invResult ? parseInt(invResult.stock) : 0;
        if (stockActual < det.cantidad) {
          throw Object.assign(new Error(`Stock insuficiente para "${producto.nombre_producto}". Disponible: ${stockActual}, solicitado: ${det.cantidad}`), { statusCode: 400 });
        }

        // Recalcular con precio actual del producto
        const precioUnitario = round2(producto.precio_venta);
        let isvPorcentaje = 0;
        if (producto.cod_isv) {
          const [isvInfo] = await sequelize.query(
            'SELECT porcentaje FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1',
            { replacements: { codIsv: producto.cod_isv }, type: sequelize.QueryTypes.SELECT, transaction: t }
          );
          isvPorcentaje = isvInfo ? parseFloat(isvInfo.porcentaje) : 0;
        }

        const subtotalBruto = round2(precioUnitario * det.cantidad);
        let montoDescuento = 0;
        if (det.tipo_descuento === 'PORCENTAJE') {
          montoDescuento = round2((parseFloat(det.descuento) / 100) * subtotalBruto);
        } else {
          montoDescuento = round2(Math.min(parseFloat(det.descuento), subtotalBruto));
        }

        const subtotalItem = round2(subtotalBruto - montoDescuento);
        const isvItem = round2((isvPorcentaje / 100) * subtotalItem);
        const totalItem = round2(subtotalItem + isvItem);

        descuentoLineasTotal = round2(descuentoLineasTotal + montoDescuento);
        subtotalGeneral = round2(subtotalGeneral + subtotalItem);
        isvGeneral = round2(isvGeneral + isvItem);

        detallesFactura.push({
          tipo_item: 'PRODUCTO',
          cod_producto: det.cod_producto,
          cantidad: det.cantidad,
          precio_unitario: precioUnitario,
          tipo_descuento: det.tipo_descuento,
          descuento: parseFloat(det.descuento),
          monto_descuento: montoDescuento,
          isv: isvItem,
          subtotal: subtotalItem,
          total: totalItem
        });
      }

      // Descuento global
      const descGlobal = parseFloat(cotizacion.descuento_global) || 0;
      const tipoDescGlobal = cotizacion.tipo_descuento_global;
      let montoDescGlobal = 0;
      if (descGlobal > 0 && tipoDescGlobal) {
        if (tipoDescGlobal === 'PORCENTAJE') {
          montoDescGlobal = round2((descGlobal / 100) * subtotalGeneral);
        } else {
          montoDescGlobal = round2(Math.min(descGlobal, subtotalGeneral));
        }
        if (subtotalGeneral > 0) {
          const factor = round2((subtotalGeneral - montoDescGlobal) / subtotalGeneral);
          isvGeneral = round2(isvGeneral * factor);
        }
        subtotalGeneral = round2(subtotalGeneral - montoDescGlobal);
      }

      const descuentoTotal = round2(descuentoLineasTotal + montoDescGlobal);
      const totalGeneral = round2(subtotalGeneral + isvGeneral);

      // Crear factura
      const factura = await Factura.create({
        cod_cliente: cotizacion.cod_cliente,
        cod_usuario: codUsuario,
        subtotal: subtotalGeneral,
        descuento: descuentoTotal,
        descuento_global: descGlobal,
        tipo_descuento_global: tipoDescGlobal,
        monto_descuento_global: montoDescGlobal,
        descuento_aplicado_por: descuentoTotal > 0 ? codUsuario : null,
        isv: isvGeneral,
        total: totalGeneral,
        estado_pago: 'PENDIENTE',
        total_pagado: 0,
        saldo: totalGeneral,
        estado: true
      }, { transaction: t });

      // Crear detalles de factura
      const detallesConFac = detallesFactura.map(d => ({ ...d, cod_factura: factura.cod_factura }));
      await DetalleFactura.bulkCreate(detallesConFac, { transaction: t });

      // Descontar inventario
      for (const det of cotizacion.detalles) {
        await sequelize.query(
          'UPDATE inventario SET stock = stock - :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
          { replacements: { cant: det.cantidad, codProd: det.cod_producto }, transaction: t }
        );
      }

      // Marcar cotización como convertida
      await cotizacion.update({
        estado_cotizacion: 'CONVERTIDA',
        cod_factura: factura.cod_factura
      }, { transaction: t });

      await t.commit();

      return {
        mensaje: 'Cotización convertida en factura exitosamente',
        cod_factura: factura.cod_factura,
        num_factura: `FAC-${String(factura.cod_factura).padStart(6, '0')}`
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // ELIMINAR COTIZACIÓN
  // =============================================
  async eliminar(id) {
    const cotizacion = await Cotizacion.findByPk(id);
    if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada'), { statusCode: 404 });
    if (cotizacion.estado_cotizacion === 'CONVERTIDA') throw Object.assign(new Error('No se puede eliminar una cotización convertida en factura'), { statusCode: 400 });

    await DetalleCotizacion.destroy({ where: { cod_cotizacion: id } });
    await cotizacion.destroy();
    return { mensaje: 'Cotización eliminada permanentemente' };
  }

  // =============================================
  // PRODUCTOS DISPONIBLES (reutiliza misma lógica)
  // =============================================
  async productosDisponibles({ buscar = '' }) {
    const where = { estado_producto: 'Activo' };
    if (buscar) {
      const b = buscar.trim();
      if (/^\d+$/.test(b)) {
        where[Op.or] = [
          { cod_producto: parseInt(b) },
          { nombre_producto: { [Op.iLike]: `%${b}%` } }
        ];
      } else {
        where.nombre_producto = { [Op.iLike]: `%${b}%` };
      }
    }

    const productos = await ProductoSeq.findAll({
      where,
      attributes: ['cod_producto', 'nombre_producto', 'unidad_medida', 'precio_venta', 'cod_isv'],
      order: [['nombre_producto', 'ASC']],
      limit: 20
    });

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
  // CLIENTES DISPONIBLES
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

export default new CotizacionService();
