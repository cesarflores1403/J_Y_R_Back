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

// ==================== UBICACIONES ====================
export const ubicacionService = {
  listar: (params) => api.get('/ubicaciones', { params }),
  obtener: (id) => api.get(`/ubicaciones/${id}`),
  crear: (data) => api.post('/ubicaciones', data),
  actualizar: (id, data) => api.put(`/ubicaciones/${id}`, data),
  desactivar: (id) => api.patch(`/ubicaciones/${id}/desactivar`),
  eliminar: (id) => api.delete(`/ubicaciones/${id}`),
};

// ==================== REPORTES ====================
export const reporteService = {
  dashboard: () => api.get('/reportes/dashboard'),
  ventas: () => api.get('/reportes/ventas'),
  productosVendidos: () => api.get('/reportes/productos-vendidos'),
  inventario: () => api.get('/reportes/inventario'),
};

// ==================== FACTURAS ====================
export const facturaService = {
  listar: (params) => api.get('/facturas', { params }),
  obtener: (id) => api.get(`/facturas/${id}`),
  crear: (data) => api.post('/facturas', data),
  anular: (id) => api.patch(`/facturas/${id}/anular`),
  eliminar: (id) => api.delete(`/facturas/${id}`),
  productosDisponibles: (params) => api.get('/facturas/productos-disponibles', { params }),
  clientesDisponibles: (params) => api.get('/facturas/clientes-disponibles', { params }),
};

// ==================== PAGOS (HU-FAC-05) ====================
export const pagoService = {
  listarPorFactura: (codFactura) => api.get(`/pagos/factura/${codFactura}`),
  registrar: (data) => api.post('/pagos', data),
  anular: (codPago) => api.patch(`/pagos/${codPago}/anular`),
};

// ==================== CATEGORÍAS (HU-07) ====================
export const categoriaService = {
  listar: (params) => api.get('/categorias', { params }),
  listarActivas: () => api.get('/categorias/activas'),
  obtener: (id) => api.get(`/categorias/${id}`),
  crear: (data) => api.post('/categorias', data),
  actualizar: (id, data) => api.put(`/categorias/${id}`, data),
  toggleEstado: (id) => api.patch(`/categorias/${id}/toggle-estado`),
  eliminar: (id) => api.delete(`/categorias/${id}`),
};
