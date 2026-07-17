import { sequelize } from '../config/sequelize.js';
import Factura from '../models/Factura.js';
import Pago from '../models/Pago.js';
import Usuario from '../models/Usuario.js';
import bitacoraFacturacionService from './bitacoraFacturacionService.js';

// =====================================================
// SERVICIO: Pagos (HU-FAC-05)
// Registrar pagos parciales/totales a una factura
// =====================================================
class PagoService {

  // Función de redondeo preciso a 2 decimales
  round2(n) {
    return Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;
  }

  // =============================================
  // LISTAR PAGOS DE UNA FACTURA
  // =============================================
  async listarPorFactura(codFactura) {
    const factura = await Factura.findByPk(codFactura);
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });

    const pagos = await Pago.findAll({
      where: { cod_factura: codFactura },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
      ],
      order: [['fecha_pago', 'DESC']]
    });

    return {
      factura: {
        cod_factura: factura.cod_factura,
        total: parseFloat(factura.total),
        total_pagado: parseFloat(factura.total_pagado || 0),
        saldo: parseFloat(factura.saldo || factura.total),
        estado_pago: factura.estado_pago || 'PENDIENTE',
        estado: factura.estado
      },
      pagos
    };
  }

  // =============================================
  // REGISTRAR UN PAGO (parcial o total)
  // =============================================
  async registrarPago(datos, codUsuario) {
    const { cod_factura, monto, metodo_pago, ref_pago, observacion } = datos;

    // Validaciones básicas
    if (!cod_factura) throw Object.assign(new Error('cod_factura es requerido'), { statusCode: 400 });
    if (!monto || parseFloat(monto) <= 0) throw Object.assign(new Error('El monto debe ser mayor a 0'), { statusCode: 400 });
    if (!metodo_pago) throw Object.assign(new Error('El método de pago es requerido'), { statusCode: 400 });
    if (![1, 2, 3].includes(parseInt(metodo_pago))) {
      throw Object.assign(new Error('Método de pago inválido (1=Efectivo, 2=Tarjeta, 3=Transferencia)'), { statusCode: 400 });
    }

    const montoNum = this.round2(parseFloat(monto));

    // Verificar factura
    const factura = await Factura.findByPk(cod_factura);
    if (!factura) throw Object.assign(new Error('Factura no encontrada'), { statusCode: 404 });
    if (!factura.estado) throw Object.assign(new Error('No se puede pagar una factura anulada'), { statusCode: 400 });
    if (factura.estado_pago === 'PAGADA') throw Object.assign(new Error('La factura ya está completamente pagada'), { statusCode: 400 });

    // Validar que monto no exceda el saldo
    const saldoActual = this.round2(parseFloat(factura.saldo || factura.total) - parseFloat(factura.total_pagado || 0));
    const saldoReal = this.round2(parseFloat(factura.total) - parseFloat(factura.total_pagado || 0));
    
    if (montoNum > saldoReal) {
      throw Object.assign(
        new Error(`El monto (L ${montoNum}) excede el saldo pendiente (L ${saldoReal})`),
        { statusCode: 400 }
      );
    }

    const t = await sequelize.transaction();

    try {
      const facturaAntes = {
        total_pagado: this.round2(parseFloat(factura.total_pagado || 0)),
        saldo: this.round2(parseFloat(factura.saldo || factura.total)),
        estado_pago: factura.estado_pago || 'PENDIENTE'
      };

      // Crear el pago
      const pago = await Pago.create({
        cod_factura,
        monto: montoNum,
        metodo_pago: parseInt(metodo_pago),
        ref_pago: ref_pago || null,
        observacion: observacion || null,
        estado: true,
        cod_usuario: codUsuario
      }, { transaction: t });

      // Recalcular totales
      const nuevoTotalPagado = this.round2(parseFloat(factura.total_pagado || 0) + montoNum);
      const nuevoSaldo = this.round2(parseFloat(factura.total) - nuevoTotalPagado);

      // Determinar estado de pago
      let estadoPago = 'PENDIENTE';
      if (nuevoSaldo <= 0) {
        estadoPago = 'PAGADA';
      } else if (nuevoTotalPagado > 0) {
        estadoPago = 'PARCIAL';
      }

      // Actualizar factura
      await factura.update({
        total_pagado: nuevoTotalPagado,
        saldo: Math.max(0, nuevoSaldo),
        estado_pago: estadoPago,
        actualizado_en: new Date()
      }, { transaction: t });

      await t.commit();

      try {
        await bitacoraFacturacionService.registrar({
          evento: 'PAGO_REGISTRADO',
          entidad: 'FACTURA',
          cod_factura: parseInt(cod_factura),
          cod_usuario: codUsuario,
          detalle: {
            cod_pago: pago.cod_pago,
            monto: montoNum,
            metodo_pago: parseInt(metodo_pago),
            ref_pago: ref_pago || null,
            observacion: observacion || null,
            cambios: [
              { campo: 'total_pagado', antes: facturaAntes.total_pagado, despues: nuevoTotalPagado },
              { campo: 'saldo', antes: facturaAntes.saldo, despues: Math.max(0, nuevoSaldo) },
              { campo: 'estado_pago', antes: facturaAntes.estado_pago, despues: estadoPago }
            ]
          }
        });
      } catch (logErr) {
        console.error('Error al registrar bitacora (pago):', logErr.message);
      }

      // Retornar datos actualizados
      return {
        pago: pago.toJSON(),
        factura: {
          cod_factura: factura.cod_factura,
          total: parseFloat(factura.total),
          total_pagado: nuevoTotalPagado,
          saldo: Math.max(0, nuevoSaldo),
          estado_pago: estadoPago
        }
      };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // =============================================
  // ANULAR UN PAGO (restaurar saldo en factura)
  // =============================================
  async anularPago(codPago, codUsuario) {
    const pago = await Pago.findByPk(codPago, {
      include: [{ model: Factura, as: 'factura' }]
    });
    if (!pago) throw Object.assign(new Error('Pago no encontrado'), { statusCode: 404 });
    if (!pago.estado) throw Object.assign(new Error('El pago ya está anulado'), { statusCode: 400 });
    if (!pago.factura.estado) throw Object.assign(new Error('No se puede modificar pagos de una factura anulada'), { statusCode: 400 });

    const t = await sequelize.transaction();

    try {
      const facturaAntes = {
        total_pagado: this.round2(parseFloat(pago.factura.total_pagado || 0)),
        saldo: this.round2(parseFloat(pago.factura.saldo || pago.factura.total)),
        estado_pago: pago.factura.estado_pago || 'PENDIENTE'
      };

      // Anular el pago
      await pago.update({ estado: false }, { transaction: t });

      // Recalcular totales de la factura (sumar solo pagos activos)
      const [result] = await sequelize.query(
        'SELECT COALESCE(SUM(monto), 0) as total_pagado FROM pago WHERE cod_factura = :codFac AND estado = true',
        { replacements: { codFac: pago.cod_factura }, type: sequelize.QueryTypes.SELECT, transaction: t }
      );

      const nuevoTotalPagado = this.round2(parseFloat(result.total_pagado));
      const nuevoSaldo = this.round2(parseFloat(pago.factura.total) - nuevoTotalPagado);

      let estadoPago = 'PENDIENTE';
      if (nuevoSaldo <= 0) {
        estadoPago = 'PAGADA';
      } else if (nuevoTotalPagado > 0) {
        estadoPago = 'PARCIAL';
      }

      await pago.factura.update({
        total_pagado: nuevoTotalPagado,
        saldo: Math.max(0, nuevoSaldo),
        estado_pago: estadoPago,
        actualizado_en: new Date()
      }, { transaction: t });

      await t.commit();

      try {
        await bitacoraFacturacionService.registrar({
          evento: 'PAGO_ANULADO',
          entidad: 'FACTURA',
          cod_factura: parseInt(pago.cod_factura),
          cod_usuario: codUsuario,
          detalle: {
            cod_pago: pago.cod_pago,
            monto: parseFloat(pago.monto),
            cambios: [
              { campo: 'total_pagado', antes: facturaAntes.total_pagado, despues: nuevoTotalPagado },
              { campo: 'saldo', antes: facturaAntes.saldo, despues: Math.max(0, nuevoSaldo) },
              { campo: 'estado_pago', antes: facturaAntes.estado_pago, despues: estadoPago }
            ]
          }
        });
      } catch (logErr) {
        console.error('Error al registrar bitacora (anular pago):', logErr.message);
      }

      return {
        mensaje: 'Pago anulado correctamente',
        factura: {
          cod_factura: pago.cod_factura,
          total: parseFloat(pago.factura.total),
          total_pagado: nuevoTotalPagado,
          saldo: Math.max(0, nuevoSaldo),
          estado_pago: estadoPago
        }
      };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export default new PagoService();
