import { listarMovimientos } from './useCases/listarMovimientos.js';

class InventarioMovimientosService {
  async listarMovimientos(query = {}) {
    return listarMovimientos(query);
  }
}

export default new InventarioMovimientosService();
