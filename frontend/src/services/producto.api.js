import { apiFetch } from './api.js'; // // Wrapper base

const API_URL = import.meta.env.VITE_API_URL; // // Base URL del backend

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

  // =====================================================
  // HU-08: Subir / reemplazar imagen del producto
  // cod_producto: n\u00famero, file: File (imagen JPG/PNG)
  // =====================================================
  subirImagen: async (cod_producto, file) => {
    const formData = new FormData();
    formData.append('imagen', file);

    const url = `${API_URL.replace(/\/$/, '')}/api/producto/${cod_producto}/imagen`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Respuesta inv\u00e1lida del servidor (HTTP ${response.status})`);
    }

    if (!payload?.ok) {
      throw new Error(payload?.message || 'Error al subir imagen');
    }

    return payload.data;
  },

  // =====================================================
  // HU-08: Eliminar imagen del producto
  // =====================================================
  eliminarImagen: (cod_producto) =>
    apiFetch(`/api/producto/${cod_producto}/imagen`, {
      method: 'DELETE',
    }),

  // =====================================================
  // HU-12: Importar productos desde CSV/Excel
  // =====================================================
  importar: async (file) => {
    const formData = new FormData();
    formData.append('archivo', file);

    const url = `${API_URL.replace(/\/$/, '')}/api/producto/importar`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Respuesta inválida del servidor (HTTP ${response.status})`);
    }

    if (!payload?.ok) {
      // Retornar el payload completo para mostrar errores por fila
      const err = new Error(payload?.message || 'Error al importar productos');
      err.data = payload?.data || null;
      throw err;
    }

    return payload;
  },

  // HU-12: URL de descarga de plantilla
  getPlantillaUrl: () => `${API_URL.replace(/\/$/, '')}/api/producto/plantilla`,
};