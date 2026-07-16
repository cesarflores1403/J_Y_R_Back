import repository from '../repository.js';
import { obtenerExistenciaPorId } from './obtenerExistenciaPorId.js';

export const actualizarMinMax = async (codInventario, payload) => {
  const existenciaActual = await obtenerExistenciaPorId(codInventario);

  if (!existenciaActual) {
    throw Object.assign(new Error('Existencia de inventario no encontrada'), { status: 404 });
  }

  await repository.actualizarMinMax(codInventario, payload);
  const actualizado = await obtenerExistenciaPorId(codInventario);

  return {
    data: actualizado,
    before: {
      cod_inventario: existenciaActual.cod_inventario,
      stock_minimo: existenciaActual.stock_minimo,
      stock_maximo: existenciaActual.stock_maximo
    },
    after: {
      cod_inventario: actualizado?.cod_inventario ?? codInventario,
      stock_minimo: actualizado?.stock_minimo ?? payload.stock_minimo,
      stock_maximo: actualizado?.stock_maximo ?? payload.stock_maximo
    }
  };
};
