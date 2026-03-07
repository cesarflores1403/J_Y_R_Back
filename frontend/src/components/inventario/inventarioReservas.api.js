import api from '../../services/axiosApi.js';

// // API del submodulo de reservas de inventario
export const inventarioReservasApi = {
  // // Crea reserva activa sobre inventario disponible
  crear: (data) => api.post('/inventario/reservas', data),
  // // Libera reserva activa
  liberar: (codReserva, data) => api.post(`/inventario/reservas/${codReserva}/liberar`, data),
  // // Consume reserva activa
  consumir: (codReserva, data) => api.post(`/inventario/reservas/${codReserva}/consumir`, data),
};
