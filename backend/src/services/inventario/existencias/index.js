import { actualizarMinMax } from './useCases/actualizarMinMax.js';
import { listarAlertasStockBajo } from './useCases/listarAlertasStockBajo.js';
import { listarExistencias } from './useCases/listarExistencias.js';
import { obtenerExistenciaPorId } from './useCases/obtenerExistenciaPorId.js';

class InventarioExistenciasService {
  async listarExistencias(query = {}) {
    return listarExistencias(query);
  }

  async listarAlertasStockBajo(query = {}) {
    return listarAlertasStockBajo(query);
  }

  async obtenerExistenciaPorId(codInventario) {
    return obtenerExistenciaPorId(codInventario);
  }

  async actualizarMinMax(codInventario, payload, _options = {}) {
    return actualizarMinMax(codInventario, payload);
  }
}

export default new InventarioExistenciasService();
