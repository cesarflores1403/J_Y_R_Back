import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioSalidasService from '../services/inventarioSalidasService.js';

// // POST /api/inventario/salidas
// // Registra salida de inventario (venta confirmada) y deja trazabilidad en kardex
export const registrarSalida = async (req, res, next) => {
  try {
    // // Ejecutamos flujo transaccional del servicio con contexto del usuario autenticado
    const resultado = await inventarioSalidasService.registrarSalida(req.body, {
      usuario: req.usuario
    });

    // // Armamos contrato operativo para consumidores externos (ej. Facturacion)
    const data = {
      movimiento_id: resultado?.movimiento?.cod_movimiento ?? null,
      producto: {
        cod_producto: resultado?.movimiento?.cod_producto ?? req.body?.cod_producto ?? null,
        nombre_producto: resultado?.movimiento?.nombre_producto ?? null
      },
      ubicacion: {
        cod_ubicacion: resultado?.movimiento?.cod_ubicacion ?? req.body?.cod_ubicacion ?? null,
        descripcion: resultado?.movimiento?.ubicacion ?? null
      },
      cantidad: resultado?.resumen?.cantidad_salida ?? req.body?.cantidad ?? null,
      stock_actual: resultado?.inventario?.stock ?? null,
      stock_disponible: resultado?.inventario?.stock_disponible ?? null,
      referencia: req.body?.referencia ?? null,
      observaciones: req.body?.observaciones ?? null,
      // // Se conserva detalle completo para auditoria o debugging controlado
      movimiento: resultado?.movimiento ?? null,
      inventario: resultado?.inventario ?? null,
      resumen: resultado?.resumen ?? null
    };

    // // Log de auditoria operacional de la salida registrada
    logger.info('inventario.salidas.registrada', {
      modulo: 'inventario',
      accion: 'registrar_salida',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null,
      referencia: req.body?.referencia ?? null,
      cod_inventario: resultado?.resumen?.cod_inventario ?? null,
      stock_antes: resultado?.resumen?.stock_antes ?? null,
      stock_despues: resultado?.resumen?.stock_despues ?? null
    });

    // // 201 Created porque se crea movimiento de kardex y se actualiza inventario
    return sendOk(res, {
      status: 201,
      message: 'Salida registrada correctamente',
      data
    });
  } catch (error) {
    // // Cualquier error controlado/inesperado lo gestiona el middleware global
    next(error);
  }
};

// // PATCH /api/inventario/salidas/:id/anular
// // Revierte una salida con entrada compensatoria y trazabilidad de auditoria
export const anularSalida = async (req, res, next) => {
  try {
    const resultado = await inventarioSalidasService.anularSalida(req.params.id, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.salidas.anulada', {
      modulo: 'inventario',
      accion: 'anular_salida',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_movimiento_salida: Number(req.params?.id || 0),
      motivo: req.body?.motivo ?? 'ANULACION_SALIDA',
      referencia: req.body?.referencia ?? null,
      cod_inventario: resultado?.resumen?.cod_inventario ?? null,
      stock_antes: resultado?.resumen?.stock_antes ?? null,
      stock_despues: resultado?.resumen?.stock_despues ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Salida anulada correctamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};
