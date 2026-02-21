import { sendOk } from '../utils/response.js';
import inventarioExistenciasService from '../services/inventarioExistenciasService.js';

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
    const data = await inventarioExistenciasService.actualizarMinMax(
      Number(req.params.id),
      {
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo
      }
    );

    // // Respuesta estandar de exito
    return sendOk(res, {
      status: 200,
      message: 'Minimos y maximos actualizados correctamente',
      data
    });
  } catch (error) {
    // // Error inesperado pasa al middleware global
    next(error);
  }
};
