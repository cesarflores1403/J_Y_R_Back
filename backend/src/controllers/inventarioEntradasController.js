import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioEntradasService from '../services/inventarioEntradasService.js';

// // POST /api/inventario/entradas
// // Registra entradas de inventario (recepcion/compra) con trazabilidad en kardex (HU4)
export const registrarEntrada = async (req, res, next) => {
  try {
    // // Ejecutamos flujo transaccional del service usando el usuario autenticado para auditoria
    const data = await inventarioEntradasService.registrarEntrada(req.body, {
      usuario: req.usuario
    });

    // // Log estructurado minimo para trazabilidad operativa de entradas
    logger.info('inventario.entradas.registrada', {
      modulo: 'inventario',
      accion: 'registrar_entrada',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      referencia_documento: req.body?.referencia_documento ?? null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null,
      cod_inventario: data?.inventario?.cod_inventario ?? data?.resumen?.cod_inventario ?? null
    });

    // // 201 Created por tratarse de creacion de movimiento de kardex (y registro de entrada)
    return sendOk(res, {
      status: 201,
      message: 'Entrada de inventario registrada correctamente',
      data
    });
  } catch (error) {
    // // Error controlado/inesperado pasa al middleware global
    next(error);
  }
};

// // PATCH /api/inventario/entradas/:id/anular
// // Revierte una entrada con salida compensatoria y trazabilidad de auditoria
export const anularEntrada = async (req, res, next) => {
  try {
    const data = await inventarioEntradasService.anularEntrada(req.params.id, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.entradas.anulada', {
      modulo: 'inventario',
      accion: 'anular_entrada',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_movimiento_entrada: Number(req.params?.id || 0),
      motivo: req.body?.motivo ?? 'ANULACION_ENTRADA',
      referencia: req.body?.referencia ?? null,
      cod_inventario: data?.resumen?.cod_inventario ?? null,
      stock_antes: data?.resumen?.stock_antes ?? null,
      stock_despues: data?.resumen?.stock_despues ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Entrada anulada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};
