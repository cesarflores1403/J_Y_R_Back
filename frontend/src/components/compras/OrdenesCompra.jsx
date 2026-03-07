import React, { useState, useEffect, useCallback } from 'react';
import { comprasService, proveedorService, facturaService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiEye, FiShoppingCart,
  FiChevronLeft, FiChevronRight, FiTrash2, FiCheck, FiEdit2
} from 'react-icons/fi';

const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-HN') : '-';
const fmtMoneda = (v, m = 'HNL') =>
  `${m} ${parseFloat(v || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
const fmtOC = (id) => `OC-${String(id).padStart(4, '0')}`;

const BADGE_ESTADO = {
  'Pendiente':   'bg-warning text-dark',
  'Aprobada':    'bg-primary',
  'En Tránsito': 'bg-info text-dark',
  'Recibida':    'bg-success',
  'Cancelada':   'bg-danger',
};

// ─── Modal Ver Detalle ──────────────────────────────────────
const ModalDetalle = ({ orden, onClose }) => (
  <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <div className="modal-dialog modal-xl">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            <FiShoppingCart className="me-2" />
            {fmtOC(orden.cod_orden_compra)} — {orden.nombre_proveedor}
          </h5>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <small className="text-muted d-block">Fecha</small>
              <strong>{fmtFecha(orden.fecha)}</strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Estado</small>
              <span className={`badge ${BADGE_ESTADO[orden.estado] || 'bg-secondary'}`}>
                {orden.estado}
              </span>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Moneda</small>
              <strong>{orden.moneda}</strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Total</small>
              <strong>{fmtMoneda(orden.total, orden.moneda)}</strong>
            </div>
            {orden.observaciones && (
              <div className="col-12">
                <small className="text-muted d-block">Observaciones</small>
                {orden.observaciones}
              </div>
            )}
          </div>
          <h6 className="fw-semibold mb-2">Productos</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cantidad</th>
                  <th className="text-end">Precio Unit.</th>
                  <th className="text-end">ISV</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(orden.detalles || []).map((d) => (
                  <tr key={d.cod_detalle_oc}>
                    <td>{d.nombre_producto}</td>
                    <td className="text-center">{d.cantidad}</td>
                    <td className="text-end">{fmtMoneda(d.precio, orden.moneda)}</td>
                    <td className="text-end">{fmtMoneda(d.isv, orden.moneda)}</td>
                    <td className="text-end"><strong>{fmtMoneda(d.subtotal, orden.moneda)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-end fw-bold">Total</td>
                  <td className="text-end fw-bold">{fmtMoneda(orden.total, orden.moneda)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Modal Editar Orden ─────────────────────────────────────
const ModalEditarOrden = ({ orden, onClose, onGuardar }) => {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [prodSeleccionado, setProdSeleccionado] = useState('');
  const [form, setForm] = useState({
    cod_proveedor: orden.cod_proveedor || '',
    moneda: orden.moneda || 'HNL',
    observaciones: orden.observaciones || ''
  });
  const [lineas, setLineas] = useState(
    (orden.detalles || []).map(d => ({
      cod_producto: d.cod_producto,
      nombre_producto: d.nombre_producto,
      cantidad: d.cantidad,
      precio: parseFloat(d.precio),
      isv: parseFloat(d.isv),
      subtotal: parseFloat(d.subtotal)
    }))
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    proveedorService.listar({ limite: 200 })
      .then(r => { if (r.data.ok) setProveedores(r.data.datos); })
      .catch(() => {});
    facturaService.productosDisponibles({ buscar: '' })
      .then(r => { if (r.data.ok) setProductos(r.data.datos || []); })
      .catch(() => {});
  }, []);

  const agregarProducto = (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    const prod = productos.find(p => p.cod_producto === id);
    if (!prod) return;
    if (lineas.find(l => l.cod_producto === id)) return toast.warning('El producto ya está en la lista');
    const precio = parseFloat(prod.precio_venta || 0);
    const montoIsv = parseFloat((precio * parseFloat(prod.isv || 0) / 100).toFixed(2));
    setLineas(prev => [...prev, {
      cod_producto: prod.cod_producto,
      nombre_producto: prod.nombre_producto,
      cantidad: 1, precio, isv: montoIsv,
      subtotal: parseFloat((precio + montoIsv).toFixed(2))
    }]);
    setProdSeleccionado('');
  };

  const actualizarLinea = (idx, campo, valor) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const u = { ...l, [campo]: valor };
      u.subtotal = parseFloat(((parseFloat(u.precio || 0) + parseFloat(u.isv || 0)) * parseInt(u.cantidad || 1)).toFixed(2));
      return u;
    }));
  };

  const eliminarLinea = (idx) => setLineas(prev => prev.filter((_, i) => i !== idx));
  const total = lineas.reduce((s, l) => s + parseFloat(l.subtotal || 0), 0);
  const productosDisponibles = productos.filter(p => !lineas.find(l => l.cod_producto === p.cod_producto));

  const guardar = async () => {
    if (!form.cod_proveedor) return toast.warning('Selecciona un proveedor');
    if (lineas.length === 0) return toast.warning('Agrega al menos un producto');
    setGuardando(true);
    try { await onGuardar({ ...form, detalles: lineas }); }
    finally { setGuardando(false); }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title"><FiEdit2 className="me-2" />Editar {fmtOC(orden.cod_orden_compra)}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3 mb-4">
              <div className="col-md-5">
                <label className="form-label">Proveedor *</label>
                <select className="form-select" value={form.cod_proveedor}
                  onChange={(e) => setForm({ ...form, cod_proveedor: e.target.value })}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.cod_proveedor} value={p.cod_proveedor}>{p.nombre_proveedor}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Moneda</label>
                <select className="form-select" value={form.moneda}
                  onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
                  <option value="HNL">HNL</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label">Observaciones</label>
                <input type="text" className="form-control" value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas adicionales..." />
              </div>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-md-8">
                <label className="form-label fw-semibold">Agregar producto</label>
                <select className="form-select" value={prodSeleccionado} onChange={agregarProducto}>
                  <option value="">-- Seleccionar producto --</option>
                  {productosDisponibles.map(p => (
                    <option key={p.cod_producto} value={p.cod_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center" style={{ width: 90 }}>Cant.</th>
                    <th className="text-end" style={{ width: 140 }}>Precio unit.</th>
                    <th className="text-end" style={{ width: 120 }}>ISV</th>
                    <th className="text-end" style={{ width: 140 }}>Subtotal</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-muted py-3">Selecciona productos del desplegable</td></tr>
                  ) : lineas.map((l, i) => (
                    <tr key={l.cod_producto}>
                      <td className="align-middle">{l.nombre_producto}</td>
                      <td><input type="number" className="form-control form-control-sm text-center" min={1} value={l.cantidad} onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-end" min={0} step="0.01" value={l.precio} onChange={(e) => actualizarLinea(i, 'precio', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-end" min={0} step="0.01" value={l.isv} onChange={(e) => actualizarLinea(i, 'isv', e.target.value)} /></td>
                      <td className="text-end align-middle"><strong>{fmtMoneda(l.subtotal, form.moneda)}</strong></td>
                      <td className="text-center align-middle">
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarLinea(i)}><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {lineas.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-end fw-bold">Total</td>
                      <td className="text-end fw-bold">{fmtMoneda(total, form.moneda)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn jyr-btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Nueva Orden ──────────────────────────────────────
const ModalNuevaOrden = ({ onClose, onGuardar }) => {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [prodSeleccionado, setProdSeleccionado] = useState('');
  const [form, setForm] = useState({ cod_proveedor: '', moneda: 'HNL', observaciones: '' });
  const [lineas, setLineas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    proveedorService.listar({ limite: 200 })
      .then(r => { if (r.data.ok) setProveedores(r.data.datos); })
      .catch(() => {});
    facturaService.productosDisponibles({ buscar: '' })
      .then(r => { if (r.data.ok) setProductos(r.data.datos || []); })
      .catch(() => {});
  }, []);

  const agregarProducto = (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    const prod = productos.find(p => p.cod_producto === id);
    if (!prod) return;
    if (lineas.find(l => l.cod_producto === id)) return toast.warning('El producto ya está en la lista');
    const precio = parseFloat(prod.precio_venta || 0);
    const montoIsv = parseFloat((precio * parseFloat(prod.isv || 0) / 100).toFixed(2));
    setLineas(prev => [...prev, {
      cod_producto: prod.cod_producto,
      nombre_producto: prod.nombre_producto,
      cantidad: 1, precio, isv: montoIsv,
      subtotal: parseFloat((precio + montoIsv).toFixed(2))
    }]);
    setProdSeleccionado('');
  };

  const actualizarLinea = (idx, campo, valor) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const u = { ...l, [campo]: valor };
      u.subtotal = parseFloat(((parseFloat(u.precio || 0) + parseFloat(u.isv || 0)) * parseInt(u.cantidad || 1)).toFixed(2));
      return u;
    }));
  };

  const eliminarLinea = (idx) => setLineas(prev => prev.filter((_, i) => i !== idx));
  const total = lineas.reduce((s, l) => s + parseFloat(l.subtotal || 0), 0);
  const productosDisponibles = productos.filter(p => !lineas.find(l => l.cod_producto === p.cod_producto));

  const guardar = async () => {
    if (!form.cod_proveedor) return toast.warning('Selecciona un proveedor');
    if (lineas.length === 0) return toast.warning('Agrega al menos un producto');
    setGuardando(true);
    try { await onGuardar({ ...form, detalles: lineas }); }
    finally { setGuardando(false); }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title"><FiPlus className="me-2" />Nueva Orden de Compra</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3 mb-4">
              <div className="col-md-5">
                <label className="form-label">Proveedor *</label>
                <select className="form-select" value={form.cod_proveedor}
                  onChange={(e) => setForm({ ...form, cod_proveedor: e.target.value })}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.cod_proveedor} value={p.cod_proveedor}>{p.nombre_proveedor}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Moneda</label>
                <select className="form-select" value={form.moneda}
                  onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
                  <option value="HNL">HNL</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label">Observaciones</label>
                <input type="text" className="form-control" value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas adicionales..." />
              </div>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-md-8">
                <label className="form-label fw-semibold">Agregar producto</label>
                <select className="form-select" value={prodSeleccionado} onChange={agregarProducto}>
                  <option value="">-- Seleccionar producto --</option>
                  {productosDisponibles.map(p => (
                    <option key={p.cod_producto} value={p.cod_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center" style={{ width: 90 }}>Cant.</th>
                    <th className="text-end" style={{ width: 140 }}>Precio unit.</th>
                    <th className="text-end" style={{ width: 120 }}>ISV</th>
                    <th className="text-end" style={{ width: 140 }}>Subtotal</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-muted py-3">Selecciona productos del desplegable para agregarlos</td></tr>
                  ) : lineas.map((l, i) => (
                    <tr key={l.cod_producto}>
                      <td className="align-middle">{l.nombre_producto}</td>
                      <td><input type="number" className="form-control form-control-sm text-center" min={1} value={l.cantidad} onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-end" min={0} step="0.01" value={l.precio} onChange={(e) => actualizarLinea(i, 'precio', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-end" min={0} step="0.01" value={l.isv} onChange={(e) => actualizarLinea(i, 'isv', e.target.value)} /></td>
                      <td className="text-end align-middle"><strong>{fmtMoneda(l.subtotal, form.moneda)}</strong></td>
                      <td className="text-center align-middle">
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarLinea(i)}><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {lineas.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-end fw-bold">Total</td>
                      <td className="text-end fw-bold">{fmtMoneda(total, form.moneda)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn jyr-btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Crear Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Componente Principal ───────────────────────────────────
const OrdenesCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [estados, setEstados] = useState([]);
  const [modalNueva, setModalNueva] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [ordenEditar, setOrdenEditar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await comprasService.listar({ pagina, limite: 15, buscar, estado: filtroEstado });
      if (data.ok) {
        setOrdenes(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch { toast.error('Error al cargar órdenes de compra'); }
    finally { setCargando(false); }
  }, [pagina, buscar, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    comprasService.listarEstados()
      .then(r => { if (r.data.ok) setEstados(r.data.datos); })
      .catch(() => {});
  }, []);

  const verDetalle = async (id) => {
    try {
      const { data } = await comprasService.obtener(id);
      if (data.ok) setOrdenDetalle(data.datos);
    } catch { toast.error('Error al cargar la orden'); }
  };

  const verEditar = async (id) => {
    try {
      const { data } = await comprasService.obtener(id);
      if (data.ok) setOrdenEditar(data.datos);
    } catch { toast.error('Error al cargar la orden'); }
  };

  const aprobarOrden = async (id) => {
    try {
      await comprasService.cambiarEstado(id, { cod_estado_oc: 2, observaciones: 'Orden aprobada' });
      toast.success('Orden aprobada correctamente');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al aprobar la orden');
    }
  };

  const cancelarOrden = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.')) return;
    try {
      await comprasService.cambiarEstado(id, { cod_estado_oc: 5, observaciones: 'Orden cancelada' });
      toast.success('Orden cancelada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cancelar la orden');
    }
  };

  const eliminarOrden = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta orden? Esta acción es permanente y no se puede deshacer.')) return;
    try {
      await comprasService.eliminar(id);
      toast.success('Orden eliminada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar la orden');
    }
  };

  const handleCrear = async (datos) => {
    try {
      await comprasService.crear(datos);
      toast.success('Orden de compra creada correctamente');
      setModalNueva(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear la orden');
      throw err;
    }
  };

  const handleEditar = async (datos) => {
    try {
      await comprasService.cambiarEstado(ordenEditar.cod_orden_compra, {
        cod_estado_oc: 5,
        observaciones: 'Reemplazada por edición'
      });
      await comprasService.crear(datos);
      toast.success('Orden actualizada correctamente');
      setOrdenEditar(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al editar la orden');
      throw err;
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Órdenes de Compra</h3>
        <button className="btn jyr-btn-primary" onClick={() => setModalNueva(true)}>
          <FiPlus className="me-2" />Nueva Orden
        </button>
      </div>

      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="row g-2">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text"><FiSearch /></span>
                <input type="text" className="form-control" placeholder="Buscar por proveedor..."
                  value={buscar}
                  onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
                {buscar && (
                  <button className="btn btn-outline-secondary"
                    onClick={() => { setBuscar(''); setPagina(1); }}>
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filtroEstado}
                onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
                <option value="">Todos los estados</option>
                <option value="1">Pendiente</option>
                <option value="2">Aprobada</option>
                <option value="5">Cancelada</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Nº Orden</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Moneda</th>
                  <th className="text-end">Total</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="8" className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" />
                  </td></tr>
                ) : ordenes.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">
                    No se encontraron órdenes de compra
                  </td></tr>
                ) : ordenes.map((o) => (
                  <tr key={o.cod_orden_compra}>
                    <td><strong>{fmtOC(o.cod_orden_compra)}</strong></td>
                    <td>{o.nombre_proveedor}</td>
                    <td>{fmtFecha(o.fecha)}</td>
                    <td>{o.moneda}</td>
                    <td className="text-end">{fmtMoneda(o.total, o.moneda)}</td>
                    <td>
                      <span className={`badge ${BADGE_ESTADO[o.estado] || 'bg-secondary'}`}>
                        {o.estado}
                      </span>
                    </td>
                    <td>{o.nombre_usuario}</td>
                    <td className="text-center">
                      {/* Ver */}
                      <button className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => verDetalle(o.cod_orden_compra)} title="Ver detalle">
                        <FiEye />
                      </button>
                      {/* Editar — siempre */}
                      <button className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => verEditar(o.cod_orden_compra)} title="Editar">
                        <FiEdit2 />
                      </button>
                      {/* Aprobar — solo Pendiente */}
                      {o.estado === 'Pendiente' && (
                        <button className="btn btn-sm btn-outline-success me-1"
                          onClick={() => aprobarOrden(o.cod_orden_compra)} title="Aprobar">
                          <FiCheck />
                        </button>
                      )}
                      {/* Cancelar (X) — no en Recibida ni Cancelada */}
                      {!['Recibida', 'Cancelada'].includes(o.estado) && (
                        <button className="btn btn-sm btn-outline-danger me-1"
                          onClick={() => cancelarOrden(o.cod_orden_compra)} title="Cancelar orden">
                          <FiX />
                        </button>
                      )}
                      {/* Eliminar — solo Cancelada */}
                      {o.estado === 'Cancelada' && (
                        <button className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminarOrden(o.cod_orden_compra)} title="Eliminar">
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p - 1)}>Anterior</button>
              </li>
              {[...Array(totalPaginas)].map((_, i) => (
                <li key={i} className={`page-item ${pagina === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPagina(i + 1)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${pagina >= totalPaginas ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p + 1)}>Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {modalNueva && (
        <ModalNuevaOrden onClose={() => setModalNueva(false)} onGuardar={handleCrear} />
      )}
      {ordenDetalle && (
        <ModalDetalle orden={ordenDetalle} onClose={() => setOrdenDetalle(null)} />
      )}
      {ordenEditar && (
        <ModalEditarOrden
          orden={ordenEditar}
          onClose={() => setOrdenEditar(null)}
          onGuardar={handleEditar}
        />
      )}
    </div>
  );
};

export default OrdenesCompra;