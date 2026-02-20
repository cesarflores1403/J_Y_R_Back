import { apiFetch } from './api.js';

export const isvApi = {
  // GET catálogo ISV activos
  getAll: () => apiFetch('/api/isv', { method: 'GET' }),
};
