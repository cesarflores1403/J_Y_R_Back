import { apiFetch } from './api.js';
import { resolveApiBase } from '../utils/runtimeApi.js';

const API_URL = resolveApiBase();

const construirUrlApi = (ruta) => {
  const limpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return API_URL ? `${API_URL}${limpia}` : limpia;
};

export const categoriaApi = {
  // GET listado paginado
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/categorias${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  // GET solo activas (para selects/dropdowns)
  getActivas: () => apiFetch('/api/categorias/activas', { method: 'GET' }),

  // GET por ID
  getById: (id) => apiFetch(`/api/categorias/${id}`, { method: 'GET' }),

  // POST crear
  create: (data) => apiFetch('/api/categorias', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // PUT actualizar
  update: (id, data) => apiFetch(`/api/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // PATCH toggle estado
  toggleEstado: (id) => apiFetch(`/api/categorias/${id}/toggle-estado`, { method: 'PATCH' }),

  // DELETE eliminar
  remove: (id) => apiFetch(`/api/categorias/${id}`, { method: 'DELETE' }),

  exportarPdf: async ({ buscar = '', soloActivas = '' } = {}) => {
    const params = new URLSearchParams();
    if (buscar) params.set('buscar', buscar);
    if (soloActivas) params.set('soloActivas', soloActivas);

    const query = params.toString();
    const url = construirUrlApi(`/api/categorias/reporte/pdf${query ? `?${query}` : ''}`);
    const token = localStorage.getItem('jyr_token');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error al exportar categorias en PDF (HTTP ${response.status})`);
    }

    return response.blob();
  },
};
