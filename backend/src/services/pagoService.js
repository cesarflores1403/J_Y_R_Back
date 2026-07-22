import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import Factura from '../models/Factura.js';
import Pago from '../models/Pago.js';
import Usuario from '../models/Usuario.js';
import bitacoraFacturacionService from './bitacoraFacturacionService.js';

const crearError = (mensaje, statusCode = 400) => Object.assign(new Error(mensaje), { statusCode });

const round2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const toInteger = (valor, nombre) => {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw crearError(`${nombre} debe ser un entero mayor que cero.`);
  }
  return numero;
};

const toPositiveMoney = (valor, nombre) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw crearError(`${nombre} debe ser mayor que cero.`);
  }
  return round2(numero);
};

const validarLongitud = (valor, maximo, nombre) => {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }

  const texto = String(valor).trim();
  if (texto.length > maximo) {
    throw crearError(`${nombre} no puede superar ${maximo} caracteres.`);
  }

  return texto || null;
};

const obtenerEstadoPago = (saldo, totalPagado) => {
  if (saldo <= 0) {
    return 'PAGADA';
  }

  if (totalPagado > 0) {
    return 'PARCIAL';
  }

  return 'PENDIENTE';
};

const obtenerMetodoPago = async (metodoPago, transaction) => {
  const [metodo] = await sequelize.query(
    `SELECT cod_cat_metodo_pago, COALESCE(estado, true) AS estado
       FROM public.cat_metodo_pago
      WHERE cod_cat_metodo_pago = :metodoPago
      LIMIT 1`,
    {
      replacements: { metodoPago },
      transaction,
      type: QueryTypes.SELECT
    }
  );

  if (!metodo) {
    throw crearError('El método de pago no existe.', 404);
  }

  if (metodo.estado !== true) {
    throw crearError('El método de pago está inactivo.');
  }

  return metodo;
};

const obtenerTotalPagadoActivo = async (codFactura, transaction) => {
  const [resultado] = await sequelize.query(
    'SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM public.pago WHERE cod_factura = :codFactura AND estado = true',
    {
      replacements: { codFactura },
      transaction,
      type: QueryTypes.SELECT
    }
  );

  return round2(resultado?.total_pagado || 0);
};

const validarUsuarioAuditor = async (codUsuario, transaction) => {
  const usuario = await Usuario.findByPk(codUsuario, {
    transaction,
    attributes: ['cod_usuario', 'nombre_usuario', 'estado_usuario']
  });

  if (!usuario) {
    throw crearError('El usuario no existe.', 404);
  }

  if (!usuario.estado_usuario) {
    throw crearError('El usuario está inactivo.', 403);
  }

  return usuario;
};

