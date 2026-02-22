import { apiFetch } from './api.js'; // // Wrapper base

export const productoApi = {
  getAll: () => apiFetch('/api/producto', { method: 'GET' }), // // GET lista

  create: (payload) =>
    apiFetch('/api/producto', {
      method: 'POST',
      body: JSON.stringify(payload), // // Body JSON
    }),

  // =====================================================
  // PUT - HU-05: Editar producto (m\u00faltiples campos)
  // payload esperado: { cod_producto, datos: { campo1: valor1, campo2: valor2, ... } }
  // El backend itera internamente con pa_update por cada campo
  // =====================================================
  update: (payload) => {
    const datos = payload?.datos || {};

    if (Object.keys(datos).length === 0) {
      throw new Error('No hay campos para actualizar.');
    }

    return apiFetch('/api/producto', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // =====================================================
  // PATCH - Cambiar estado (Activo/Inactivo/Descontinuado)
  // payload esperado: { cod_producto, estado }
  // =====================================================
  cambiarEstado: (payload) =>
    apiFetch('/api/producto/estado', {
      method: 'PATCH',
      body: JSON.stringify(payload), // // { cod_producto, estado }
    }),

  // =====================================================
  // DELETE compatible con BE actual (body)
  // payload esperado: { cod_producto }
  // =====================================================
  remove: (payload) =>
    apiFetch('/api/producto', {
      method: 'DELETE',
      body: JSON.stringify(payload), // // { cod_producto }
    }),
};