import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/existencias
export const inventarioExistenciasApi = {
  // // GET de existencias con filtros y paginacion
  listar: (params) => api.get('/inventario/existencias', { params }),
  // // PUT de minimos y maximos por cod_inventario
  actualizarMinMax: (id, data) => api.put(`/inventario/existencias/${id}`, data),
};
