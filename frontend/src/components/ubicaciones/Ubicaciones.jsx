import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BootstrapPagination from '../common/BootstrapPagination.jsx';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { productoService, ubicacionService } from '../../services/serviceIndex.js';
import { confirmDialog } from '../../utils/notifications.js';
import UbicacionesHeader from './UbicacionesHeader.jsx';
import UbicacionesFiltrosPanel from './UbicacionesFiltrosPanel.jsx';
import UbicacionesTablaCard from './UbicacionesTablaCard.jsx';
import UbicacionFormModal from './UbicacionFormModal.jsx';

const formularioInicial = {
  pasillo: '',
  estanteria: '',
  nivel_1: '',
  nivel_2: '',
  codigo_producto: '',
  descripcion: ''
};

const MENSAJE_DUPLICADO = 'Ya existe una ubicacion con esa combinacion fisica.';
const MENSAJE_PRODUCTOS = 'No se pudo cargar el catalogo de productos.';
const TAMANIO_PAGINA = 10;
const DEBOUNCE_BUSQUEDA_MS = 350;
const MENSAJE_BUSQUEDA_NUMERICA_INVALIDA = 'La busqueda de ubicacion solo permite texto o IDs numericos positivos.';
const esBusquedaNumericaInvalida = (valor = '') => {
  const criterio = String(valor || '').trim();
  if (!criterio) return false;
  if (/^-\d/.test(criterio)) return true;
  if (/^\d+(?:[.,]\d+)?$/.test(criterio)) {
    return !Number.isInteger(Number(criterio.replace(',', '.'))) || Number(criterio.replace(',', '.')) < 1;
  }
  return false;
};

const formatearCodigoProducto = (producto) => {
  const codigo = String(producto?.codigo_producto || '').trim().toUpperCase();
  if (codigo) return codigo;

  const id = Number(producto?.cod_producto || 0);
  if (Number.isInteger(id) && id > 0) {
    return `PROD-${String(id).padStart(4, '0')}`;
  }
  return '';
};

const extraerError = (error) => {
  if (!error?.response) {
    return 'No se pudo conectar con el backend. Verifica que este corriendo en http://localhost:5000';
  }

  const backendMessage = error?.response?.data?.message
    || error?.response?.data?.mensaje
    || 'Error al procesar la solicitud';

  if (error?.response?.status === 409) {
    const mensajeNormalizado = String(backendMessage).toLowerCase();
    if (
      mensajeNormalizado.includes('codigo/comb')
      || mensajeNormalizado.includes('codigo de producto/comb')
      || mensajeNormalizado.includes('combinacion fisica')
    ) {
      return MENSAJE_DUPLICADO;
    }
  }

  return backendMessage;
};

const normalizarRespuestaUbicaciones = (payload, fallbackLimit = TAMANIO_PAGINA) => {
  if (Array.isArray(payload)) {
    return {
      filas: payload,
      meta: {
        total: payload.length,
        page: 1,
        limit: fallbackLimit,
        totalPages: 1
      }
    };
  }

  if (Array.isArray(payload?.data) && payload?.meta) {
    return {
      filas: payload.data,
      meta: {
        total: Number(payload.meta.total || 0),
        page: Number(payload.meta.page || 1),
        limit: Number(payload.meta.limit || fallbackLimit),
        totalPages: Number(payload.meta.totalPages || 1)
      }
    };
  }

  return {
    filas: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      total: Number(payload?.total || (Array.isArray(payload?.data) ? payload.data.length : 0)),
      page: Number(payload?.page || 1),
      limit: Number(payload?.limit || fallbackLimit),
      totalPages: Number(payload?.totalPages || 1)
    }
  };
};

const normalizarBusqueda = (valor = '') => String(valor || '').trim().replace(/\s+/g, ' ');

