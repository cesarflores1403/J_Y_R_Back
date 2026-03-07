import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/bajas (HU Bajas por dano/perdida)
export const inventarioBajasApi = {
  // // POST para registrar una baja transaccional en inventario
  registrar: (data) => api.post('/inventario/bajas', data),
};
