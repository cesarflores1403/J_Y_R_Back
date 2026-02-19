import api from './axiosApi.js';

// ==================== AUTH ====================
export const authService = {
  login: (data) => api.post('/auth/login', data),
  perfil: () => api.get('/auth/perfil'),
  cambiarPassword: (data) => api.put('/auth/cambiar-password', data),
};

// ==================== CLIENTES ====================
export const clienteService = {
  listar: (params) => api.get('/clientes', { params }),
  obtener: (id) => api.get(`/clientes/${id}`),
  crear: (data) => api.post('/clientes', data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
};

// ==================== PROVEEDORES ====================
export const proveedorService = {
  listar: (params) => api.get('/proveedores', { params }),
  obtener: (id) => api.get(`/proveedores/${id}`),
  crear: (data) => api.post('/proveedores', data),
  actualizar: (id, data) => api.put(`/proveedores/${id}`, data),
  toggleEstado: (id) => api.patch(`/proveedores/${id}/toggle-estado`),
};

// ==================== REPORTES ====================
export const reporteService = {
  dashboard: () => api.get('/reportes/dashboard'),
  ventas: () => api.get('/reportes/ventas'),
  productosVendidos: () => api.get('/reportes/productos-vendidos'),
  inventario: () => api.get('/reportes/inventario'),
};
