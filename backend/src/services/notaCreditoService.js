import { sequelize } from '../config/sequelize.js';
import NotaCredito from '../models/NotaCredito.js';
import DetalleNotaCredito from '../models/DetalleNotaCredito.js';
import Factura from '../models/Factura.js';
import DetalleFactura from '../models/DetalleFactura.js';
import Cliente from '../models/Cliente.js';
import Usuario from '../models/Usuario.js';
import ProductoSeq from '../models/ProductoSeq.js';
import bitacoraFacturacionService from './bitacoraFacturacionService.js';
import { Op } from 'sequelize';

// =====================================================
// SERVICIO: Nota de Crédito / Devolución
// HU-FAC-12: Nota de crédito / devolución asociada a factura
// =====================================================
class NotaCreditoService {

  // =============================================
  // LISTAR NOTAS DE CRÉDITO (con paginación y búsqueda)
  // =============================================
  async listar({ pagina = 1, limite = 15, buscar = '', cod_factura = null }) {
    const where = {};
    if (cod_factura) where.cod_factura = parseInt(cod_factura);
    if (buscar) {
      where[Op.or] = [
        { motivo: { [Op.iLike]: `%${buscar}%` } },
        { '$factura.cliente.nombre$': { [Op.iLike]: `%${buscar}%` } },
        { '$factura.cliente.apellido$': { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    const { count, rows } = await NotaCredito.findAndCountAll({
      where,
      include: [
        {
          model: Factura, as: 'factura',
          attributes: ['cod_factura', 'total', 'estado'],
          include: [{ model: Cliente, as: 'cliente', attributes: ['cod_cliente', 'nombre', 'apellido', 'dni'] }]
        },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
      ],
      limit: limite,
      offset: (pagina - 1) * limite,
      order: [['cod_nota_credito', 'DESC']],
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
  // OBTENER NOTA DE CRÉDITO POR ID (con detalles)
  // =============================================
  async obtenerPorId(id) {
    const nota = await NotaCredito.findByPk(id, {
      include: [
        {
          model: Factura, as: 'factura',
          attributes: ['cod_factura', 'total', 'subtotal', 'isv', 'descuento', 'estado', 'creado_en'],
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
          ]
        },
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] },
        {
          model: DetalleNotaCredito, as: 'detalles',
          include: [
            { model: ProductoSeq, as: 'producto', attributes: ['cod_producto', 'nombre_producto', 'unidad_medida'] },
            {
              model: DetalleFactura, as: 'detalleFactura',
              attributes: ['cod_detalle_factura', 'cantidad', 'precio_unitario', 'descuento', 'isv', 'total']
            }
          ]
        }
      ]
    });
    if (!nota) throw Object.assign(new Error('Nota de crédito no encontrada'), { statusCode: 404 });
    return nota;
  }

  // =============================================
  // OBTENER DETALLES DE FACTURA PARA NC
  // (muestra ítems con cantidades ya devueltas)
  // =============================================
  async obtenerDetallesFactura(codFactura) {
    const factura = await Factura.findByPk(codFactura, {
      include: [
        { model: Cliente, as: 'cliente', attributes: ['cod_cliente', 'nombre', 'apellido', 'dni'] },
        {
          model: DetalleFactura, as: 'detalles',
          include: [{ model: ProductoSeq, as: 'producto', attributes: ['cod_producto', 'nombre_producto', 'unidad_medida'] }]
        }
      ]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    if (!factura.estado) throw Object.assign(new Error('No se puede crear nota de crédito para una factura anulada'), { statusCode: 400 });

    // Calcular cantidades ya devueltas por notas de crédito activas anteriores
    const notasPrevias = await NotaCredito.findAll({
      where: { cod_factura: codFactura, estado: true },
      include: [{ model: DetalleNotaCredito, as: 'detalles' }]
    });

    const cantidadesDevueltas = {};
    for (const nc of notasPrevias) {
      for (const d of nc.detalles) {
        const key = d.cod_detalle_factura;
        cantidadesDevueltas[key] = (cantidadesDevueltas[key] || 0) + d.cantidad_devuelta;
      }
    }

    // Construir respuesta con maxDevolucion por ítem
    const items = factura.detalles.map(det => {
      const yaDevuelto = cantidadesDevueltas[det.cod_detalle_factura] || 0;
      const disponible = det.cantidad - yaDevuelto;
      return {
        cod_detalle_factura: det.cod_detalle_factura,
        cod_producto: det.cod_producto,
        nombre_producto: det.producto?.nombre_producto || 'sin nombre',
        unidad_medida: det.producto?.unidad_medida || '',
        tipo_item: det.tipo_item,
        cantidad_original: det.cantidad,
        cantidad_devuelta: yaDevuelto,
        cantidad_disponible: disponible,
        precio_unitario: parseFloat(det.precio_unitario),
        tipo_descuento: det.tipo_descuento,
        descuento: parseFloat(det.descuento),
        monto_descuento: parseFloat(det.monto_descuento),
        isv_linea: parseFloat(det.isv),
        subtotal_linea: parseFloat(det.subtotal),
        total_linea: parseFloat(det.total)
      };
    });

    return {
      factura: {
        cod_factura: factura.cod_factura,
        cliente: factura.cliente,
        subtotal: parseFloat(factura.subtotal),
        descuento: parseFloat(factura.descuento),
        isv: parseFloat(factura.isv),
        total: parseFloat(factura.total),
        estado: factura.estado
      },
      items
    };
  }

  // =============================================
  // CREAR NOTA DE CRÉDITO (transacción)
  // - Valida factura activa
  // - Valida cantidades ≤ disponibles
  // - Recalcula totales + ISV proporcionalmente
  // - Restaura inventario (si devolver_inventario)
  // - Registra en bitácora
  // =============================================
  async crear(datos, codUsuario) {
    const { cod_factura, motivo, items, devolver_inventario = true } = datos;
    const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

    // --- Validaciones básicas ---
    if (!cod_factura) throw Object.assign(new Error('La factura origen es requerida'), { statusCode: 400 });
    if (!motivo || !motivo.trim()) throw Object.assign(new Error('El motivo es obligatorio'), { statusCode: 400 });
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Debe seleccionar al menos 1 ítem a devolver'), { statusCode: 400 });
    }

    // Verificar factura
    const factura = await Factura.findByPk(cod_factura, {
      include: [{ model: DetalleFactura, as: 'detalles' }]
    });
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    if (!factura.estado) throw Object.assign(new Error('No se puede crear nota de crédito para una factura anulada'), { statusCode: 400 });

    // Calcular cantidades ya devueltas
    const notasPrevias = await NotaCredito.findAll({
      where: { cod_factura, estado: true },
      include: [{ model: DetalleNotaCredito, as: 'detalles' }]
    });
    const cantidadesDevueltas = {};
    for (const nc of notasPrevias) {
      for (const d of nc.detalles) {
        cantidadesDevueltas[d.cod_detalle_factura] = (cantidadesDevueltas[d.cod_detalle_factura] || 0) + d.cantidad_devuelta;
      }
    }

    // Map de detalles factura por cod_detalle_factura
    const detallesMap = {};
    for (const det of factura.detalles) {
      detallesMap[det.cod_detalle_factura] = det;
    }

    // Iniciar transacción
    const t = await sequelize.transaction();
    try {
      let totalSubtotal = 0;
      let totalDescuento = 0;
      let totalIsv = 0;
      let totalGeneral = 0;
      const detallesCrear = [];
      const inventarioOps = [];

      for (const item of items) {
        const { cod_detalle_factura, cantidad_devuelta } = item;
        if (!cod_detalle_factura || !cantidad_devuelta || cantidad_devuelta < 1) {
          throw Object.assign(new Error('Cada ítem debe tener cod_detalle_factura y cantidad_devuelta >= 1'), { statusCode: 400 });
        }

        const detFactura = detallesMap[cod_detalle_factura];
        if (!detFactura) {
          throw Object.assign(new Error(`Detalle ${cod_detalle_factura} no pertenece a la factura ${cod_factura}`), { statusCode: 400 });
        }

        const yaDevuelto = cantidadesDevueltas[cod_detalle_factura] || 0;
        const disponible = detFactura.cantidad - yaDevuelto;
        if (cantidad_devuelta > disponible) {
          throw Object.assign(new Error(
            `Producto "${detFactura.cod_producto}": solo puede devolver ${disponible} unidades (ya devueltas: ${yaDevuelto})`
          ), { statusCode: 400 });
        }

        // Recalcular proporcionalmente
        const proporcion = cantidad_devuelta / detFactura.cantidad;
        const precioUnit = parseFloat(detFactura.precio_unitario);
        const lineaSubtotal = round2(precioUnit * cantidad_devuelta);
        const lineaDescuento = round2(parseFloat(detFactura.monto_descuento) * proporcion);
        const lineaIsv = round2(parseFloat(detFactura.isv) * proporcion);
        const lineaTotal = round2(lineaSubtotal - lineaDescuento + lineaIsv);

        detallesCrear.push({
          cod_detalle_factura,
          cod_producto: detFactura.cod_producto,
          cantidad_devuelta,
          precio_unitario: precioUnit,
          descuento: lineaDescuento,
          isv: lineaIsv,
          subtotal: lineaSubtotal,
          total: lineaTotal
        });

        totalSubtotal += lineaSubtotal;
        totalDescuento += lineaDescuento;
        totalIsv += lineaIsv;
        totalGeneral += lineaTotal;

        // Preparar operación de inventario
        if (devolver_inventario && detFactura.cod_producto) {
          inventarioOps.push({ cod_producto: detFactura.cod_producto, cantidad: cantidad_devuelta });
        }
      }

      // Crear nota de crédito
      const nota = await NotaCredito.create({
        cod_factura,
        cod_usuario: codUsuario,
        motivo: motivo.trim(),
        subtotal: round2(totalSubtotal),
        descuento: round2(totalDescuento),
        isv: round2(totalIsv),
        total: round2(totalGeneral),
        devolver_inventario,
        estado: true,
        fecha: new Date()
      }, { transaction: t });

      // Crear detalles
      for (const det of detallesCrear) {
        await DetalleNotaCredito.create({
          cod_nota_credito: nota.cod_nota_credito,
          ...det
        }, { transaction: t });
      }

      // Restaurar inventario
      if (devolver_inventario) {
        for (const op of inventarioOps) {
          await sequelize.query(
            'UPDATE inventario SET stock = stock + :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
            { replacements: { cant: op.cantidad, codProd: op.cod_producto }, transaction: t }
          );
        }
      }

      await t.commit();

      // Registrar en bitácora de auditoría (HU-FAC-10)
      try {
        await bitacoraFacturacionService.registrar({
          evento: 'NOTA_CREDITO_CREADA',
          entidad: 'NOTA_CREDITO',
          cod_factura: parseInt(cod_factura),
          cod_usuario: codUsuario,
          detalle: {
            cod_nota_credito: nota.cod_nota_credito,
            motivo: motivo.trim(),
            total: round2(totalGeneral),
            items_devueltos: detallesCrear.length,
            inventario_restaurado: devolver_inventario,
            detalles: detallesCrear.map(d => ({
              cod_producto: d.cod_producto,
              cantidad_devuelta: d.cantidad_devuelta,
              total: d.total
            }))
          }
        });
      } catch (logErr) {
        console.error('⚠️ Error al registrar bitácora (nota crédito):', logErr.message);
      }

      return {
        nota,
        mensaje: 'Nota de crédito creada correctamente'
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // ANULAR NOTA DE CRÉDITO
  // (revierte el inventario si fue devuelto)
  // =============================================
  async anular(id, codUsuario) {
    const nota = await NotaCredito.findByPk(id, {
      include: [{ model: DetalleNotaCredito, as: 'detalles' }]
    });
    if (!nota) throw Object.assign(new Error('Nota de crédito no encontrada'), { statusCode: 404 });
    if (!nota.estado) throw Object.assign(new Error('La nota de crédito ya está anulada'), { statusCode: 400 });

    const t = await sequelize.transaction();
    try {
      // Si se devolvió inventario, revertir (descontar stock)
      if (nota.devolver_inventario) {
        for (const det of nota.detalles) {
          if (det.cod_producto) {
            await sequelize.query(
              'UPDATE inventario SET stock = stock - :cant, fecha_ult_mov = NOW() WHERE cod_producto = :codProd',
              { replacements: { cant: det.cantidad_devuelta, codProd: det.cod_producto }, transaction: t }
            );
          }
        }
      }

      await nota.update({ estado: false }, { transaction: t });
      await t.commit();

      // Bitácora
      try {
        await bitacoraFacturacionService.registrar({
          evento: 'NOTA_CREDITO_ANULADA',
          entidad: 'NOTA_CREDITO',
          cod_factura: nota.cod_factura,
          cod_usuario: codUsuario,
          detalle: {
            cod_nota_credito: nota.cod_nota_credito,
            total: parseFloat(nota.total),
            inventario_revertido: nota.devolver_inventario
          }
        });
      } catch (logErr) {
        console.error('⚠️ Error al registrar bitácora (anular NC):', logErr.message);
      }

      return { mensaje: 'Nota de crédito anulada correctamente' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export default new NotaCreditoService();
