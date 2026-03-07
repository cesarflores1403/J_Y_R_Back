import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioConteosService from '../services/inventarioConteosService.js';

// // POST /api/inventario/conteos
// // Abre un conteo fisico nuevo en estado inicial ABIERTO
export const abrirConteo = async (req, res, next) => {
  try {
    const resultado = await inventarioConteosService.abrirConteo(req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.conteos.abierto', {
      modulo: 'inventario',
      accion: 'abrir_conteo',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_conteo: resultado?.resumen?.cod_conteo ?? null
    });

    return sendOk(res, {
      status: 201,
      message: 'Conteo fisico abierto correctamente',
      data: {
        cod_conteo: resultado?.resumen?.cod_conteo ?? null,
        estado: resultado?.resumen?.estado ?? 'ABIERTO',
        conteo: resultado?.conteo ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/conteos/:id/detalle
// // Captura o actualiza detalle fisico por producto+ubicacion dentro del conteo
export const registrarDetalleConteo = async (req, res, next) => {
  try {
    const codConteo = Number(req.params.id);
    const resultado = await inventarioConteosService.registrarDetalleConteo(codConteo, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.conteos.detalle_registrado', {
      modulo: 'inventario',
      accion: 'registrar_detalle_conteo',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_conteo: codConteo,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      stock_fisico: req.body?.stock_fisico ?? null,
      accion_detalle: resultado?.resumen?.accion ?? null
    });

    return sendOk(res, {
      status: 201,
      message: 'Detalle de conteo registrado correctamente',
      data: {
        cod_conteo: codConteo,
        accion: resultado?.resumen?.accion ?? null,
        detalle: resultado?.detalle ?? null,
        resumen: resultado?.resumen ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/conteos/:id/cerrar
// // Cierra conteo fisico, aplica ajustes y marca estado final en una transaccion
export const cerrarConteo = async (req, res, next) => {
  try {
    const codConteo = Number(req.params.id);
    const resultado = await inventarioConteosService.cerrarConteo(codConteo, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.conteos.cerrado', {
      modulo: 'inventario',
      accion: 'cerrar_conteo',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_conteo: codConteo,
      total_detalles: resultado?.resumen?.total_detalles ?? 0,
      ajustes_positivos: resultado?.resumen?.ajustes_positivos ?? 0,
      ajustes_negativos: resultado?.resumen?.ajustes_negativos ?? 0,
      movimientos_generados: resultado?.resumen?.total_movimientos_generados ?? 0
    });

    return sendOk(res, {
      status: 200,
      message: 'Conteo fisico cerrado correctamente',
      data: {
        cod_conteo: codConteo,
        conteo: resultado?.conteo ?? null,
        movimientos: resultado?.movimientos ?? [],
        resumen: resultado?.resumen ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};
