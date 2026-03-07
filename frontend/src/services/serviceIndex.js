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
  verificarDuplicado: (params) => api.get('/clientes/verificar-duplicado', { params }),
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
  anular: (id, motivo) => api.patch(`/facturas/${id}/anular`, { motivo }),
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

// ==================== COTIZACIONES (HU-FAC-08) ====================
export const cotizacionService = {
  listar: (params) => api.get('/cotizaciones', { params }),
  obtener: (id) => api.get(`/cotizaciones/${id}`),
  crear: (data) => api.post('/cotizaciones', data),
  anular: (id) => api.patch(`/cotizaciones/${id}/anular`),
  convertir: (id) => api.post(`/cotizaciones/${id}/convertir`),
  eliminar: (id) => api.delete(`/cotizaciones/${id}`),
  productosDisponibles: (params) => api.get('/cotizaciones/productos-disponibles', { params }),
  clientesDisponibles: (params) => api.get('/cotizaciones/clientes-disponibles', { params }),
};

// ==================== CARRUSEL ====================
export const carruselService = {
  listar: () => api.get('/carrusel'),
  listarTodas: () => api.get('/carrusel/todas'),
  subir: (formData) => api.post('/carrusel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  actualizar: (codImagen, data) => api.put(`/carrusel/${codImagen}`, data),
  eliminar: (codImagen) => api.delete(`/carrusel/${codImagen}`),
};

// ==================== AUDITORÍA FACTURACIÓN (HU-FAC-10) ====================
export const auditoriaFacturacionService = {
  listar: (params) => api.get('/auditoria-facturacion', { params }),
  tiposEvento: () => api.get('/auditoria-facturacion/tipos-evento'),
  exportarCSV: (params) => api.get('/auditoria-facturacion/exportar-csv', { params, responseType: 'blob' }),
};

// ==================== NOTAS DE CRÉDITO (HU-FAC-12) ====================
export const notaCreditoService = {
  listar: (params) => api.get('/notas-credito', { params }),
  obtener: (id) => api.get(`/notas-credito/${id}`),
  detallesFactura: (codFactura) => api.get(`/notas-credito/factura/${codFactura}/detalles`),
  crear: (data) => api.post('/notas-credito', data),
  anular: (id) => api.patch(`/notas-credito/${id}/anular`),
};

export const usuarioService = {
  listar:       (params) => api.get('/usuarios', { params }),
  listarRoles:  ()       => api.get('/usuarios/roles'),
  crear:        (data)   => api.post('/usuarios', data),
  actualizar:   (id, data) => api.put(/usuarios/${id}, data),
  toggleEstado: (id)     => api.patch(/usuarios/${id}/toggle-estado),
  eliminar:     (id)     => api.delete(/usuarios/${id}),
};
