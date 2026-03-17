import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiDatabase } from 'react-icons/fi';
import ExistenciasFiltros from './ExistenciasFiltros.jsx';
import ExistenciasTabla from './ExistenciasTabla.jsx';
import ExistenciasFormMinMax from './ExistenciasFormMinMax.jsx';
import { inventarioExistenciasApi } from './inventarioExistencias.api.js';

const LIMITE_PAGINA = 10;
const FILTRO_DEBOUNCE_MS = 350;

// Estado inicial de filtros visibles en UI.
const filtrosIniciales = {
  cod_producto: '',
  producto: '',
  cod_ubicacion: '',
  ubicacion: '',
  includeInactive: false
};

const consultaInicial = {
  ...filtrosIniciales,
  pagina: 1,
  limite: LIMITE_PAGINA
};

const obtenerMensajeError = (error, accion) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message
    || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || `Solicitud invalida al ${accion}`;
  if (status === 404) return serverMessage || 'La existencia solicitada no existe';
  if (status === 409) return serverMessage || 'Conflicto al procesar la operacion';
  return serverMessage || `Error inesperado al ${accion}`;
};

const normalizarRespuestaExistencias = (payload, fallbackLimite = LIMITE_PAGINA) => {
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
    filas: Array.isArray(payload?.datos) ? payload.datos : (Array.isArray(payload?.data) ? payload.data : []),
    meta: {
      total: Number(payload?.total || payload?.meta?.total || 0),
      pagina: Number(payload?.pagina || payload?.page || payload?.meta?.page || 1),
      limite: Number(payload?.limite || payload?.limit || payload?.meta?.limit || fallbackLimite),
      totalPaginas: Number(payload?.totalPaginas || payload?.totalPages || payload?.meta?.totalPages || 1)
    }
  };
};

const limpiarParamsConsulta = (params = {}) => {
  const limpio = {};
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'string' && valor.trim() === '') return;
    limpio[clave] = valor;
  });
  return limpio;
};

const normalizarLimite = (valor, fallback = LIMITE_PAGINA) => {
  const parsed = Number.parseInt(valor, 10);
  if (Number.isNaN(parsed)) return fallback;
  const acotado = Math.min(100, Math.max(10, parsed));
  return Math.ceil(acotado / 10) * 10;
};

const normalizarCodProducto = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim().toUpperCase();
  if (!texto) return '';
  const match = texto.match(/(\d+)$/);
  if (!match) return '';
  const numero = Number.parseInt(match[1], 10);
  if (Number.isNaN(numero) || numero < 1) return '';
  return String(numero);
};

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

