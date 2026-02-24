import { sendOk } from '../utils/response.js';
import inventarioMovimientosService from '../services/inventarioMovimientosService.js';

// // GET /api/inventario/movimientos
// // Kardex de movimientos con filtros por fecha/producto/ubicacion/tipo (HU3)
export const listarMovimientos = async (req, res, next) => {
  try {
    // // Delegamos filtros/paginacion y armado de kardex al service del modulo Inventario
    const data = await inventarioMovimientosService.listarMovimientos(req.query);

    // // Respuesta uniforme del proyecto con helper sendOk
    return sendOk(res, {
      status: 200,
      message: 'Movimientos de kardex obtenidos correctamente',
      data
    });
  } catch (error) {
    // // Error inesperado/controlado se maneja en middleware global
    next(error);
  }
};
