import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { inventarioConteosApi } from './inventarioConteos.api.js';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import ConteosHeader from './ConteosHeader.jsx';
import ConteosFiltrosCard from './ConteosFiltrosCard.jsx';
import ConteosTablaCard from './ConteosTablaCard.jsx';
import ConteoSeleccionadoPanel from './ConteoSeleccionadoPanel.jsx';
import ConteosDetallesCard from './ConteosDetallesCard.jsx';
import { ConteoAperturaModal, ConteoCierreModal, ConteoDetalleModal } from './ConteosModals.jsx';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';
import BootstrapPagination from '../common/BootstrapPagination.jsx';

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

  const actualizarFormDetalle = (campo, valor) => {
    setFormDetalle((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const inicioConteos = meta.total > 0 ? ((meta.pagina - 1) * meta.limite) + 1 : 0;
  const finConteos = meta.total > 0 ? Math.min(meta.pagina * meta.limite, meta.total) : 0;

  const inicioDetalles = metaDetalles.total > 0 ? ((metaDetalles.pagina - 1) * metaDetalles.limite) + 1 : 0;
  const finDetalles = metaDetalles.total > 0 ? Math.min(metaDetalles.pagina * metaDetalles.limite, metaDetalles.total) : 0;

  return (
    <section className="kdx-shell mt-4">
      <ConteosHeader
        total={meta.total}
        onNuevoConteo={() => setModalAperturaAbierto(true)}
      />

      <ConteosFiltrosCard
        success={success}
        error={error}
        filtros={filtros}
        loading={loadingConteos}
        onChange={manejarCambioFiltro}
        onAplicar={aplicarFiltros}
        onLimpiar={limpiarFiltros}
      />

      <ConteosTablaCard
        inicioConteos={inicioConteos}
        finConteos={finConteos}
        total={meta.total}
        filas={conteos}
        loading={loadingConteos}
        conteoActivoId={Number(conteoActivo?.cod_conteo || 0)}
        onSeleccionar={seleccionarConteo}
      />

      <BootstrapPagination
        pagina={meta.pagina}
        totalPaginas={meta.totalPaginas}
        onChange={cambiarPaginaConteos}
        loading={loadingConteos}
      />

      {conteoActivo?.cod_conteo && (
        <>
          <ConteoSeleccionadoPanel
            conteoActivo={conteoActivo}
            formatearFecha={formatearFecha}
            metaDetalles={metaDetalles}
            resumenDiferencias={resumenDiferencias}
            conteoAbierto={conteoAbierto}
            resumenCierre={resumenCierre}
            onCapturarDetalle={() => setModalDetalleAbierto(true)}
            onCerrarConteo={() => setModalCierreAbierto(true)}
          />

          <ConteosDetallesCard
            inicioDetalles={inicioDetalles}
            finDetalles={finDetalles}
            total={metaDetalles.total}
            filas={detalles}
            loading={loadingDetalles}
          />

          <BootstrapPagination
            pagina={metaDetalles.pagina}
            totalPaginas={metaDetalles.totalPaginas}
            onChange={cambiarPaginaDetalles}
            loading={loadingDetalles}
          />
        </>
      )}

      <ConteoAperturaModal
        abierto={modalAperturaAbierto}
        saving={savingApertura}
        observaciones={observacionesApertura}
        onClose={() => setModalAperturaAbierto(false)}
        onChangeObservaciones={setObservacionesApertura}
        onSubmit={abrirConteo}
      />

      <ConteoDetalleModal
        abierto={modalDetalleAbierto}
        saving={savingDetalle}
        conteoId={conteoActivo?.cod_conteo}
        formDetalle={formDetalle}
        opcionesProducto={opcionesProducto}
        opcionesUbicacion={opcionesUbicacion}
        loadingUbicaciones={loadingUbicaciones}
        formatearEtiquetaUbicacion={formatearEtiquetaUbicacion}
        onClose={() => setModalDetalleAbierto(false)}
        onChangeFormDetalle={actualizarFormDetalle}
        onSubmit={registrarDetalle}
      />

      <ConteoCierreModal
        abierto={modalCierreAbierto}
        saving={savingCierre}
        conteoId={conteoActivo?.cod_conteo}
        observaciones={observacionesCierre}
        onClose={() => setModalCierreAbierto(false)}
        onChangeObservaciones={setObservacionesCierre}
        onSubmit={cerrarConteo}
      />
    </section>
  );
};

export default InventarioConteosPage;
