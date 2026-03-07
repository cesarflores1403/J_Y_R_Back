import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioBajasService from '../services/inventarioBajasService.js';

// // POST /api/inventario/bajas
// // Registra baja por dano/perdida, actualiza inventario y deja trazabilidad en kardex
export const registrarBaja = async (req, res, next) => {
  try {
    // // Ejecutamos flujo transaccional de bajas con usuario autenticado para auditoria
    const resultado = await inventarioBajasService.registrarBaja(req.body, {
      usuario: req.usuario
    });

    // // Contrato operativo para frontend interno y consumidores externos de inventario
    const data = {
      baja_id: resultado?.resumen?.cod_baja_inventario ?? null,
      movimiento_id: resultado?.movimiento?.cod_movimiento ?? null,
      producto: {
        cod_producto: resultado?.movimiento?.cod_producto ?? req.body?.cod_producto ?? null,
        nombre_producto: resultado?.movimiento?.nombre_producto ?? null
      },
      ubicacion: {
        cod_ubicacion: resultado?.movimiento?.cod_ubicacion ?? req.body?.cod_ubicacion ?? null,
        descripcion: resultado?.movimiento?.ubicacion ?? null
      },
      cantidad: resultado?.resumen?.cantidad_baja ?? req.body?.cantidad ?? null,
      motivo: req.body?.motivo ?? null,
      descripcion: req.body?.descripcion ?? null,
      referencia: req.body?.referencia ?? null,
      stock_actual: resultado?.inventario?.stock ?? null,
      stock_disponible: resultado?.inventario?.stock_disponible ?? null,
      tipo_movimiento_solicitado: resultado?.resumen?.tipo_movimiento_solicitado ?? 'BAJA',
      tipo_movimiento_aplicado: resultado?.resumen?.tipo_movimiento_aplicado ?? null,
      fallback_tipo_movimiento: resultado?.resumen?.fallback_tipo_movimiento ?? false,
      tabla_baja_inventario_existe: resultado?.resumen?.tabla_baja_inventario_existe ?? false,
      movimiento: resultado?.movimiento ?? null,
      inventario: resultado?.inventario ?? null,
      resumen: resultado?.resumen ?? null
    };

    // // Auditoria de la baja registrada con snapshot de stock y tipo de movimiento aplicado
    logger.info('inventario.bajas.registrada', {
      modulo: 'inventario',
      accion: 'registrar_baja',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null,
      motivo: req.body?.motivo ?? null,
      referencia: req.body?.referencia ?? null,
      cod_baja_inventario: resultado?.resumen?.cod_baja_inventario ?? null,
      tipo_movimiento_aplicado: resultado?.resumen?.tipo_movimiento_aplicado ?? null,
      fallback_tipo_movimiento: resultado?.resumen?.fallback_tipo_movimiento ?? false,
      stock_antes: resultado?.resumen?.stock_antes ?? null,
      stock_despues: resultado?.resumen?.stock_despues ?? null
    });

    // // 201 Created por creacion de baja/movimiento y actualizacion consistente de inventario
    return sendOk(res, {
      status: 201,
      message: 'Baja de inventario registrada correctamente',
      data
    });
  } catch (error) {
    // // Manejo centralizado de errores controlados e inesperados
    next(error);
  }
};
