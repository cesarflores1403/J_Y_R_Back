const construirHeaders = () => {
  const token = localStorage.getItem('jyr_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const construirBases = () => {
  const bases = [];

  if (typeof window !== 'undefined' && window.location?.origin) {
    bases.push(`${window.location.origin}/api`);
  }

  bases.push('http://localhost:5000/api');
  bases.push('http://127.0.0.1:5000/api');

  return Array.from(new Set(bases));
};

const crearErrorHttp = (status, payload = {}, url = '') => {
  const error = new Error(payload?.message || payload?.mensaje || `HTTP ${status}`);
  error.response = {
    status,
    data: payload
  };
  error.url = url;
  return error;
};

const requestResiliente = async (method, endpoint, data = {}) => {
  const bases = construirBases();
  const detallesRed = [];
  let ultimoErrorHttp = null;

  for (const base of bases) {
    const url = `${base}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: construirHeaders(),
        body: JSON.stringify(data)
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        return { data: payload };
      }

      const errorHttp = crearErrorHttp(response.status, payload, url);
      ultimoErrorHttp = errorHttp;

      // Si es error de negocio/autorizacion, lo devolvemos inmediato.
      if ([400, 401, 403, 409, 422].includes(response.status)) {
        throw errorHttp;
      }

      // Si puede ser error de endpoint/servidor local, intentamos siguiente base.
      if (response.status >= 500 || response.status === 404) {
        continue;
      }

      throw errorHttp;
    } catch (error) {
      if (error?.response) {
        // Error HTTP conocido; si no es de reintento, relanzamos.
        const status = Number(error.response.status || 0);
        if (status >= 500 || status === 404) {
          continue;
        }
        throw error;
      }

      detallesRed.push(`${url} -> ${error?.message || 'Error de red'}`);
    }
  }

  if (ultimoErrorHttp) {
    throw ultimoErrorHttp;
  }

  const errorRed = new Error(
    `No se pudo conectar con la API en ninguna ruta local. ${detallesRed.join(' | ')}`
  );
  errorRed.detalles = detallesRed;
  throw errorRed;
};

const requestBlobResiliente = async (method, endpoint, params = {}) => {
  const bases = construirBases();
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, value);
  });

  let ultimoErrorHttp = null;

  for (const base of bases) {
    const url = `${base}${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;

    try {
      const response = await fetch(url, {
        method,
        headers: construirHeaders()
      });

      if (response.ok) {
        return { data: await response.blob() };
      }

      const payload = await response.json().catch(() => ({}));
      const errorHttp = crearErrorHttp(response.status, payload, url);
      ultimoErrorHttp = errorHttp;

      if ([400, 401, 403, 409, 422].includes(response.status)) {
        throw errorHttp;
      }
    } catch (error) {
      if (error?.response) {
        const status = Number(error.response.status || 0);
        if (status >= 500 || status === 404) continue;
        throw error;
      }
    }
  }

  if (ultimoErrorHttp) {
    throw ultimoErrorHttp;
  }

  throw new Error('No se pudo conectar con la API para exportar el PDF');
};

// // API del submodulo de inventario/entradas (HU4)
export const inventarioEntradasApi = {
  exportarPdf: (params = {}) => requestBlobResiliente('GET', '/inventario/entradas/reporte/pdf', params),
  // // POST para registrar una entrada transaccional
  registrar: (data) => requestResiliente('POST', '/inventario/entradas', data),
  // // PATCH para anular una entrada por id de movimiento
  anular: (id, data = {}) => requestResiliente('PATCH', `/inventario/entradas/${id}/anular`, data)
};