class PagoService {
  async listarPorFactura(codFactura) {
    const codFacturaNumero = toInteger(codFactura, 'codFactura');

    const factura = await Factura.findByPk(codFacturaNumero);
    if (!factura) {
      throw crearError('Factura no encontrada.', 404);
    }

    const pagos = await Pago.findAll({
      where: { cod_factura: codFacturaNumero },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['cod_usuario', 'nombre_usuario'] }
      ],
      order: [['fecha_pago', 'DESC']]
    });

    return {
      factura: {
        cod_factura: factura.cod_factura,
        total: round2(factura.total),
        total_pagado: round2(factura.total_pagado || 0),
        saldo: round2(factura.saldo ?? Number(factura.total || 0) - Number(factura.total_pagado || 0)),
        estado_pago: factura.estado_pago || 'PENDIENTE',
        estado: factura.estado
      },
      pagos
    };
  }

  async registrarPago(datos, codUsuario) {
    const codFactura = toInteger(datos?.cod_factura, 'cod_factura');
    const monto = toPositiveMoney(datos?.monto, 'monto');
    const metodoPago = toInteger(datos?.metodo_pago, 'metodo_pago');
    const usuarioAuditor = toInteger(codUsuario, 'codUsuario');
    const refPago = validarLongitud(datos?.ref_pago, 200, 'ref_pago');
    const observacion = validarLongitud(datos?.observacion, 1000, 'observacion');

    const resultado = await sequelize.transaction(async (transaction) => {
      const usuario = await validarUsuarioAuditor(usuarioAuditor, transaction);
      await obtenerMetodoPago(metodoPago, transaction);

      const factura = await Factura.findByPk(codFactura, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!factura) {
        throw crearError('Factura no encontrada.', 404);
      }

      if (!factura.estado || factura.estado_pago === 'ANULADA') {
        throw crearError('No se puede registrar un pago sobre una factura anulada.');
      }

      const totalFactura = round2(factura.total);
      const totalPagadoActual = await obtenerTotalPagadoActivo(codFactura, transaction);
      const saldoActual = round2(totalFactura - totalPagadoActual);

      if (factura.estado_pago === 'PAGADA' || saldoActual <= 0) {
        throw crearError('La factura ya está completamente pagada.');
      }

      if (monto > saldoActual) {
        throw crearError('El monto supera el saldo pendiente.');
      }

      const estadoAnterior = {
        total_pagado: totalPagadoActual,
        saldo: saldoActual,
        estado_pago: factura.estado_pago || 'PENDIENTE'
      };

      const pago = await Pago.create({
        cod_factura: codFactura,
        monto,
        metodo_pago: metodoPago,
        ref_pago: refPago,
        observacion,
        estado: true,
        cod_usuario: usuario.cod_usuario
      }, { transaction });

      const totalPagadoNuevo = round2(totalPagadoActual + monto);
      const saldoNuevo = round2(totalFactura - totalPagadoNuevo);
      const estadoPagoNuevo = obtenerEstadoPago(saldoNuevo, totalPagadoNuevo);

      await factura.update({
        total_pagado: totalPagadoNuevo,
        saldo: Math.max(0, saldoNuevo),
        estado_pago: estadoPagoNuevo,
        actualizado_en: new Date()
      }, { transaction });

      return {
        pago,
        factura: {
          cod_factura: factura.cod_factura,
          total: totalFactura,
          total_pagado: totalPagadoNuevo,
          saldo: Math.max(0, saldoNuevo),
          estado_pago: estadoPagoNuevo,
          estado: factura.estado
        },
        auditoria: {
          usuario: usuario.cod_usuario,
          usuario_nombre: usuario.nombre_usuario,
          estadoAnterior,
          estadoNuevo: {
            total_pagado: totalPagadoNuevo,
            saldo: Math.max(0, saldoNuevo),
            estado_pago: estadoPagoNuevo
          }
        }
      };
    });

    try {
      await bitacoraFacturacionService.registrar({
        evento: 'PAGO_REGISTRADO',
        entidad: 'FACTURA',
        cod_factura: resultado.factura.cod_factura,
        cod_usuario: resultado.auditoria.usuario,
        nombre_usuario: resultado.auditoria.usuario_nombre,
        detalle: {
          cod_pago: resultado.pago.cod_pago,
          monto: round2(resultado.pago.monto),
          metodo_pago: resultado.pago.metodo_pago,
          ref_pago: resultado.pago.ref_pago || null,
          observacion: resultado.pago.observacion || null,
          usuario: resultado.auditoria.usuario,
          antes: resultado.auditoria.estadoAnterior,
          despues: resultado.auditoria.estadoNuevo
        }
      });
    } catch (error) {
      console.warn('No se pudo registrar la bitacora de pago:', error.message);
    }

    return {
      pago: resultado.pago.toJSON(),
      factura: resultado.factura
    };
  }

  async anularPago(codPago, codUsuario) {
    const codPagoNumero = toInteger(codPago, 'codPago');
    const usuarioAuditor = toInteger(codUsuario, 'codUsuario');

    const resultado = await sequelize.transaction(async (transaction) => {
      const usuario = await validarUsuarioAuditor(usuarioAuditor, transaction);

      const pago = await Pago.findByPk(codPagoNumero, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!pago) {
        throw crearError('Pago no encontrado.', 404);
      }

      if (!pago.estado) {
        throw crearError('El pago ya está anulado.');
      }

      const factura = await Factura.findByPk(pago.cod_factura, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!factura) {
        throw crearError('Factura no encontrada.', 404);
      }

      if (!factura.estado || factura.estado_pago === 'ANULADA') {
        throw crearError('No se puede anular un pago de una factura anulada.');
      }

      const estadoAnterior = {
        total_pagado: round2(factura.total_pagado || 0),
        saldo: round2(factura.saldo ?? Number(factura.total || 0) - Number(factura.total_pagado || 0)),
        estado_pago: factura.estado_pago || 'PENDIENTE'
      };

      await pago.update({ estado: false }, { transaction });

      const totalPagadoNuevo = await obtenerTotalPagadoActivo(factura.cod_factura, transaction);
      const totalFactura = round2(factura.total);
      const saldoNuevo = round2(totalFactura - totalPagadoNuevo);
      const estadoPagoNuevo = obtenerEstadoPago(saldoNuevo, totalPagadoNuevo);

      await factura.update({
        total_pagado: totalPagadoNuevo,
        saldo: Math.max(0, saldoNuevo),
        estado_pago: estadoPagoNuevo,
        actualizado_en: new Date()
      }, { transaction });

      return {
        pago,
        factura: {
          cod_factura: factura.cod_factura,
          total: totalFactura,
          total_pagado: totalPagadoNuevo,
          saldo: Math.max(0, saldoNuevo),
          estado_pago: estadoPagoNuevo,
          estado: factura.estado
        },
        auditoria: {
          usuario: usuario.cod_usuario,
          usuario_nombre: usuario.nombre_usuario,
          estadoAnterior,
          estadoNuevo: {
            total_pagado: totalPagadoNuevo,
            saldo: Math.max(0, saldoNuevo),
            estado_pago: estadoPagoNuevo
          }
        }
      };
    });

    try {
      await bitacoraFacturacionService.registrar({
        evento: 'PAGO_ANULADO',
        entidad: 'FACTURA',
        cod_factura: resultado.factura.cod_factura,
        cod_usuario: resultado.auditoria.usuario,
        nombre_usuario: resultado.auditoria.usuario_nombre,
        detalle: {
          cod_pago: resultado.pago.cod_pago,
          monto: round2(resultado.pago.monto),
          metodo_pago: resultado.pago.metodo_pago,
          usuario: resultado.auditoria.usuario,
          antes: resultado.auditoria.estadoAnterior,
          despues: resultado.auditoria.estadoNuevo
        }
      });
    } catch (error) {
      console.warn('No se pudo registrar la bitacora de anulación de pago:', error.message);
    }

    return {
      mensaje: 'Pago anulado correctamente',
      factura: resultado.factura
    };
  }
}

export default new PagoService();