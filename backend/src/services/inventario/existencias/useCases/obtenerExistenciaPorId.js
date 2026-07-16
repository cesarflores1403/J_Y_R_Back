import repository from '../repository.js';
import { mapearFilaExistencia } from '../helpers.js';

export const obtenerExistenciaPorId = async (codInventario) => {
  const fila = await repository.obtenerExistenciaPorId(codInventario);
  return mapearFilaExistencia(fila);
};
