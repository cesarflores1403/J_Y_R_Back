import { apiFetch } from './api.js';

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
};
