import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/serviceIndex.js';

const AuthContext = createContext();
const SESSION_ACTIVITY_KEY = 'jyr_last_activity';
const DEFAULT_IDLE_TIMEOUT_SECONDS = 15 * 60;
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'mousedown', 'scroll', 'touchstart'];

const getIdleTimeoutMs = () => {
  const configuredSeconds = Number.parseInt(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_SECONDS, 10);
  const timeoutSeconds = Number.isInteger(configuredSeconds) && configuredSeconds > 0
    ? configuredSeconds
    : DEFAULT_IDLE_TIMEOUT_SECONDS;

  return timeoutSeconds * 1000;
};

const getLastActivity = () => {
  const value = Number.parseInt(localStorage.getItem(SESSION_ACTIVITY_KEY), 10);
  return Number.isInteger(value) && value > 0 ? value : Date.now();
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    const decodedPayload = window.atob(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

const getTokenExpirationMs = (token) => {
  const payload = decodeJwtPayload(token || '');
  return Number.isInteger(payload?.exp) ? payload.exp * 1000 : null;
};

const isTokenExpired = (token) => {
  const expirationMs = getTokenExpirationMs(token);
  return expirationMs !== null && Date.now() >= expirationMs;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [autenticado, setAutenticado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const idleTimeoutMs = getIdleTimeoutMs();

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem('jyr_token');
    localStorage.removeItem('jyr_usuario');
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    setUsuario(null);
    setAutenticado(false);
  }, []);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem('jyr_token');
      const usuarioGuardado = localStorage.getItem('jyr_usuario');

      if (token && usuarioGuardado) {
        try {
          if (isTokenExpired(token)) {
            cerrarSesion();
            setCargando(false);
            return;
          }

          if (Date.now() - getLastActivity() >= idleTimeoutMs) {
            cerrarSesion();
            setCargando(false);
            return;
          }

          localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
          setUsuario(JSON.parse(usuarioGuardado));
          setAutenticado(true);
        } catch {
          cerrarSesion();
        }
      }
      setCargando(false);
    };
    verificarSesion();
  }, [cerrarSesion, idleTimeoutMs]);

  const iniciarSesion = async (nombre_usuario, password) => {
    const { data } = await authService.login({ nombre_usuario, password });
    if (data.ok) {
      localStorage.setItem('jyr_token', data.token);
      localStorage.setItem('jyr_usuario', JSON.stringify(data.usuario));
      localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
      setUsuario(data.usuario);
      setAutenticado(true);
      return data;
    }
    throw new Error(data.mensaje);
  };

  useEffect(() => {
    if (!autenticado) return undefined;

    let timeoutId = null;
    let lastRecordedActivity = 0;

    const clearIdleTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleSessionCheck = () => {
      clearIdleTimer();
      const elapsedMs = Date.now() - getLastActivity();
      const remainingMs = Math.max(0, idleTimeoutMs - elapsedMs);
      const tokenExpirationMs = getTokenExpirationMs(localStorage.getItem('jyr_token'));
      const tokenRemainingMs = tokenExpirationMs
        ? Math.max(0, tokenExpirationMs - Date.now())
        : remainingMs;

      timeoutId = setTimeout(checkSessionExpiration, Math.min(remainingMs, tokenRemainingMs));
    };

    const refreshActivity = () => {
      const now = Date.now();
      if (now - lastRecordedActivity < 1000) return;

      lastRecordedActivity = now;
      localStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
      scheduleSessionCheck();
    };

    const checkSessionExpiration = () => {
      const token = localStorage.getItem('jyr_token');
      if (!token || isTokenExpired(token) || Date.now() - getLastActivity() >= idleTimeoutMs) {
        cerrarSesion();
        return;
      }

      scheduleSessionCheck();
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpiration();
      }
    };

    const syncFromOtherTabs = (event) => {
      if (event.key === 'jyr_token' && !event.newValue) {
        cerrarSesion();
        return;
      }

      if (event.key === SESSION_ACTIVITY_KEY) {
        scheduleSessionCheck();
      }
    };

    localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, refreshActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('storage', syncFromOtherTabs);
    scheduleSessionCheck();

    return () => {
      clearIdleTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, refreshActivity);
      });
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('storage', syncFromOtherTabs);
    };
  }, [autenticado, cerrarSesion, idleTimeoutMs]);

  return (
    <AuthContext.Provider value={{ usuario, autenticado, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
