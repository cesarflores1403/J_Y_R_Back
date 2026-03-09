import { useEffect, useState } from 'react';
import { ubicacionService } from '../services/serviceIndex.js';

// HU-10: Hook para cargar ubicaciones activas del catálogo
export const useUbicaciones = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(true);

  const cargarUbicaciones = async () => {
    try {
      setLoadingUbicaciones(true);
      const { data } = await ubicacionService.listar();
      setUbicaciones(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error('Error al cargar ubicaciones:', e.message);
      setUbicaciones([]);
    } finally {
      setLoadingUbicaciones(false);
    }
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  return { ubicaciones, loadingUbicaciones, cargarUbicaciones };
};
