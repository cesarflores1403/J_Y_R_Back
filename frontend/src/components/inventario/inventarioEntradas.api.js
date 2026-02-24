import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/entradas (HU4)
export const inventarioEntradasApi = {
  // // POST para registrar una entrada transaccional
  registrar: (data) => api.post('/inventario/entradas', data),
};
