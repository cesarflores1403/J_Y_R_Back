import ubicacionService from '../services/ubicacionService.js';
import { sendOk } from '../utils/response.js';

export const listar = async (req, res, next) => {
  try {
    const data = await ubicacionService.listar(req.query);
    return sendOk(res, {
      status: 200,
      message: 'Ubicaciones obtenidas correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const exportarReportePdf = async (req, res, next) => {
  try {
    const pdf = await ubicacionService.exportarReportePdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-ubicaciones.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const obtener = async (req, res, next) => {
  try {
    const data = await ubicacionService.obtenerPorId(req.params.id);
    return sendOk(res, {
      status: 200,
      message: 'Ubicacion obtenida correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const crear = async (req, res, next) => {
  try {
    const data = await ubicacionService.crear(req.body);
    return sendOk(res, {
      status: 201,
      message: 'Ubicacion creada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const actualizar = async (req, res, next) => {
  try {
    const data = await ubicacionService.actualizar(req.params.id, req.body);
    return sendOk(res, {
      status: 200,
      message: 'Ubicacion actualizada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const eliminar = async (req, res, next) => {
  try {
    const data = await ubicacionService.eliminar(req.params.id);
    return sendOk(res, {
      status: 200,
      message: 'Ubicacion eliminada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const desactivar = async (req, res, next) => {
  try {
    const data = await ubicacionService.desactivar(req.params.id);
    return sendOk(res, {
      status: 200,
      message: 'Ubicacion desactivada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const reactivar = async (req, res, next) => {
  try {
    const data = await ubicacionService.reactivar(req.params.id);
    return sendOk(res, {
      status: 200,
      message: 'Ubicacion reactivada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};
