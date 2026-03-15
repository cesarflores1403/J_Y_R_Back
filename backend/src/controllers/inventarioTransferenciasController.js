import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioTransferenciasService from '../services/inventarioTransferenciasService.js';

// // GET /api/inventario/transferencias
// // Lista transferencias persistidas con filtros para seguimiento operativo
export const listarTransferencias = async (req, res, next) => {
  try {
    const data = await inventarioTransferenciasService.listarTransferencias(req.query);

    return sendOk(res, {
      status: 200,
      message: 'Transferencias obtenidas correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/transferencias
// // Registra transferencia transaccional entre ubicaciones con doble movimiento en kardex
export const registrarTransferencia = async (req, res, next) => {
  try {
    // // Ejecutamos el flujo de transferencia usando el usuario autenticado para auditoria
    const resultado = await inventarioTransferenciasService.registrarTransferencia(req.body, {
      usuario: req.usuario
    });

    // // Contrato de respuesta operativo para frontend y consumidores de Inventario
    const data = {
      referencia: resultado?.resumen?.referencia_transferencia ?? req.body?.referencia ?? null,
      producto: {
        cod_producto: resultado?.resumen?.cod_producto ?? req.body?.cod_producto ?? null,
        nombre_producto: resultado?.movimientos?.salida?.nombre_producto
          ?? resultado?.movimientos?.entrada?.nombre_producto
          ?? null
      },
      origen: {
        cod_ubicacion: resultado?.resumen?.cod_ubicacion_origen ?? req.body?.cod_ubicacion_origen ?? null,
        cod_inventario: resultado?.resumen?.cod_inventario_origen ?? null,
        stock_actual: resultado?.inventario_origen?.stock ?? null,
        stock_disponible: resultado?.inventario_origen?.stock_disponible ?? null
      },
      destino: {
        cod_ubicacion: resultado?.resumen?.cod_ubicacion_destino ?? req.body?.cod_ubicacion_destino ?? null,
        cod_inventario: resultado?.resumen?.cod_inventario_destino ?? null,
        stock_actual: resultado?.inventario_destino?.stock ?? null,
        stock_disponible: resultado?.inventario_destino?.stock_disponible ?? null
      },
      cantidad: resultado?.resumen?.cantidad_transferida ?? req.body?.cantidad ?? null,
      inventario_destino_creado: resultado?.resumen?.inventario_destino_creado ?? false,
      transferencia: resultado?.transferencia ?? null,
      movimientos: {
        salida_id: resultado?.movimientos?.salida?.cod_movimiento ?? null,
        entrada_id: resultado?.movimientos?.entrada?.cod_movimiento ?? null,
        salida: resultado?.movimientos?.salida ?? null,
        entrada: resultado?.movimientos?.entrada ?? null
      },
      resumen: resultado?.resumen ?? null
    };

    // // Log operativo de auditoria para trazabilidad de transferencias
    logger.info('inventario.transferencias.registrada', {
      modulo: 'inventario',
      accion: 'registrar_transferencia',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion_origen: req.body?.cod_ubicacion_origen ?? null,
      cod_ubicacion_destino: req.body?.cod_ubicacion_destino ?? null,
      cantidad: req.body?.cantidad ?? null,
      referencia: req.body?.referencia ?? null,
      cod_inventario_origen: resultado?.resumen?.cod_inventario_origen ?? null,
      cod_inventario_destino: resultado?.resumen?.cod_inventario_destino ?? null,
      stock_origen_antes: resultado?.resumen?.stock_origen_antes ?? null,
      stock_origen_despues: resultado?.resumen?.stock_origen_despues ?? null,
      stock_destino_antes: resultado?.resumen?.stock_destino_antes ?? null,
      stock_destino_despues: resultado?.resumen?.stock_destino_despues ?? null
    });

    // // 201 Created porque se generan dos movimientos y se actualizan dos existencias
    return sendOk(res, {
      status: 201,
      message: 'Transferencia registrada correctamente',
      data
    });
  } catch (error) {
    // // Error controlado/inesperado centralizado en middleware global
    next(error);
  }
};

// // PATCH /api/inventario/transferencias/:id/anular
// // Revierte transferencia completada entre ubicaciones con doble movimiento compensatorio
export const anularTransferencia = async (req, res, next) => {
  try {
    const resultado = await inventarioTransferenciasService.anularTransferencia(req.params.id, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.transferencias.anulada', {
      modulo: 'inventario',
      accion: 'anular_transferencia',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_transferencia: Number(req.params?.id || 0),
      motivo: req.body?.motivo ?? 'ANULACION_TRANSFERENCIA',
      referencia: req.body?.referencia ?? null,
      cod_inventario_origen: resultado?.resumen?.cod_inventario_origen ?? null,
      cod_inventario_destino: resultado?.resumen?.cod_inventario_destino ?? null,
      stock_origen_antes: resultado?.resumen?.stock_origen_antes ?? null,
      stock_origen_despues: resultado?.resumen?.stock_origen_despues ?? null,
      stock_destino_antes: resultado?.resumen?.stock_destino_antes ?? null,
      stock_destino_despues: resultado?.resumen?.stock_destino_despues ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Transferencia anulada correctamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};
