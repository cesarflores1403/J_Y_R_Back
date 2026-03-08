import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/existencias
export const inventarioExistenciasApi = {
  // // GET de existencias con filtros y paginacion
  listar: (params) => api.get('/inventario/existencias', { params }),
  // // GET de alertas de reposicion (stock disponible <= stock minimo)
  listarAlertasStockBajo: (params) => api.get('/inventario/alertas/stock-bajo', { params }),
  // // PUT de minimos y maximos por cod_inventario
  actualizarMinMax: (id, data) => api.put(`/inventario/existencias/${id}`, data),
};
