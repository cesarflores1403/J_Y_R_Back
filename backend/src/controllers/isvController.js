import * as isvService from '../services/isvService.js';
import { sendOk } from '../utils/response.js';

// =====================================================
// CONTROLLER: ISV (catálogo)
// =====================================================

// GET /api/isv — Obtener ISV activos
export const getIsv = async (req, res, next) => {
  try {
    const data = await isvService.getIsv();
    return sendOk(res, {
      status: 200,
      message: 'Catálogo ISV obtenido correctamente',
      data
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/isv/all — Obtener todos los ISV (incluye inactivos)
export const getAllIsv = async (req, res, next) => {
  try {
    const data = await isvService.getAllIsv();
    return sendOk(res, {
      status: 200,
      message: 'Catálogo ISV completo obtenido correctamente',
      data
    });
  } catch (err) {
    next(err);
  }
};