const Ubicaciones = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const confirm = useConfirm();
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    includeInactive: false,
    search: ''
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: TAMANIO_PAGINA,
    totalPages: 1
  });
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [productos, setProductos] = useState([]);

  const cargarUbicaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await ubicacionService.listar({
        includeInactive: filtrosAplicados.includeInactive ? 'true' : 'false',
        search: filtrosAplicados.search || undefined,
        page: paginaActual,
        limit: TAMANIO_PAGINA
      });
      const normalizado = normalizarRespuestaUbicaciones(data?.data, TAMANIO_PAGINA);
      setUbicaciones(normalizado.filas);
      setMeta(normalizado.meta);
    } catch (err) {
      setUbicaciones([]);
      setMeta({ total: 0, page: 1, limit: TAMANIO_PAGINA, totalPages: 1 });
      setError(extraerError(err));
    } finally {
      setLoading(false);
    }
  }, [filtrosAplicados.includeInactive, filtrosAplicados.search, paginaActual]);

  useEffect(() => {
    cargarUbicaciones();
  }, [cargarUbicaciones]);

  const cargarProductos = useCallback(async () => {
    try {
      setLoadingProductos(true);
      const { data } = await productoService.listar();
      const lista = Array.isArray(data?.data) ? data.data : [];

      const productosActivos = lista
        .filter((item) => String(item?.estado_producto || '').toLowerCase() === 'activo')
        .map((item) => ({
          cod_producto: item.cod_producto,
          nombre_producto: item.nombre_producto || 'Sin nombre',
          codigo_producto: formatearCodigoProducto(item)
        }))
        .filter((item) => item.codigo_producto);

      setProductos(productosActivos);
    } catch (err) {
      setProductos([]);
      setError((prev) => prev || MENSAJE_PRODUCTOS);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const totalUbicaciones = Number(meta.total || 0);
  const totalPaginas = Number(meta.totalPages || 1);
  const totalActivas = useMemo(
    () => ubicaciones.filter((item) => item.estado_ubi === 'ACTIVA').length,
    [ubicaciones]
  );
  const inicioMostrado = totalUbicaciones > 0
    ? ((meta.page - 1) * meta.limit) + 1
    : 0;
  const finMostrado = totalUbicaciones > 0
    ? Math.min(meta.page * meta.limit, totalUbicaciones)
    : 0;

  const opcionesProducto = useMemo(() => {
    if (!form.codigo_producto) return productos;
    const existe = productos.some((item) => item.codigo_producto === form.codigo_producto);
    if (existe) return productos;

    return [
      {
        cod_producto: `legacy-${form.codigo_producto}`,
        nombre_producto: 'Codigo actual (legacy)',
        codigo_producto: form.codigo_producto
      },
      ...productos
    ];
  }, [form.codigo_producto, productos]);

  useEffect(() => {
    setPaginaActual((prev) => Math.min(Math.max(prev, 1), totalPaginas || 1));
  }, [totalPaginas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const criterio = normalizarBusqueda(searchInput);
      setFiltrosAplicados((prev) => {
        if (prev.search === criterio) return prev;
        return {
          ...prev,
          search: criterio
        };
      });
      setPaginaActual(1);
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(formularioInicial);
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (ubicacion) => {
    setEditandoId(ubicacion.cod_ubicacion);
    setForm({
      pasillo: ubicacion.pasillo || '',
      estanteria: ubicacion.estanteria || '',
      nivel_1: ubicacion.nivel_1 || '',
      nivel_2: ubicacion.nivel_2 || '',
      codigo_producto: ubicacion.codigo_producto || '',
      descripcion: ubicacion.descripcion || ''
    });
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (saving) return;
    setModalAbierto(false);
  };

  const guardar = async (event) => {
    event.preventDefault();

    const payload = {
      pasillo: form.pasillo,
      estanteria: form.estanteria,
      nivel_1: form.nivel_1,
      nivel_2: form.nivel_2 || null,
      codigo_producto: form.codigo_producto,
      descripcion: form.descripcion || null
    };

    try {
      setSaving(true);
      setError('');

      if (editandoId) {
        await ubicacionService.actualizar(editandoId, payload);
      } else {
        await ubicacionService.crear(payload);
      }

      setModalAbierto(false);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (id) => {
    const confirmado = await confirmDialog({
      variant: 'deactivate',
      title: 'Desactivar ubicacion',
      text: 'Estas seguro de desactivar esta ubicacion?',
      confirmText: 'Si, desactivar'
    });
    if (!confirmado) return;

    try {
      setError('');
      await ubicacionService.desactivar(id);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    }
  };

  const reactivar = async (id) => {
    const confirmado = await confirm({
      title: 'Reactivar ubicacion',
      message: 'Estas seguro de reactivar esta ubicacion?',
      confirmText: 'Reactivar',
      tone: 'default'
    });
    if (!confirmado) return;

    try {
      setError('');
      await ubicacionService.reactivar(id);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    }
  };

  const eliminar = async (id) => {
    const confirmado = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar ubicacion',
      text: 'Estas seguro de eliminar permanentemente esta ubicacion?',
      confirmText: 'Si, eliminar'
    });
    if (!confirmado) return;

    try {
      setError('');
      await ubicacionService.eliminar(id);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    }
  };

  const manejarToggleInactivas = (checked) => {
    setError('');
    setIncludeInactive(checked);
    setPaginaActual(1);
    setFiltrosAplicados((prev) => ({
      ...prev,
      includeInactive: checked,
      search: normalizarBusqueda(searchInput)
    }));
  };

  const manejarCambioBusqueda = (valor) => {
    if (esBusquedaNumericaInvalida(valor)) {
      setError(MENSAJE_BUSQUEDA_NUMERICA_INVALIDA);
      return;
    }

    setError('');
    setSearchInput(valor);
  };

  const limpiarBusqueda = () => {
    setSearchInput('');
    setPaginaActual(1);
    setFiltrosAplicados((prev) => ({
      ...prev,
      search: ''
    }));
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPaginaActual(nuevaPagina);
  };

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const toggleEstado = async (ubicacion) => {
    if (ubicacion.estado_ubi === 'ACTIVA') {
      await desactivar(ubicacion.cod_ubicacion);
      return;
    }
    await reactivar(ubicacion.cod_ubicacion);
  };

  const exportarPdf = async () => {
    try {
      setExportandoPdf(true);
      setError('');

      const { data } = await ubicacionService.exportarPdf({
        includeInactive: filtrosAplicados.includeInactive ? 'true' : 'false',
        search: filtrosAplicados.search || undefined
      });

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reporte-ubicaciones.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <section className="kdx-shell mt-4">
      <UbicacionesHeader
        totalUbicaciones={totalUbicaciones}
        onNuevaUbicacion={abrirCrear}
        onExportarPdf={exportarPdf}
        exportandoPdf={exportandoPdf}
      />

      <UbicacionesFiltrosPanel
        error={error}
        searchValue={searchInput}
        includeInactive={includeInactive}
        totalActivas={totalActivas}
        totalInactivas={Math.max(totalUbicaciones - totalActivas, 0)}
        onCloseError={() => setError('')}
        onSearchChange={manejarCambioBusqueda}
        onClearSearch={limpiarBusqueda}
        onToggleInactivas={manejarToggleInactivas}
      />

      <UbicacionesTablaCard
        inicioMostrado={inicioMostrado}
        finMostrado={finMostrado}
        totalUbicaciones={totalUbicaciones}
        loading={loading}
        ubicaciones={ubicaciones}
        onEditar={abrirEditar}
        onToggleEstado={toggleEstado}
        onEliminar={eliminar}
      />

      <BootstrapPagination
        pagina={meta.page}
        totalPaginas={totalPaginas}
        onChange={cambiarPagina}
        loading={loading}
      />

      <UbicacionFormModal
        abierto={modalAbierto}
        editandoId={editandoId}
        saving={saving}
        loadingProductos={loadingProductos}
        form={form}
        opcionesProducto={opcionesProducto}
        onClose={cerrarModal}
        onChange={actualizarForm}
        onSubmit={guardar}
      />
    </section>
  );
};

export default Ubicaciones;
