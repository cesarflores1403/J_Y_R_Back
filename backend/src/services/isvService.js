import * as isvModel from '../models/isvModel.js';

// =====================================================
// SERVICE: ISV (catálogo)
// =====================================================

// GET ISV activos
export const getIsv = async () => {
  return await isvModel.getIsv();
};

// GET todos los ISV (incluye inactivos)
export const getAllIsv = async () => {
  return await isvModel.getAllIsv();
};

// GET ISV por código (para validación)
export const getIsvByCod = async (cod_isv) => {
  return await isvModel.getIsvByCod(cod_isv);
};

// Validar que un ISV exista y esté activo
export const validarIsvExiste = async (cod_isv) => {
  const isv = await isvModel.getIsvByCod(cod_isv);
  if (!isv) {
    const error = new Error(`El ISV con código ${cod_isv} no existe`);
    error.status = 400;
    throw error;
  }
  if (!isv.estado) {
    const error = new Error(`El ISV con código ${cod_isv} está inactivo`);
    error.status = 400;
    throw error;
  }
  return isv;
};
