import { useEffect, useState } from 'react';
import { isvApi } from '../services/isv.api.js';

export const useIsv = () => {
  const [catalogoIsv, setCatalogoIsv] = useState([]);
  const [loadingIsv, setLoadingIsv] = useState(true);

  const cargarIsv = async () => {
    try {
      setLoadingIsv(true);
      const data = await isvApi.getAll();
      setCatalogoIsv(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error al cargar catálogo ISV:', e.message);
      setCatalogoIsv([]);
    } finally {
      setLoadingIsv(false);
    }
  };

  useEffect(() => {
    cargarIsv();
  }, []);

  return { catalogoIsv, loadingIsv, cargarIsv };
};
