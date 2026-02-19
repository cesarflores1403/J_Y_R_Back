import { apiFetch } from './api.js'; // // Wrapper base

export const productoApi = {
  getAll: () => apiFetch('/api/producto', { method: 'GET' }), // // GET lista

  create: (payload) =>
    apiFetch('/api/producto', {
      method: 'POST',
      body: JSON.stringify(payload), // // Body JSON
    }),

  // =====================================================
  // PUT (pa_update) - 1 campo por vez
  // payload esperado: { cod_producto, datos: { campo: valor } }
  // =====================================================
  update: (payload) => {
    const datos = payload?.datos || {}; // // Datos a actualizar

    if (Object.keys(datos).length !== 1) {
      throw new Error('Solo se permite actualizar 1 campo por vez (pa_update)');
    }

    return apiFetch('/api/producto', {
      method: 'PUT',
      body: JSON.stringify(payload), // // { cod_producto, datos:{ campo: valor } }
    });
  },

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