import api from '../../services/axiosApi.js';

// // API del submodulo de inventario/movimientos (HU3 Kardex)
export const inventarioMovimientosApi = {
  // // GET de kardex con filtros y paginacion
  listar: (params) => api.get('/inventario/movimientos', { params }),
  // // GET de catalogo de productos para filtros enlazados en kardex
  listarProductos: () => api.get('/producto'),
};
