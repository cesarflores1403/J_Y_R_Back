import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/transferencias
export const inventarioTransferenciasApi = {
  // // GET para listar transferencias persistidas
  listar: (params) => api.get('/inventario/transferencias', { params }),
  // // POST para registrar transferencia transaccional entre ubicaciones
  registrar: (data) => api.post('/inventario/transferencias', data),
};
