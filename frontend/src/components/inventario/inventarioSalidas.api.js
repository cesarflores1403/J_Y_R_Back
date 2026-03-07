import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/salidas (HU Registrar Salidas)
export const inventarioSalidasApi = {
  // // POST para registrar una salida transaccional por venta confirmada
  registrar: (data) => api.post('/inventario/salidas', data),
};
