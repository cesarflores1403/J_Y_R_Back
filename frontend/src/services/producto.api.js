import { apiFetch } from './api.js'; // // Wrapper base
import { resolveApiBase } from '../utils/runtimeApi.js';

const API_URL = resolveApiBase();

const construirUrlApi = (ruta) => {
  const limpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return API_URL ? `${API_URL}${limpia}` : limpia;
};

export const productoApi = {
  getAll: ({ buscar = '' } = {}) => {
    const params = new URLSearchParams();
    if (buscar) params.set('buscar', buscar);
    const query = params.toString();
    return apiFetch(`/api/producto${query ? `?${query}` : ''}`, { method: 'GET' });
  }, // // GET lista

  exportarPdf: async ({ buscar = '', estado = '' } = {}) => {
    const params = new URLSearchParams();
    if (buscar) params.set('buscar', buscar);
    if (estado) params.set('estado', estado);

    const query = params.toString();
    const url = construirUrlApi(`/api/producto/reporte/pdf${query ? `?${query}` : ''}`);
    const token = localStorage.getItem('jyr_token');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error al exportar productos en PDF (HTTP ${response.status})`);
    }

    return response.blob();
  },

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
    const stockAgregar = Number(payload?.stock_agregar || 0);
    const stockNuevoDefinido = payload?.stock_nuevo !== undefined && payload?.stock_nuevo !== null && payload?.stock_nuevo !== '';
    const stockNuevo = stockNuevoDefinido ? Number(payload?.stock_nuevo) : null;

    const stockAgregarValido = Number.isInteger(stockAgregar) && stockAgregar > 0;
    const stockNuevoValido = stockNuevoDefinido && Number.isInteger(stockNuevo) && stockNuevo >= 0;

    if (Object.keys(datos).length === 0 && !stockAgregarValido && !stockNuevoValido) {
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
  // PATCH - Cambiar estado masivo
  // payload esperado: { cod_productos: number[], estado }
  // =====================================================
  cambiarEstadoMasivo: (payload) =>
    apiFetch('/api/producto/estado-masivo', {
      method: 'PATCH',
      body: JSON.stringify(payload),
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

    const url = construirUrlApi(`/api/producto/${cod_producto}/imagen`);
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

    const url = construirUrlApi('/api/producto/importar');
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
  getPlantillaUrl: () => construirUrlApi('/api/producto/plantilla'),
};
