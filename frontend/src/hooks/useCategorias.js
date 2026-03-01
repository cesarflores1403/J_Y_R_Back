import { useEffect, useState } from 'react';
import { categoriaService } from '../services/serviceIndex.js';

export const useCategorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  const cargarCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const { data } = await categoriaService.listarActivas();
      // El endpoint devuelve { ok, message, data: [...] }
      setCategorias(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error('Error al cargar categorías:', e.message);
      setCategorias([]);
    } finally {
      setLoadingCategorias(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  return { categorias, loadingCategorias, cargarCategorias };
};
