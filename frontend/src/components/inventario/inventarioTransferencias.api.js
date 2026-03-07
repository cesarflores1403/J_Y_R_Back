import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/transferencias
export const inventarioTransferenciasApi = {
  // // POST para registrar transferencia transaccional entre ubicaciones
  registrar: (data) => api.post('/inventario/transferencias', data),
};
