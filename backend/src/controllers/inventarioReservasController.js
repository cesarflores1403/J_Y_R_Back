import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioReservasService from '../services/inventarioReservasService.js';

// // GET /api/inventario/reservas
// // Lista reservas de inventario con filtros de estado/producto/ubicacion
export const listarReservas = async (req, res, next) => {
  try {
    const data = await inventarioReservasService.listarReservas(req.query);

    return sendOk(res, {
      status: 200,
      message: 'Reservas obtenidas correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

// // GET /api/inventario/reservas/reporte/pdf
// // Exporta reservas de inventario en PDF profesional
export const exportarReservasPdf = async (req, res, next) => {
  try {
    const pdf = await inventarioReservasService.exportarReportePdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-reservas.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/reservas
// // Crea una reserva activa incrementando stock_reservado sin afectar stock total
export const crearReserva = async (req, res, next) => {
  try {
    const resultado = await inventarioReservasService.crearReserva(req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.reservas.creada', {
      modulo: 'inventario',
      accion: 'crear_reserva',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_reserva: resultado?.resumen?.cod_reserva ?? null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null
    });

    return sendOk(res, {
      status: 201,
      message: 'Reserva de inventario creada correctamente',
      data: {
        reserva: resultado?.reserva ?? null,
        inventario: resultado?.inventario ?? null,
        resumen: resultado?.resumen ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/reservas/:id/liberar
// // Libera una reserva activa descontando solo stock_reservado
export const liberarReserva = async (req, res, next) => {
  try {
    const codReserva = Number(req.params.id);
    const resultado = await inventarioReservasService.liberarReserva(codReserva, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.reservas.liberada', {
      modulo: 'inventario',
      accion: 'liberar_reserva',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_reserva: codReserva,
      cantidad_liberada: resultado?.resumen?.cantidad_liberada ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Reserva liberada correctamente',
      data: {
        reserva: resultado?.reserva ?? null,
        inventario: resultado?.inventario ?? null,
        resumen: resultado?.resumen ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/reservas/:id/consumir
// // Consume una reserva activa descontando stock y stock_reservado con trazabilidad en kardex
export const consumirReserva = async (req, res, next) => {
  try {
    const codReserva = Number(req.params.id);
    const resultado = await inventarioReservasService.consumirReserva(codReserva, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.reservas.consumida', {
      modulo: 'inventario',
      accion: 'consumir_reserva',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_reserva: codReserva,
      cantidad_consumida: resultado?.resumen?.cantidad_consumida ?? null,
      cod_movimiento: resultado?.resumen?.cod_movimiento ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Reserva consumida correctamente',
      data: {
        reserva: resultado?.reserva ?? null,
        inventario: resultado?.inventario ?? null,
        movimiento: resultado?.movimiento ?? null,
        resumen: resultado?.resumen ?? null
      }
    });
  } catch (error) {
    next(error);
  }
};
