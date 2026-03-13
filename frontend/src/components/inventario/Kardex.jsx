import React, { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiList } from 'react-icons/fi';
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

// // Normaliza cod_producto recibido desde UI (ej: "PROD-0023" -> 23)
const normalizarCodProducto = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  const soloDigitos = texto.replace(/\D+/g, '');
  if (!soloDigitos) return '';
  const cod = Number.parseInt(soloDigitos, 10);
  return Number.isNaN(cod) || cod < 1 ? '' : cod;
};

// // Construye paginas visibles con elipsis para navegacion compacta
const construirPaginasVisibles = (paginaActual, totalPaginas, maxVisibles = 5) => {
  if (totalPaginas <= 1) return [1];
  if (totalPaginas <= maxVisibles) {
    return Array.from({ length: totalPaginas }, (_, idx) => idx + 1);
  }

  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, inicio + maxVisibles - 1);
  inicio = Math.max(1, fin - maxVisibles + 1);

  const paginas = [];
  if (inicio > 1) paginas.push(1);
  if (inicio > 2) paginas.push('...');

  for (let pagina = inicio; pagina <= fin; pagina += 1) {
    paginas.push(pagina);
  }

  if (fin < totalPaginas - 1) paginas.push('...');
  if (fin < totalPaginas) paginas.push(totalPaginas);

  return paginas;
};

const Kardex = ({ refreshKey = 0 }) => {
  // // Filas del kardex y estados de UI
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productos, setProductos] = useState([]);

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
        cod_producto: normalizarCodProducto(consulta.cod_producto),
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
    // // Carga catalogo de productos para autocompletado del filtro por codigo
    const cargarProductos = async () => {
      try {
        const { data } = await inventarioMovimientosApi.listarProductos();
        const lista = Array.isArray(data?.data) ? data.data : [];
        setProductos(lista);
      } catch {
        setProductos([]);
      }
    };
    cargarProductos();
  }, []);

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

  // // Rango mostrado en paginacion tipo "Mostrando X-Y de N"
  const inicioMostrado = meta.total > 0
    ? ((meta.pagina - 1) * meta.limite) + 1
    : 0;
  const finMostrado = meta.total > 0
    ? Math.min(meta.pagina * meta.limite, meta.total)
    : 0;
  const paginasVisibles = construirPaginasVisibles(meta.pagina, meta.totalPaginas);

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
          productos={productos}
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

        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            border: '1px solid var(--jyr-gray-200)',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
            Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => cambiarPagina(meta.pagina - 1)}
              disabled={loading || meta.pagina <= 1}
              aria-label="Pagina anterior"
              style={{
                minWidth: 36,
                height: 36,
                border: '1px solid var(--jyr-gray-200)',
                background: '#fff',
                color: '#0f172a',
                padding: 0
              }}
            >
              <FiChevronLeft size={15} />
            </button>

            {paginasVisibles.map((pagina, index) => (
              <button
                // // Elipsis se renderiza como boton deshabilitado solo visual
                key={`${pagina}-${index}`}
                type="button"
                className="btn btn-sm"
                onClick={() => (typeof pagina === 'number' ? cambiarPagina(pagina) : undefined)}
                disabled={loading || pagina === '...'}
                style={{
                  minWidth: 36,
                  height: 36,
                  border: '1px solid var(--jyr-gray-200)',
                  background: pagina === meta.pagina ? '#0b0f19' : '#fff',
                  color: pagina === meta.pagina ? '#fff' : '#111827',
                  fontWeight: pagina === meta.pagina ? 700 : 500,
                  padding: '0 10px'
                }}
              >
                {pagina}
              </button>
            ))}

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => cambiarPagina(meta.pagina + 1)}
              disabled={loading || meta.pagina >= meta.totalPaginas}
              aria-label="Pagina siguiente"
              style={{
                minWidth: 36,
                height: 36,
                border: '1px solid var(--jyr-gray-200)',
                background: '#fff',
                color: '#0f172a',
                padding: 0
              }}
            >
              <FiChevronRight size={15} />
            </button>

            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: 'var(--jyr-gray-500)',
                whiteSpace: 'nowrap'
              }}
            >
              Pagina {meta.pagina} de {meta.totalPaginas}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kardex;
