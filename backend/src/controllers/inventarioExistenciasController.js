import { sendOk } from '../utils/response.js';
import inventarioExistenciasService from '../services/inventarioExistenciasService.js';
import logger from '../config/logger.js';

// // GET /api/inventario/existencias
// // Lista existencias con filtros por producto/ubicacion y paginacion
export const listarExistencias = async (req, res, next) => {
  try {
    // // Delegamos la logica de consulta al service
    const data = await inventarioExistenciasService.listarExistencias(req.query);

    // // Respuesta estandar con helper existente del proyecto
    return sendOk(res, {
      status: 200,
      message: 'Existencias obtenidas correctamente',
      data
    });
  } catch (error) {
    // // Error inesperado pasa al middleware global
    next(error);
  }
};

// // PUT /api/inventario/existencias/:id
// // Actualiza unicamente stock_minimo y stock_maximo
export const actualizarMinMax = async (req, res, next) => {
  try {
    // // Bloqueo explicito de campos de stock para evitar cambios fuera del alcance HU2
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'stock')) {
      const error = new Error('No se permite actualizar stock desde este endpoint');
      error.status = 400;
      throw error;
    }

    // // Bloqueo explicito de stock_reservado (se administra por otros procesos)
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'stock_reservado')) {
      const error = new Error('No se permite actualizar stock_reservado desde este endpoint');
      error.status = 400;
      throw error;
    }

    // // Campos permitidos para este endpoint (no se permite stock)
    const camposPermitidos = ['stock_minimo', 'stock_maximo'];
    // // Detectamos cualquier campo adicional enviado por cliente
    const camposExtras = Object.keys(req.body || {}).filter(
      (campo) => !camposPermitidos.includes(campo)
    );

    // // Si llegan campos no permitidos respondemos 400
    if (camposExtras.length > 0) {
      const error = new Error(`Campos no permitidos: ${camposExtras.join(', ')}`);
      error.status = 400;
      throw error;
    }

    // // Normalizamos a numero para comparar reglas de negocio
    const stockMinimo = Number(req.body.stock_minimo);
    // // Normalizamos a numero para comparar reglas de negocio
    const stockMaximo = Number(req.body.stock_maximo);

    // // Regla funcional: minimo no puede ser mayor que maximo
    if (stockMinimo > stockMaximo) {
      const error = new Error('stock_minimo no puede ser mayor que stock_maximo');
      error.status = 400;
      throw error;
    }

    // // Ejecutamos update restringido en service
    const resultado = await inventarioExistenciasService.actualizarMinMax(
      Number(req.params.id),
      {
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo
      },
      {
        // // Pasamos contexto minimo del usuario autenticado para auditoria de logs
        usuario: req.usuario
      }
    );

    // // Auditoria minima (no persistente): log estructurado before/after usando logger existente
    logger.info('inventario.existencias.minmax_actualizado', {
      // // Metadata de la accion para trazabilidad operacional
      modulo: 'inventario',
      accion: 'actualizar_min_max',
      cod_inventario: Number(req.params.id),
      // // Usuario autenticado si existe en el middleware actual
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      // // Snapshot before/after limitado al alcance HU2
      before: resultado.before,
      after: resultado.after
    });

    // // Respuesta estandar de exito
    return sendOk(res, {
      status: 200,
      message: 'Minimos y maximos actualizados correctamente',
      data: resultado.data
    });
  } catch (error) {
    // // Error inesperado pasa al middleware global
    next(error);
  }
};
