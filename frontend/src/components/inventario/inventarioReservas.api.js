import api from '../../services/axiosApi.js';

// // API del submodulo de reservas de inventario
export const inventarioReservasApi = {
  // // Lista reservas persistidas con filtros/paginacion
  listar: (params) => api.get('/inventario/reservas', { params }),
  // // Exporta reservas persistidas en PDF
  exportarPdf: (params) => api.get('/inventario/reservas/reporte/pdf', { params, responseType: 'blob' }),
  // // Crea reserva activa sobre inventario disponible
  crear: (data) => api.post('/inventario/reservas', data),
  // // Libera reserva activa
  liberar: (codReserva, data) => api.post(`/inventario/reservas/${codReserva}/liberar`, data),
  // // Consume reserva activa
  consumir: (codReserva, data) => api.post(`/inventario/reservas/${codReserva}/consumir`, data),
};
