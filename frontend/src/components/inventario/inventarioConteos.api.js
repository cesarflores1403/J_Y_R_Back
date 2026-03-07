import api from '../../services/axiosApi.js';

// // API del submodulo de conteo fisico dentro de Inventario
export const inventarioConteosApi = {
  // // Etapa 1: abrir conteo
  abrir: (data) => api.post('/inventario/conteos', data),
  // // Etapa 2: registrar detalle fisico por producto+ubicacion
  registrarDetalle: (codConteo, data) => api.post(`/inventario/conteos/${codConteo}/detalle`, data),
  // // Etapa 3: cerrar conteo y aplicar ajustes
  cerrar: (codConteo, data) => api.post(`/inventario/conteos/${codConteo}/cerrar`, data),
};
