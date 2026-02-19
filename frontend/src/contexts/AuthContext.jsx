import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/serviceIndex.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [autenticado, setAutenticado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem('jyr_token');
      const usuarioGuardado = localStorage.getItem('jyr_usuario');

      if (token && usuarioGuardado) {
        try {
          setUsuario(JSON.parse(usuarioGuardado));
          setAutenticado(true);
        } catch {
          cerrarSesion();
        }
      }
      setCargando(false);
    };
    verificarSesion();
  }, []);

  const iniciarSesion = async (nombre_usuario, password) => {
    const { data } = await authService.login({ nombre_usuario, password });
    if (data.ok) {
      localStorage.setItem('jyr_token', data.token);
      localStorage.setItem('jyr_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      setAutenticado(true);
      return data;
    }
    throw new Error(data.mensaje);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('jyr_token');
    localStorage.removeItem('jyr_usuario');
    setUsuario(null);
    setAutenticado(false);
  };

  return (
    <AuthContext.Provider value={{ usuario, autenticado, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
