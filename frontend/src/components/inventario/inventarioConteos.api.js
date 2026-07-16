import api from '../../services/axiosApi.js';

// // API del submodulo de conteo fisico dentro de Inventario
export const inventarioConteosApi = {
  // // GET listado de conteos persistidos
  listar: (params) => api.get('/inventario/conteos', { params }),
  exportarPdf: (params) => api.get('/inventario/conteos/reporte/pdf', { params, responseType: 'blob' }),
  // // GET detalle persistido de un conteo
  listarDetalles: (codConteo, params) => api.get(`/inventario/conteos/${codConteo}/detalles`, { params }),
  // // Etapa 1: abrir conteo
  abrir: (data) => api.post('/inventario/conteos', data),
  // // Etapa 2: registrar detalle fisico por producto+ubicacion
  registrarDetalle: (codConteo, data) => api.post(`/inventario/conteos/${codConteo}/detalle`, data),
  // // Etapa 3: cerrar conteo y aplicar ajustes
  cerrar: (codConteo, data) => api.post(`/inventario/conteos/${codConteo}/cerrar`, data),
};
