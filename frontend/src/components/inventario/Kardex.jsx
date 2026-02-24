import React, { useCallback, useEffect, useState } from 'react';
import { FiList } from 'react-icons/fi';
import KardexFiltros from './KardexFiltros.jsx';
import KardexTabla from './KardexTabla.jsx';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';

// // Estado inicial de filtros del kardex (HU3)
const filtrosIniciales = {
  fecha_desde: '',
  fecha_hasta: '',
  cod_producto: '',
  cod_ubicacion: '',
  tipo: '',
  pagina: 1,
  limite: 10
};

// // Oculta params vacios para evitar errores de validacion y ruido en query string
const limpiarParamsConsulta = (params = {}) => {
  const limpio = {};
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'string' && valor.trim() === '') return;
    limpio[clave] = valor;
  });
  return limpio;
};

// // Normaliza respuesta del backend con soporte a data/meta y aliases legacy
const normalizarRespuestaKardex = (payload, fallbackLimite = 10) => {
  if (Array.isArray(payload?.data) && payload?.meta) {
    return {
      filas: payload.data,
      meta: {
        total: Number(payload.meta.total || 0),
        pagina: Number(payload.meta.page || 1),
        limite: Number(payload.meta.limit || fallbackLimite),
        totalPaginas: Number(payload.meta.totalPages || 1)
      }
    };
  }

  return {
    filas: Array.isArray(payload?.datos) ? payload.datos : [],
    meta: {
      total: Number(payload?.total || 0),
      pagina: Number(payload?.pagina || payload?.page || 1),
      limite: Number(payload?.limite || payload?.limit || fallbackLimite),
      totalPaginas: Number(payload?.totalPaginas || payload?.totalPages || 1)
    }
  };
};

// // Normaliza mensaje de error de API para la UI del kardex
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Filtros invalidos para consultar el kardex';
  if (status === 404) return serverMessage || 'No se encontro el recurso solicitado';
  return serverMessage || 'Error inesperado al consultar el kardex';
};

const Kardex = ({ refreshKey = 0 }) => {
  // // Filas del kardex y estados de UI
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // // Filtros editables y consulta efectiva
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [consulta, setConsulta] = useState(filtrosIniciales);

  // // Metadata de paginacion del kardex
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: 10,
    totalPaginas: 1
  });

  // // Carga movimientos del kardex desde API HU3
  const cargarKardex = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // // Validacion basica cliente para rango de fechas
      if (consulta.fecha_desde && consulta.fecha_hasta) {
        const desde = new Date(consulta.fecha_desde);
        const hasta = new Date(consulta.fecha_hasta);
        if (!Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime()) && desde > hasta) {
          setFilas([]);
          setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
          setError('fecha_desde no puede ser mayor que fecha_hasta');
          return;
        }
      }

      // // Enviamos aliases nuevos y legacy como en el resto del modulo Inventario
      const params = limpiarParamsConsulta({
        ...consulta,
        page: Number(consulta.pagina || 1),
        limit: Number(consulta.limite || 10)
      });

      const { data } = await inventarioMovimientosApi.listar(params);

      // // Si la API responde con contrato ok, normalizamos y actualizamos estado
      if (data?.ok) {
        const normalizado = normalizarRespuestaKardex(data.data, Number(params.limit || 10));
        setFilas(normalizado.filas);
        setMeta(normalizado.meta);
      } else {
        setFilas([]);
        setMeta({ total: 0, pagina: 1, limite: Number(params.limit || 10), totalPaginas: 1 });
        setError('Respuesta invalida del servidor al consultar kardex');
      }
    } catch (err) {
      // // Error HTTP/validacion durante la consulta del kardex
      setFilas([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
      setError(obtenerMensajeError(err));
    } finally {
      setLoading(false);
    }
  }, [consulta]);

  useEffect(() => {
    // // Carga inicial y recarga por cambios de filtros/paginacion
    cargarKardex();
  }, [cargarKardex]);

  useEffect(() => {
    // // Recarga del kardex cuando se registra una nueva entrada (HU4)
    if (refreshKey === 0) return;
    cargarKardex();
  }, [refreshKey, cargarKardex]);

  // // Actualiza filtros controlados sin disparar consulta inmediata
  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Aplica filtros y reinicia pagina a 1
  const aplicarFiltros = () => {
    setError('');
    setConsulta({
      ...filtros,
      pagina: 1,
      limite: Number(filtros.limite || 10)
    });
    setFiltros((prev) => ({
      ...prev,
      pagina: 1
    }));
  };

  // // Limpia filtros y vuelve al listado base del kardex
  const limpiarFiltros = () => {
    setError('');
    setFiltros(filtrosIniciales);
    setConsulta(filtrosIniciales);
  };

  // // Cambia pagina manteniendo los filtros del kardex
  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1) return;
    if (nuevaPagina > meta.totalPaginas) return;

    setConsulta((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
    setFiltros((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
  };

  return (
    <div className="jyr-card mt-4">
      <div className="jyr-card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FiList />
          <h5 className="mb-0">Kardex (Movimientos)</h5>
        </div>

        {error && (
          // // Error de consulta/validacion del kardex
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <KardexFiltros
          // // Formulario de filtros del kardex
          filtros={filtros}
          loading={loading}
          onChange={manejarCambioFiltro}
          onAplicar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
        />

        <div className="jyr-card mt-3">
          <div className="jyr-card-body p-0">
            <KardexTabla filas={filas} loading={loading} />
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">Total movimientos: {meta.total}</small>

          <div className="btn-group">
            <button
              // // Navega a la pagina anterior del kardex
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cambiarPagina(meta.pagina - 1)}
              disabled={loading || meta.pagina <= 1}
            >
              Anterior
            </button>

            <button
              // // Indicador de pagina actual del kardex
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled
            >
              Pagina {meta.pagina} de {meta.totalPaginas}
            </button>

            <button
              // // Navega a la pagina siguiente del kardex
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cambiarPagina(meta.pagina + 1)}
              disabled={loading || meta.pagina >= meta.totalPaginas}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kardex;