const Existencias = () => {
  const [existencias, setExistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [consulta, setConsulta] = useState(consultaInicial);
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: LIMITE_PAGINA,
    totalPaginas: 1
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [resumenAlertas, setResumenAlertas] = useState({
    criticas: 0,
    sinExistencia: 0,
    bajoMinimo: 0
  });
  const [loadingResumenAlertas, setLoadingResumenAlertas] = useState(true);
  const [errorResumenAlertas, setErrorResumenAlertas] = useState('');

  const cargarExistencias = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const paramsConsulta = limpiarParamsConsulta({
        ...consulta,
        page: Number(consulta.pagina || 1),
        limit: normalizarLimite(consulta.limite, LIMITE_PAGINA)
      });

      const { data } = await inventarioExistenciasApi.listar(paramsConsulta);

      if (data?.ok) {
        const normalizado = normalizarRespuestaExistencias(data.data, Number(paramsConsulta.limit || LIMITE_PAGINA));
        setExistencias(normalizado.filas);
        setMeta(normalizado.meta);
      } else {
        setExistencias([]);
        setMeta({ total: 0, pagina: 1, limite: LIMITE_PAGINA, totalPaginas: 1 });
        setError('Respuesta invalida del servidor al listar existencias');
      }
    } catch (err) {
      setExistencias([]);
      setMeta({ total: 0, pagina: 1, limite: LIMITE_PAGINA, totalPaginas: 1 });
      setError(obtenerMensajeError(err, 'consultar existencias'));
    } finally {
      setLoading(false);
    }
  }, [consulta]);

  useEffect(() => {
    cargarExistencias();
  }, [cargarExistencias]);

  const cargarResumenAlertas = useCallback(async () => {
    try {
      setLoadingResumenAlertas(true);
      setErrorResumenAlertas('');

      const filtrosBase = limpiarParamsConsulta({
        cod_producto: consulta.cod_producto,
        producto: consulta.producto,
        cod_ubicacion: consulta.cod_ubicacion,
        ubicacion: consulta.ubicacion,
        includeInactive: consulta.includeInactive
      });

      const [respuestaAlertas, respuestaSinExistencia] = await Promise.all([
        inventarioExistenciasApi.listarAlertasStockBajo({
          ...filtrosBase,
          page: 1,
          limit: 1
        }),
        inventarioExistenciasApi.listarAlertasStockBajo({
          ...filtrosBase,
          page: 1,
          limit: 1,
          solo_criticos: true
        })
      ]);

      const payloadAlertas = respuestaAlertas?.data;
      const payloadSinExistencia = respuestaSinExistencia?.data;

      if (!payloadAlertas?.ok || !payloadSinExistencia?.ok) {
        throw new Error('Respuesta invalida al consultar resumen de alertas');
      }

      const metaAlertas = normalizarRespuestaExistencias(payloadAlertas.data, 1).meta;
      const metaSinExistencia = normalizarRespuestaExistencias(payloadSinExistencia.data, 1).meta;

      const totalAlertasCriticas = Number(metaAlertas.total || 0);
      const totalSinExistencia = Number(metaSinExistencia.total || 0);

      setResumenAlertas({
        criticas: totalAlertasCriticas,
        sinExistencia: totalSinExistencia,
        bajoMinimo: Math.max(0, totalAlertasCriticas - totalSinExistencia)
      });
    } catch (err) {
      setResumenAlertas({
        criticas: 0,
        sinExistencia: 0,
        bajoMinimo: 0
      });
      setErrorResumenAlertas(obtenerMensajeError(err, 'consultar resumen de alertas'));
    } finally {
      setLoadingResumenAlertas(false);
    }
  }, [
    consulta.cod_producto,
    consulta.producto,
    consulta.cod_ubicacion,
    consulta.ubicacion,
    consulta.includeInactive
  ]);

  useEffect(() => {
    cargarResumenAlertas();
  }, [cargarResumenAlertas]);

  // Filtros en vivo (misma UX de Ubicaciones: sin botones de aplicar/limpiar).
  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('');
      setSuccess('');
      setConsulta((prev) => ({
        ...prev,
        cod_producto: normalizarCodProducto(filtros.cod_producto),
        producto: filtros.producto,
        cod_ubicacion: filtros.cod_ubicacion,
        ubicacion: filtros.ubicacion,
        includeInactive: Boolean(filtros.includeInactive),
        pagina: 1,
        limite: LIMITE_PAGINA
      }));
    }, FILTRO_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    filtros.cod_producto,
    filtros.producto,
    filtros.cod_ubicacion,
    filtros.ubicacion,
    filtros.includeInactive
  ]);

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1) return;
    if (nuevaPagina > meta.totalPaginas) return;
    setConsulta((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
  };

  const abrirEdicion = (fila) => {
    setSeleccionado(fila);
    setErrorForm('');
    setModalAbierto(true);
  };

  const cerrarEdicion = () => {
    if (saving) return;
    setModalAbierto(false);
    setErrorForm('');
  };

  const guardarMinMax = async (payload) => {
    if (!seleccionado?.cod_inventario) {
      setErrorForm('No se encontró la existencia seleccionada para actualizar');
      return;
    }

    try {
      setSaving(true);
      setErrorForm('');
      setError('');
      setSuccess('');

      const { data } = await inventarioExistenciasApi.actualizarMinMax(
        seleccionado.cod_inventario,
        payload
      );

      if (data?.ok) {
        setSuccess('Minimos y maximos actualizados correctamente');
        setModalAbierto(false);
        await cargarExistencias();
      } else {
        setErrorForm('Respuesta invalida del servidor al actualizar min/max');
      }
    } catch (err) {
      setErrorForm(obtenerMensajeError(err, 'actualizar minimos y maximos'));
    } finally {
      setSaving(false);
    }
  };

  const inicioMostrado = meta.total > 0
    ? ((meta.pagina - 1) * meta.limite) + 1
    : 0;
  const finMostrado = meta.total > 0
    ? Math.min(meta.pagina * meta.limite, meta.total)
    : 0;
  const paginasVisibles = useMemo(
    () => construirPaginasVisibles(meta.pagina, meta.totalPaginas),
    [meta.pagina, meta.totalPaginas]
  );

  return (
    <section className="kdx-shell mt-4">
      <div className="kdx-hero">
        <div className="kdx-hero-head">
          <div className="kdx-title-wrap">
            <div className="kdx-title-icon">
              <FiDatabase />
            </div>
            <div>
              <h5 className="mb-0">Existencias</h5>
              <p className="kdx-subtitle mb-0">
                Stock por producto y ubicacion con control de minimos, maximos y reservas.
              </p>
            </div>
          </div>

          <div className="kdx-mini-kpi">
            <span className="kdx-mini-kpi-label">Total</span>
            <strong>{meta.total}</strong>
          </div>
        </div>

        <div className="kdx-kpi-grid">
          <div className="kdx-kpi-card">
            <span>Alertas criticas</span>
            <strong>{loadingResumenAlertas ? '...' : resumenAlertas.criticas}</strong>
          </div>
          <div className="kdx-kpi-card">
            <span>Sin existencia</span>
            <strong>{loadingResumenAlertas ? '...' : resumenAlertas.sinExistencia}</strong>
          </div>
          <div className="kdx-kpi-card">
            <span>Bajo minimo</span>
            <strong>{loadingResumenAlertas ? '...' : resumenAlertas.bajoMinimo}</strong>
          </div>
        </div>
      </div>

      {errorResumenAlertas && (
        <div className="alert alert-danger kdx-error-alert mb-0" role="alert">
          {errorResumenAlertas}
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-0" role="alert">
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      <div className="jyr-card kdx-filtros-card">
        <div className="jyr-card-body">
          <ExistenciasFiltros
            filtros={filtros}
            onChange={manejarCambioFiltro}
            totalVisibles={existencias.length}
            alertasCriticas={loadingResumenAlertas ? '...' : resumenAlertas.criticas}
          />
        </div>
      </div>

      <div className="jyr-card mt-3 kdx-table-card">
        <div className="kdx-table-topbar">
          <div className="kdx-table-topbar-left">
            <FiAlertTriangle />
            <span>Existencias registradas</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
          </div>
        </div>
        <div className="jyr-card-body p-0">
          <ExistenciasTabla filas={existencias} loading={loading} onEditar={abrirEdicion} />
        </div>
      </div>

      <div className="kdx-pagination-bar">
        <span className="kdx-pagination-summary">
          Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
        </span>

        <div className="kdx-pagination-controls">
          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPagina(meta.pagina - 1)}
            disabled={loading || meta.pagina <= 1}
            aria-label="Pagina anterior"
          >
            <FiChevronLeft size={15} />
          </button>

          {paginasVisibles.map((pagina, index) => (
            <button
              key={`${pagina}-${index}`}
              type="button"
              className={`kdx-page-btn ${pagina === meta.pagina ? 'is-active' : ''} ${pagina === '...' ? 'is-ellipsis' : ''}`}
              onClick={() => (typeof pagina === 'number' ? cambiarPagina(pagina) : undefined)}
              disabled={loading || pagina === '...'}
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPagina(meta.pagina + 1)}
            disabled={loading || meta.pagina >= meta.totalPaginas}
            aria-label="Pagina siguiente"
          >
            <FiChevronRight size={15} />
          </button>

          <span className="kdx-page-state">
            Pagina {meta.pagina} de {meta.totalPaginas}
          </span>
        </div>
      </div>

      <ExistenciasFormMinMax
        abierto={modalAbierto}
        saving={saving}
        error={errorForm}
        existencia={seleccionado}
        onCerrar={cerrarEdicion}
        onGuardar={guardarMinMax}
      />
    </section>
  );
};

export default Existencias;
