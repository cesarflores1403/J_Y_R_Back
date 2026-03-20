import axios from 'axios';
import { resolveApiPath } from '../utils/runtimeApi.js';

const API_URL = resolveApiPath();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// // Detecta mensajes de backend que realmente implican sesion invalida/expirada
const esErrorDeSesion = (mensaje = '') => {
  const texto = String(mensaje || '').toLowerCase();
  return [
    'token expirado',
    'token invalido',
    'token inválido',
    'token de autenticacion no proporcionado',
    'token de autenticación no proporcionado',
    'no autenticado',
    'sesion expirada',
    'sesión expirada'
  ].some((patron) => texto.includes(patron));
};

// Interceptor: agregar token a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jyr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const endpoint = String(error?.config?.url || '');
      const mensajeBackend = error?.response?.data?.mensaje || error?.response?.data?.message || '';
      const tokenActual = localStorage.getItem('jyr_token');
      const esLogin = endpoint.includes('/auth/login');
      const cerrarSesionForzado = !esLogin && (!tokenActual || esErrorDeSesion(mensajeBackend));

      // // Trazabilidad para depurar el endpoint que origina el 401 sin cerrar abruptamente
      console.warn('[API 401]', {
        endpoint,
        mensajeBackend,
        cerrarSesionForzado
      });

      if (cerrarSesionForzado) {
        localStorage.removeItem('jyr_token');
        localStorage.removeItem('jyr_usuario');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
