const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const normalizarBase = (url = '') => String(url || '').trim().replace(/\/$/, '');

const usarMismaUrlPublica = () => {
  if (typeof window === 'undefined') return false;
  const host = String(window.location?.hostname || '').toLowerCase();
  return Boolean(host) && !LOCAL_HOSTS.has(host);
};

export const resolveApiBase = () => {
  if (usarMismaUrlPublica()) return '';
  return normalizarBase(import.meta.env.VITE_API_URL || '');
};

export const resolveApiPath = () => {
  const apiBase = resolveApiBase();
  return apiBase ? `${apiBase}/api` : '/api';
};
