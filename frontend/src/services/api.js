// =====================================================
// API FETCH - Consumo estándar del backend
// Formato obligatorio del BE:
// { ok: true/false, message: string, data: any|null }
// =====================================================

const API_URL = import.meta.env.VITE_API_URL; // // Base URL del backend

export const apiFetch = async (endpoint, options = {}) => {
  if (!API_URL) {
    throw new Error('VITE_API_URL no está configurado');
  }

  // =====================================================
  // Construcción segura de URL (evita doble / o faltante /)
  // =====================================================
  const url = `${API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
console.log('FETCH URL =>', url);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json', // // JSON por defecto
      ...(options.headers || {}),
    },
    credentials: 'include', // // Preparado para cookies/JWT si se usan
  });

  let payload = null;

  try {
    payload = await response.json(); // // Intentar leer JSON
  } catch (error) {
    throw new Error(`Respuesta inválida del servidor (HTTP ${response.status})`);
  }

  // =====================================================
  // Validar contrato estándar BE
  // =====================================================
  const validContract =
    payload &&
    typeof payload.ok === 'boolean' &&
    typeof payload.message === 'string' &&
    'data' in payload;

  if (!validContract) {
    throw new Error('La API no cumple el formato estándar { ok, message, data }');
  }

  // =====================================================
  // Error lógico del backend
  // =====================================================
  if (!payload.ok) {
    throw new Error(payload.message || 'Error en la operación');
  }

  // =====================================================
  // Error HTTP real
  // =====================================================
  if (!response.ok) {
    throw new Error(payload.message || `Error HTTP ${response.status}`);
  }

  // =====================================================
  // Éxito: devolver solo data
  // =====================================================
  return payload.data;
};