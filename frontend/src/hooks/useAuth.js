import { useState, useEffect } from "react";
import {
  getFromStorage,
  saveToStorage,
  removeFromStorage,
} from "../utils/utils";
import { STORAGE_KEYS } from "../constants/constants";

/**
 * Hook personalizado para manejar la autenticación
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar token y usuario del localStorage al montar el componente
    const storedToken = getFromStorage(STORAGE_KEYS.TOKEN);
    const storedUser = getFromStorage(STORAGE_KEYS.USER);

    if (storedToken) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    saveToStorage(STORAGE_KEYS.TOKEN, tokenData);
    saveToStorage(STORAGE_KEYS.USER, userData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeFromStorage(STORAGE_KEYS.TOKEN);
    removeFromStorage(STORAGE_KEYS.USER);
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  return {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: isAuthenticated(),
  };
};
