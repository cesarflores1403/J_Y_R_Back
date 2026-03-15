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

const requestResiliente = async (method, endpoint, data = null, params = null) => {
  const bases = construirBases();
  const detallesRed = [];
  let ultimoErrorHttp = null;

  for (const base of bases) {
    const url = new URL(`${base}${endpoint}`);

    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([clave, valor]) => {
        if (valor === undefined || valor === null) return;
        if (typeof valor === 'string' && valor.trim() === '') return;
        url.searchParams.set(clave, String(valor));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: construirHeaders(),
        body: data !== null ? JSON.stringify(data) : undefined
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) return { data: payload };

      const errorHttp = crearErrorHttp(response.status, payload, url.toString());
      ultimoErrorHttp = errorHttp;

      if ([400, 401, 403, 409, 422].includes(response.status)) {
        throw errorHttp;
      }

      if (response.status >= 500 || response.status === 404) {
        continue;
      }

      throw errorHttp;
    } catch (error) {
      if (error?.response) {
        const status = Number(error.response.status || 0);
        if (status >= 500 || status === 404) continue;
        throw error;
      }

      detallesRed.push(`${url.toString()} -> ${error?.message || 'Error de red'}`);
    }
  }

  if (ultimoErrorHttp) throw ultimoErrorHttp;

  const errorRed = new Error(
    `No se pudo conectar con la API en ninguna ruta local. ${detallesRed.join(' | ')}`
  );
  errorRed.detalles = detallesRed;
  throw errorRed;
};

// // API resiliente del submodulo inventario/transferencias
export const inventarioTransferenciasApi = {
  listar: (params = {}) => requestResiliente('GET', '/inventario/transferencias', null, params),
  registrar: (data) => requestResiliente('POST', '/inventario/transferencias', data),
  anular: (id, data = {}) => requestResiliente('PATCH', `/inventario/transferencias/${id}/anular`, data)
};
