import { useEffect, useState } from 'react';
import { ubicacionService } from '../services/serviceIndex.js';

// HU-10: Hook para cargar ubicaciones activas del catálogo
export const useUbicaciones = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(true);

  const normalizarRespuesta = (payload) => {
    if (Array.isArray(payload)) {
      return {
        filas: payload,
        totalPaginas: 1
      };
    }

    return {
      filas: Array.isArray(payload?.data) ? payload.data : [],
      totalPaginas: Number(payload?.meta?.totalPages || 1)
    };
  };

  const cargarUbicaciones = async () => {
    try {
      setLoadingUbicaciones(true);
      const limite = 100;
      const { data } = await ubicacionService.listar({
        includeInactive: 'false',
        page: 1,
        limit: limite
      });

      const primera = normalizarRespuesta(data?.data);
      const acumuladas = [...primera.filas];

      for (let pagina = 2; pagina <= primera.totalPaginas; pagina += 1) {
        const { data: dataPagina } = await ubicacionService.listar({
          includeInactive: 'false',
          page: pagina,
          limit: limite
        });
        const bloque = normalizarRespuesta(dataPagina?.data).filas;
        acumuladas.push(...bloque);
      }

      const mapa = new Map();
      acumuladas.forEach((item) => {
        if (item?.cod_ubicacion) {
          mapa.set(item.cod_ubicacion, item);
        }
      });

      setUbicaciones(Array.from(mapa.values()));
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
