import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiDatabase,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiRotateCw,
  FiToggleRight,
  FiTrash2
} from 'react-icons/fi';
import Alert from '../common/Alert.jsx';
import BootstrapPagination from '../common/BootstrapPagination.jsx';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { productoService, ubicacionService } from '../../services/serviceIndex.js';
import { confirmDialog } from '../../utils/notifications.js';

const formularioInicial = {
  pasillo: '',
  estanteria: '',
  nivel_1: '',
  nivel_2: '',
  codigo_producto: '',
  descripcion: ''
};

const MENSAJE_DUPLICADO = 'Ya existe una ubicación con esa combinación física.';
const MENSAJE_PRODUCTOS = 'No se pudo cargar el catálogo de productos.';
const TAMANIO_PAGINA = 10;

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
    return 'No se pudo conectar con el backend. Verifica que esté corriendo en http://localhost:5000';
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

const Ubicaciones = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const confirm = useConfirm();
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState({ includeInactive: false });
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
  }, [filtrosAplicados.includeInactive, paginaActual]);

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
        nombre_producto: 'Código actual (legacy)',
        codigo_producto: form.codigo_producto
      },
      ...productos
    ];
  }, [form.codigo_producto, productos]);

  useEffect(() => {
    setPaginaActual((prev) => Math.min(Math.max(prev, 1), totalPaginas || 1));
  }, [totalPaginas]);

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
      title: 'Desactivar ubicación',
      text: '¿Está seguro de desactivar esta ubicación?',
      confirmText: 'Sí, desactivar'
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
      title: 'Reactivar ubicación',
      message: '¿Está seguro de reactivar esta ubicación?',
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
      title: 'Eliminar ubicación',
      text: '¿Está seguro de eliminar permanentemente esta ubicación?',
      confirmText: 'Sí, eliminar'
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
    setFiltrosAplicados({ includeInactive: checked });
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPaginaActual(nuevaPagina);
  };

  return (
    <section className="kdx-shell mt-4">
      <div className="kdx-hero">
        <div className="kdx-hero-head">
          <div className="kdx-title-wrap">
            <div className="kdx-title-icon">
              <FiMapPin />
            </div>
            <div>
              <h5 className="mb-0">Ubicaciones</h5>
              <p className="kdx-subtitle mb-0">
                Catálogo de posiciones físicas para entradas, salidas, transferencias y reservas.
              </p>
            </div>
          </div>

          <div className="ubi-hero-actions">
            <div className="kdx-mini-kpi">
              <span className="kdx-mini-kpi-label">Total</span>
              <strong>{totalUbicaciones}</strong>
            </div>
            <button type="button" className="btn kdx-btn kdx-btn-accent" onClick={abrirCrear}>
              <FiPlus className="me-1" />
              Nueva ubicación
            </button>
          </div>
        </div>
      </div>

      <div className="jyr-card kdx-filtros-card">
        <div className="jyr-card-body">
          <Alert type="danger" message={error} onClose={() => setError('')} />

          <div className="kdx-filters-form">
            <div className="kdx-filters-topbar mb-3">
              <div className="kdx-filters-topbar-left">
                <span className="kdx-filters-chip">Filtros de búsqueda</span>
              </div>
            </div>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label mb-1 kdx-label">Estado de ubicaciones</label>
                <div className="form-check form-switch ubi-switch-wrap">
                  <input
                    id="includeInactive"
                    className="form-check-input"
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => manejarToggleInactivas(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includeInactive">
                    Incluir inactivas
                  </label>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label mb-1 kdx-label">Activas visibles</label>
                <input type="text" readOnly className="form-control kdx-control" value={totalActivas} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label mb-1 kdx-label">Inactivas visibles</label>
                <input
                  type="text"
                  readOnly
                  className="form-control kdx-control"
                  value={Math.max(totalUbicaciones - totalActivas, 0)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="jyr-card mt-3 kdx-table-card">
        <div className="kdx-table-topbar">
          <div className="kdx-table-topbar-left">
            <FiDatabase />
            <span>Ubicaciones registradas</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioMostrado}-{finMostrado} de {totalUbicaciones}
          </div>
        </div>

        <div className="jyr-card-body p-0">
          <div className="table-responsive kdx-table-wrapper">
            <table className="table table-hover mb-0 kdx-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código de producto</th>
                  <th>Pasillo</th>
                  <th>Estantería</th>
                  <th>Nivel 1</th>
                  <th>Nivel 2</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm me-2" />
                      Cargando ubicaciones...
                    </td>
                  </tr>
                ) : totalUbicaciones === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-4">
                      No hay ubicaciones registradas
                    </td>
                  </tr>
                ) : (
                  ubicaciones.map((item) => (
                    <tr key={item.cod_ubicacion}>
                      <td>{item.cod_ubicacion}</td>
                      <td>{item.codigo_producto || '-'}</td>
                      <td>{item.pasillo || '-'}</td>
                      <td>{item.estanteria || '-'}</td>
                      <td>{item.nivel_1 || '-'}</td>
                      <td>{item.nivel_2 || '-'}</td>
                      <td>{item.descripcion || '-'}</td>
                      <td>
                        <span className={`badge rounded-pill ${item.estado_ubi === 'ACTIVA' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'}`}>
                          {item.estado_ubi}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => abrirEditar(item)}
                          title="Editar"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning me-1"
                          onClick={() => (
                            item.estado_ubi === 'ACTIVA'
                              ? desactivar(item.cod_ubicacion)
                              : reactivar(item.cod_ubicacion)
                          )}
                          title={item.estado_ubi === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}
                        >
                          {item.estado_ubi === 'ACTIVA' ? <FiToggleRight /> : <FiRotateCw />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminar(item.cod_ubicacion)}
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <BootstrapPagination
        pagina={meta.page}
        totalPaginas={totalPaginas}
        onChange={cambiarPagina}
        loading={loading}
      />

      {modalAbierto && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editandoId ? 'Editar ubicación' : 'Nueva ubicación'}</h5>
                <button type="button" className="btn-close" onClick={cerrarModal} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pasillo *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.pasillo}
                        onChange={(e) => setForm({ ...form, pasillo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Estantería *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.estanteria}
                        onChange={(e) => setForm({ ...form, estanteria: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nivel 1 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nivel_1}
                        onChange={(e) => setForm({ ...form, nivel_1: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nivel 2</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nivel_2}
                        onChange={(e) => setForm({ ...form, nivel_2: e.target.value })}
                      />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Código de producto *</label>
                      <select
                        className="form-select"
                        value={form.codigo_producto}
                        onChange={(e) => setForm({ ...form, codigo_producto: e.target.value })}
                        disabled={saving || loadingProductos}
                        required
                      >
                        <option value="">
                          {loadingProductos ? 'Cargando productos...' : 'Seleccione un producto real'}
                        </option>
                        {opcionesProducto.map((item) => (
                          <option key={item.cod_producto} value={item.codigo_producto}>
                            {item.codigo_producto} - {item.nombre_producto}
                          </option>
                        ))}
                      </select>
                      <small className="text-muted">
                        Este campo se toma del catálogo real de productos.
                      </small>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Descripción</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn jyr-btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Guardando...
                      </>
                    ) : (
                      editandoId ? 'Actualizar' : 'Crear'
                    )}
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

export default Ubicaciones;

