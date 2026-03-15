import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiClipboard, FiDatabase, FiPlus } from 'react-icons/fi';
import { inventarioConteosApi } from './inventarioConteos.api.js';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import ConteosFiltros from './ConteosFiltros.jsx';
import ConteosTabla from './ConteosTabla.jsx';
import ConteosDetallesTabla from './ConteosDetallesTabla.jsx';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';

const LIMITE_PAGINA = 10;
const LIMITE_DETALLE = 10;

const filtrosIniciales = {
  cod_conteo: '',
  estado: '',
  fecha_desde: '',
  fecha_hasta: '',
  pagina: 1,
  limite: LIMITE_PAGINA
};

const detalleInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  stock_fisico: '',
  observaciones: ''
};

const normalizarRespuesta = (payload, fallbackLimite = LIMITE_PAGINA) => {
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
  for (let pagina = inicio; pagina <= fin; pagina += 1) paginas.push(pagina);
  if (fin < totalPaginas - 1) paginas.push('...');
  if (fin < totalPaginas) paginas.push(totalPaginas);
  return paginas;
};

const limpiarParams = (params = {}) => {
  const limpio = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    limpio[key] = value;
  });
  return limpio;
};

const normalizarEnteroPositivo = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  const parsed = Number.parseInt(texto, 10);
  return Number.isNaN(parsed) || parsed < 1 ? '' : parsed;
};

const formatearCodigoProducto = (producto) => {
  const codigo = String(producto?.codigo_producto || '').trim().toUpperCase();
  if (codigo) return codigo;

  const codProducto = Number(producto?.cod_producto || 0);
  if (Number.isInteger(codProducto) && codProducto > 0) {
    return `PROD-${String(codProducto).padStart(4, '0')}`;
  }

  return '';
};

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const formatearEtiquetaUbicacion = (ubicacion) => {
  const pasillo = String(ubicacion?.pasillo || '').trim();
  const estanteria = String(ubicacion?.estanteria || '').trim();
  const nivel1 = String(ubicacion?.nivel_1 || '').trim();
  const nivel2 = String(ubicacion?.nivel_2 || '').trim();
  const descripcion = String(ubicacion?.descripcion || '').trim();

  const traza = [
    pasillo ? `P:${pasillo}` : null,
    estanteria ? `E:${estanteria}` : null,
    nivel1 ? `N1:${nivel1}` : null,
    nivel2 ? `N2:${nivel2}` : null
  ].filter(Boolean).join(' ');

  if (descripcion) return `${traza || 'Ubicacion'} - ${descripcion}`;
  return traza || `Ubicacion ${ubicacion?.cod_ubicacion ?? ''}`.trim();
};

const obtenerMensajeError = (error, fallback) => {
  if (!error?.response) {
    return 'No se pudo conectar con la API. Reinicia backend y frontend, luego recarga la pagina.';
  }

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;
  const erroresValidacion = error?.response?.data?.errors || error?.response?.data?.errores;

  if (Array.isArray(erroresValidacion) && erroresValidacion.length > 0) {
    const primero = erroresValidacion[0];
    return primero?.msg || primero?.mensaje || serverMessage || fallback;
  }

  if (status === 400) return serverMessage || fallback || 'Datos invalidos para operar conteos';
  if (status === 404) return serverMessage || 'Conteo, producto, ubicacion o inventario no encontrado';
  if (status === 409) return serverMessage || 'Conflicto de estado del conteo o stock';
  if (status === 401) return serverMessage || 'Sesion expirada o invalida. Inicia sesion nuevamente';
  if (status === 403) return serverMessage || 'No tienes permisos para operar conteos';
  if (status >= 500) return serverMessage || 'Error interno del backend en conteos';
  return serverMessage || fallback || 'Error inesperado en conteos';
};

const InventarioConteosPage = () => {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [consulta, setConsulta] = useState(filtrosIniciales);
  const [conteos, setConteos] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: LIMITE_PAGINA,
    totalPaginas: 1
  });
  const [loadingConteos, setLoadingConteos] = useState(true);

  const [conteoActivo, setConteoActivo] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [metaDetalles, setMetaDetalles] = useState({
    total: 0,
    pagina: 1,
    limite: LIMITE_DETALLE,
    totalPaginas: 1
  });
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  const [productos, setProductos] = useState([]);
  const { ubicaciones, loadingUbicaciones } = useUbicaciones();

  const [modalAperturaAbierto, setModalAperturaAbierto] = useState(false);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);

  const [observacionesApertura, setObservacionesApertura] = useState('');
  const [formDetalle, setFormDetalle] = useState(detalleInicial);
  const [observacionesCierre, setObservacionesCierre] = useState('');

  const [savingApertura, setSavingApertura] = useState(false);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [savingCierre, setSavingCierre] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resumenCierre, setResumenCierre] = useState(null);

  const opcionesProducto = useMemo(() => (
    (Array.isArray(productos) ? productos : [])
      .filter((item) => String(item?.estado_producto || '').toLowerCase() === 'activo')
      .map((item) => ({
        cod_producto: Number(item.cod_producto),
        nombre_producto: item.nombre_producto || 'Sin nombre',
        codigo_producto: formatearCodigoProducto(item)
      }))
      .filter((item) => Number.isInteger(item.cod_producto) && item.cod_producto > 0)
  ), [productos]);

  const opcionesUbicacion = useMemo(() => (
    (Array.isArray(ubicaciones) ? ubicaciones : [])
      .filter((item) => Number.isInteger(Number(item?.cod_ubicacion)) && Number(item.cod_ubicacion) > 0)
  ), [ubicaciones]);

  const cargarDetallesConteo = useCallback(async (codConteo, pagina = 1) => {
    if (!Number.isInteger(Number(codConteo)) || Number(codConteo) <= 0) return;

    try {
      setLoadingDetalles(true);
      setError('');

      const { data } = await inventarioConteosApi.listarDetalles(Number(codConteo), {
        page: Number(pagina || 1),
        limit: LIMITE_DETALLE
      });

      if (!data?.ok) {
        setDetalles([]);
        setMetaDetalles({
          total: 0,
          pagina: Number(pagina || 1),
          limite: LIMITE_DETALLE,
          totalPaginas: 1
        });
        setError('Respuesta invalida del servidor al listar detalle del conteo');
        return;
      }

      const normalizado = normalizarRespuesta(data.data, LIMITE_DETALLE);
      setDetalles(normalizado.filas);
      setMetaDetalles(normalizado.meta);

      setConteoActivo((prev) => ({
        ...(prev || {}),
        ...(data?.data?.conteo || {}),
        cod_conteo: Number(codConteo)
      }));
    } catch (err) {
      setDetalles([]);
      setMetaDetalles({
        total: 0,
        pagina: Number(pagina || 1),
        limite: LIMITE_DETALLE,
        totalPaginas: 1
      });
      setError(obtenerMensajeError(err, 'Error al consultar detalle del conteo'));
    } finally {
      setLoadingDetalles(false);
    }
  }, []);

  const cargarConteos = useCallback(async () => {
    try {
      setLoadingConteos(true);
      setError('');

      if (consulta.fecha_desde && consulta.fecha_hasta) {
        const desde = new Date(consulta.fecha_desde);
        const hasta = new Date(consulta.fecha_hasta);
        if (!Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime()) && desde > hasta) {
          setConteos([]);
          setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
          setError('fecha_desde no puede ser mayor que fecha_hasta');
          return;
        }
      }

      const params = limpiarParams({
        ...consulta,
        cod_conteo: normalizarEnteroPositivo(consulta.cod_conteo),
        page: Number(consulta.pagina || 1),
        limit: Number(consulta.limite || LIMITE_PAGINA)
      });

      const { data } = await inventarioConteosApi.listar(params);
      if (!data?.ok) {
        setConteos([]);
        setMeta({
          total: 0,
          pagina: 1,
          limite: Number(params.limit || LIMITE_PAGINA),
          totalPaginas: 1
        });
        setError('Respuesta invalida del servidor al consultar conteos');
        return;
      }

      const normalizado = normalizarRespuesta(data.data, Number(params.limit || LIMITE_PAGINA));
      setConteos(normalizado.filas);
      setMeta(normalizado.meta);
    } catch (err) {
      setConteos([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
      setError(obtenerMensajeError(err, 'Error al consultar historial de conteos'));
    } finally {
      setLoadingConteos(false);
    }
  }, [consulta]);

  useEffect(() => {
    cargarConteos();
  }, [cargarConteos]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const { data } = await inventarioMovimientosApi.listarProductos();
        setProductos(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setProductos([]);
      }
    };
    cargarProductos();
  }, []);

  const resumenDiferencias = useMemo(() => {
    const positivos = detalles.filter((item) => Number(item.diferencia) > 0).length;
    const negativos = detalles.filter((item) => Number(item.diferencia) < 0).length;
    const sinCambio = detalles.filter((item) => Number(item.diferencia) === 0).length;

    return {
      positivos,
      negativos,
      sinCambio
    };
  }, [detalles]);

  const estadoConteoActivo = String(conteoActivo?.estado || '').trim().toUpperCase();
  const conteoAbierto = Boolean(conteoActivo?.cod_conteo) && estadoConteoActivo === 'ABIERTO';

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const aplicarFiltros = () => {
    setError('');
    setConsulta({
      ...filtros,
      pagina: 1,
      limite: Number(filtros.limite || LIMITE_PAGINA)
    });
    setFiltros((prev) => ({
      ...prev,
      pagina: 1
    }));
  };

  const limpiarFiltros = () => {
    setError('');
    setSuccess('');
    setFiltros(filtrosIniciales);
    setConsulta(filtrosIniciales);
  };

  const cambiarPaginaConteos = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > meta.totalPaginas) return;
    setConsulta((prev) => ({ ...prev, pagina: nuevaPagina }));
    setFiltros((prev) => ({ ...prev, pagina: nuevaPagina }));
  };

  const cambiarPaginaDetalles = async (nuevaPagina) => {
    if (!conteoActivo?.cod_conteo) return;
    if (nuevaPagina < 1 || nuevaPagina > metaDetalles.totalPaginas) return;
    await cargarDetallesConteo(Number(conteoActivo.cod_conteo), nuevaPagina);
  };

  const seleccionarConteo = async (fila) => {
    const codConteo = Number(fila?.cod_conteo || 0);
    if (!Number.isInteger(codConteo) || codConteo < 1) return;

    setConteoActivo(fila);
    setResumenCierre(null);
    await cargarDetallesConteo(codConteo, 1);
  };

  const abrirConteo = async (event) => {
    event.preventDefault();

    try {
      setSavingApertura(true);
      setError('');
      setSuccess('');
      setResumenCierre(null);

      const { data } = await inventarioConteosApi.abrir({
        observaciones: String(observacionesApertura || '').trim()
      });

      if (!data?.ok) {
        setError('Respuesta invalida del servidor al abrir el conteo');
        return;
      }

      const codConteo = Number(data?.data?.cod_conteo || 0);
      setObservacionesApertura('');
      setModalAperturaAbierto(false);
      setSuccess(`Conteo #${codConteo} abierto correctamente`);

      await cargarConteos();

      if (Number.isInteger(codConteo) && codConteo > 0) {
        setConteoActivo(data?.data?.conteo || {
          cod_conteo: codConteo,
          estado: data?.data?.estado || 'ABIERTO'
        });
        await cargarDetallesConteo(codConteo, 1);
      }
    } catch (err) {
      setError(obtenerMensajeError(err, 'No se pudo abrir el conteo'));
    } finally {
      setSavingApertura(false);
    }
  };

  const registrarDetalle = async (event) => {
    event.preventDefault();

    const codConteo = Number(conteoActivo?.cod_conteo || 0);
    if (!Number.isInteger(codConteo) || codConteo < 1) {
      setError('Selecciona un conteo valido antes de registrar detalle');
      return;
    }

    try {
      setSavingDetalle(true);
      setError('');
      setSuccess('');

      const stockFisico = Number(formDetalle.stock_fisico);
      if (!Number.isInteger(stockFisico) || stockFisico < 0) {
        setError('stock_fisico debe ser un entero mayor o igual a 0');
        return;
      }

      const payload = {
        cod_producto: Number(formDetalle.cod_producto),
        cod_ubicacion: Number(formDetalle.cod_ubicacion),
        stock_fisico: stockFisico,
        observaciones: String(formDetalle.observaciones || '').trim()
      };

      const { data } = await inventarioConteosApi.registrarDetalle(codConteo, payload);
      if (!data?.ok) {
        setError('Respuesta invalida del servidor al registrar detalle');
        return;
      }

      setFormDetalle(detalleInicial);
      setModalDetalleAbierto(false);
      setSuccess(`Detalle ${data?.data?.accion || 'registrado'} en conteo #${codConteo}`);

      await Promise.all([
        cargarConteos(),
        cargarDetallesConteo(codConteo, metaDetalles.pagina || 1)
      ]);
    } catch (err) {
      setError(obtenerMensajeError(err, 'No se pudo registrar detalle del conteo'));
    } finally {
      setSavingDetalle(false);
    }
  };

  const cerrarConteo = async (event) => {
    event.preventDefault();

    const codConteo = Number(conteoActivo?.cod_conteo || 0);
    if (!Number.isInteger(codConteo) || codConteo < 1) {
      setError('Selecciona un conteo valido antes de cerrarlo');
      return;
    }

    try {
      setSavingCierre(true);
      setError('');
      setSuccess('');

      const { data } = await inventarioConteosApi.cerrar(codConteo, {
        observaciones_cierre: String(observacionesCierre || '').trim()
      });

      if (!data?.ok) {
        setError('Respuesta invalida del servidor al cerrar el conteo');
        return;
      }

      setObservacionesCierre('');
      setModalCierreAbierto(false);
      setResumenCierre(data?.data?.resumen || null);
      setSuccess(`Conteo #${codConteo} cerrado correctamente`);

      await Promise.all([
        cargarConteos(),
        cargarDetallesConteo(codConteo, 1)
      ]);
    } catch (err) {
      setError(obtenerMensajeError(err, 'No se pudo cerrar el conteo'));
    } finally {
      setSavingCierre(false);
    }
  };

  const paginasConteos = construirPaginasVisibles(meta.pagina, meta.totalPaginas);
  const paginasDetalles = construirPaginasVisibles(metaDetalles.pagina, metaDetalles.totalPaginas);

  const inicioConteos = meta.total > 0 ? ((meta.pagina - 1) * meta.limite) + 1 : 0;
  const finConteos = meta.total > 0 ? Math.min(meta.pagina * meta.limite, meta.total) : 0;

  const inicioDetalles = metaDetalles.total > 0 ? ((metaDetalles.pagina - 1) * metaDetalles.limite) + 1 : 0;
  const finDetalles = metaDetalles.total > 0 ? Math.min(metaDetalles.pagina * metaDetalles.limite, metaDetalles.total) : 0;

  return (
    <section className="kdx-shell mt-4">
      <div className="kdx-hero">
        <div className="kdx-hero-head">
          <div className="kdx-title-wrap">
            <div className="kdx-title-icon">
              <FiClipboard />
            </div>
            <div>
              <h5 className="mb-0">Conteos</h5>
              <p className="kdx-subtitle mb-0">Conteo fisico con diferencia persistida, ajuste trazable y cierre transaccional.</p>
            </div>
          </div>

          <div className="ubi-hero-actions">
            <div className="kdx-mini-kpi">
              <span className="kdx-mini-kpi-label">Total</span>
              <strong>{meta.total}</strong>
            </div>
            <button
              type="button"
              className="btn kdx-btn kdx-btn-accent"
              onClick={() => setModalAperturaAbierto(true)}
            >
              <FiPlus className="me-1" />
              Nuevo conteo
            </button>
          </div>
        </div>
      </div>

      <div className="jyr-card kdx-filtros-card">
        <div className="jyr-card-body">
          {success && (
            <div className="alert alert-success kdx-error-alert" role="alert">
              {success}
            </div>
          )}
          {error && (
            <div className="alert alert-danger kdx-error-alert" role="alert">
              {error}
            </div>
          )}
          <ConteosFiltros
            filtros={filtros}
            loading={loadingConteos}
            onChange={manejarCambioFiltro}
            onAplicar={aplicarFiltros}
            onLimpiar={limpiarFiltros}
          />
        </div>
      </div>

      <div className="jyr-card kdx-table-card mt-3">
        <div className="kdx-table-topbar">
          <div className="kdx-table-topbar-left">
            <FiDatabase />
            <span>Conteos registrados</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioConteos}-{finConteos} de {meta.total}
          </div>
        </div>
        <div className="jyr-card-body p-0">
          <ConteosTabla
            filas={conteos}
            loading={loadingConteos}
            conteoActivoId={Number(conteoActivo?.cod_conteo || 0)}
            onSeleccionar={seleccionarConteo}
          />
        </div>
      </div>

      <div className="kdx-pagination-bar">
        <span className="kdx-pagination-summary">
          Mostrando {inicioConteos}-{finConteos} de {meta.total}
        </span>

        <div className="kdx-pagination-controls">
          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPaginaConteos(meta.pagina - 1)}
            disabled={loadingConteos || meta.pagina <= 1}
            aria-label="Pagina anterior"
          >
            <FiChevronLeft size={15} />
          </button>

          {paginasConteos.map((pagina, index) => (
            <button
              key={`c-${pagina}-${index}`}
              type="button"
              className={`kdx-page-btn ${pagina === meta.pagina ? 'is-active' : ''} ${pagina === '...' ? 'is-ellipsis' : ''}`}
              onClick={() => (typeof pagina === 'number' ? cambiarPaginaConteos(pagina) : undefined)}
              disabled={loadingConteos || pagina === '...'}
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPaginaConteos(meta.pagina + 1)}
            disabled={loadingConteos || meta.pagina >= meta.totalPaginas}
            aria-label="Pagina siguiente"
          >
            <FiChevronRight size={15} />
          </button>

          <span className="kdx-page-state">
            Pagina {meta.pagina} de {meta.totalPaginas}
          </span>
        </div>
      </div>

      {conteoActivo?.cod_conteo && (
        <>
          <div className="jyr-card mt-3">
            <div className="jyr-card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <h6 className="mb-1">
                    Conteo seleccionado #{conteoActivo.cod_conteo}
                  </h6>
                  <p className="text-muted mb-2">
                    Estado: <strong>{conteoActivo.estado || '-'}</strong> | Apertura: {formatearFecha(conteoActivo.fecha_apertura)}
                  </p>
                  <div className="kdx-kpi-grid">
                    <div className="kdx-kpi-card">
                      <span>Detalles</span>
                      <strong>{metaDetalles.total}</strong>
                    </div>
                    <div className="kdx-kpi-card">
                      <span>Diferencias +</span>
                      <strong>{resumenDiferencias.positivos}</strong>
                    </div>
                    <div className="kdx-kpi-card">
                      <span>Diferencias -</span>
                      <strong>{resumenDiferencias.negativos}</strong>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn kdx-btn kdx-btn-accent"
                    onClick={() => setModalDetalleAbierto(true)}
                    disabled={!conteoAbierto}
                  >
                    Capturar detalle
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setModalCierreAbierto(true)}
                    disabled={!conteoAbierto || metaDetalles.total === 0}
                  >
                    Cerrar conteo
                  </button>
                </div>
              </div>

              {resumenCierre && (
                <div className="alert alert-light border mt-3 mb-0">
                  <div><strong>Total detalles:</strong> {resumenCierre.total_detalles ?? 0}</div>
                  <div><strong>Ajustes +:</strong> {resumenCierre.ajustes_positivos ?? 0}</div>
                  <div><strong>Ajustes -:</strong> {resumenCierre.ajustes_negativos ?? 0}</div>
                  <div><strong>Sin cambio:</strong> {resumenCierre.detalles_sin_cambio ?? 0}</div>
                  <div><strong>Movimientos generados:</strong> {resumenCierre.total_movimientos_generados ?? 0}</div>
                </div>
              )}
            </div>
          </div>

          <div className="jyr-card kdx-table-card mt-3">
            <div className="kdx-table-topbar">
              <div className="kdx-table-topbar-left">
                <FiDatabase />
                <span>Detalle persistido del conteo</span>
              </div>
              <div className="kdx-table-topbar-right">
                Mostrando {inicioDetalles}-{finDetalles} de {metaDetalles.total}
              </div>
            </div>
            <div className="jyr-card-body p-0">
              <ConteosDetallesTabla
                filas={detalles}
                loading={loadingDetalles}
              />
            </div>
          </div>

          <div className="kdx-pagination-bar">
            <span className="kdx-pagination-summary">
              Mostrando {inicioDetalles}-{finDetalles} de {metaDetalles.total}
            </span>

            <div className="kdx-pagination-controls">
              <button
                type="button"
                className="kdx-page-btn kdx-page-btn-nav"
                onClick={() => cambiarPaginaDetalles(metaDetalles.pagina - 1)}
                disabled={loadingDetalles || metaDetalles.pagina <= 1}
                aria-label="Pagina anterior del detalle"
              >
                <FiChevronLeft size={15} />
              </button>

              {paginasDetalles.map((pagina, index) => (
                <button
                  key={`d-${pagina}-${index}`}
                  type="button"
                  className={`kdx-page-btn ${pagina === metaDetalles.pagina ? 'is-active' : ''} ${pagina === '...' ? 'is-ellipsis' : ''}`}
                  onClick={() => (typeof pagina === 'number' ? cambiarPaginaDetalles(pagina) : undefined)}
                  disabled={loadingDetalles || pagina === '...'}
                >
                  {pagina}
                </button>
              ))}

              <button
                type="button"
                className="kdx-page-btn kdx-page-btn-nav"
                onClick={() => cambiarPaginaDetalles(metaDetalles.pagina + 1)}
                disabled={loadingDetalles || metaDetalles.pagina >= metaDetalles.totalPaginas}
                aria-label="Pagina siguiente del detalle"
              >
                <FiChevronRight size={15} />
              </button>

              <span className="kdx-page-state">
                Pagina {metaDetalles.pagina} de {metaDetalles.totalPaginas}
              </span>
            </div>
          </div>
        </>
      )}

      {modalAperturaAbierto && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingApertura) setModalAperturaAbierto(false);
        }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Abrir conteo fisico</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalAperturaAbierto(false)}
                  disabled={savingApertura}
                />
              </div>
              <form onSubmit={abrirConteo}>
                <div className="modal-body">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    rows="3"
                    maxLength={500}
                    className="form-control"
                    placeholder="Conteo general de bodega"
                    value={observacionesApertura}
                    onChange={(event) => setObservacionesApertura(event.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalAperturaAbierto(false)}
                    disabled={savingApertura}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn jyr-btn-primary" disabled={savingApertura}>
                    {savingApertura ? 'Abriendo...' : 'Abrir conteo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalDetalleAbierto && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingDetalle) setModalDetalleAbierto(false);
        }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Capturar detalle conteo #{conteoActivo?.cod_conteo}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalDetalleAbierto(false)}
                  disabled={savingDetalle}
                />
              </div>

              <form onSubmit={registrarDetalle}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Codigo de producto *</label>
                      <select
                        className="form-select"
                        value={formDetalle.cod_producto}
                        onChange={(event) => setFormDetalle((prev) => ({ ...prev, cod_producto: event.target.value }))}
                        disabled={savingDetalle || opcionesProducto.length === 0}
                        required
                      >
                        <option value="">
                          {opcionesProducto.length === 0 ? 'Cargando productos...' : 'Seleccione un producto real'}
                        </option>
                        {opcionesProducto.map((item) => (
                          <option key={item.cod_producto} value={String(item.cod_producto)}>
                            {item.codigo_producto} - {item.nombre_producto}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Cod. Ubicacion *</label>
                      <select
                        className="form-select"
                        value={formDetalle.cod_ubicacion}
                        onChange={(event) => setFormDetalle((prev) => ({ ...prev, cod_ubicacion: event.target.value }))}
                        disabled={savingDetalle || loadingUbicaciones || opcionesUbicacion.length === 0}
                        required
                      >
                        <option value="">
                          {loadingUbicaciones ? 'Cargando ubicaciones...' : 'Seleccione una ubicacion activa'}
                        </option>
                        {opcionesUbicacion.map((item) => (
                          <option key={item.cod_ubicacion} value={String(item.cod_ubicacion)}>
                            {formatearEtiquetaUbicacion(item)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Stock fisico *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-control"
                        placeholder="Ej: 18"
                        value={formDetalle.stock_fisico}
                        onChange={(event) => setFormDetalle((prev) => ({ ...prev, stock_fisico: event.target.value }))}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Observaciones (opcional)</label>
                      <textarea
                        rows="3"
                        maxLength={500}
                        className="form-control"
                        placeholder="Detalle del conteo por ubicacion"
                        value={formDetalle.observaciones}
                        onChange={(event) => setFormDetalle((prev) => ({ ...prev, observaciones: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalDetalleAbierto(false)}
                    disabled={savingDetalle}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn jyr-btn-primary" disabled={savingDetalle}>
                    {savingDetalle ? 'Guardando...' : 'Guardar detalle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalCierreAbierto && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingCierre) setModalCierreAbierto(false);
        }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Cerrar conteo #{conteoActivo?.cod_conteo}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalCierreAbierto(false)}
                  disabled={savingCierre}
                />
              </div>
              <form onSubmit={cerrarConteo}>
                <div className="modal-body">
                  <p className="mb-2">
                    Se aplicaran ajustes de inventario segun las diferencias capturadas en este conteo.
                  </p>
                  <label className="form-label">Observaciones de cierre (opcional)</label>
                  <textarea
                    rows="3"
                    maxLength={500}
                    className="form-control"
                    placeholder="Cierre validado por administracion"
                    value={observacionesCierre}
                    onChange={(event) => setObservacionesCierre(event.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalCierreAbierto(false)}
                    disabled={savingCierre}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={savingCierre}>
                    {savingCierre ? 'Cerrando...' : 'Cerrar conteo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InventarioConteosPage;
