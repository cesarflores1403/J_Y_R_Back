import React, { useState, useEffect, useCallback, useRef } from 'react';
import { facturaService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiTrash2, FiFileText,
  FiShoppingCart, FiEye, FiXCircle
} from 'react-icons/fi';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return 'L ' + n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Facturacion = () => {
  const { usuario } = useAuth();

  // ========== LISTA FACTURAS ==========
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // ========== MODAL NUEVA FACTURA ==========
  const [modalNueva, setModalNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cliente seleccionado
  const [clientes, setClientes] = useState([]);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClientes, setShowClientes] = useState(false);

  // Productos disponibles
  const [productos, setProductos] = useState([]);
  const [buscarProducto, setBuscarProducto] = useState('');
  const [showProductos, setShowProductos] = useState(false);

  // Items de la factura
  const [items, setItems] = useState([]);

  // Método de pago
  const [metodoPago, setMetodoPago] = useState('');
  const [refPago, setRefPago] = useState('');

  // ========== MODAL VER DETALLE ==========
  const [modalDetalle, setModalDetalle] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState(null);

  const clienteRef = useRef(null);
  const productoRef = useRef(null);

  // ========== CARGAR FACTURAS ==========
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await facturaService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setFacturas(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch {
      toast.error('Error al cargar facturas');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  // ========== BUSCAR CLIENTES ==========
  useEffect(() => {
    if (!modalNueva) return;
    const timeout = setTimeout(async () => {
      try {
        const { data } = await facturaService.clientesDisponibles({ buscar: buscarCliente });
        if (data.ok) setClientes(data.datos);
      } catch { /* silencio */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscarCliente, modalNueva]);

  // ========== BUSCAR PRODUCTOS ==========
  useEffect(() => {
    if (!modalNueva) return;
    const timeout = setTimeout(async () => {
      try {
        const { data } = await facturaService.productosDisponibles({ buscar: buscarProducto });
        if (data.ok) setProductos(data.datos);
      } catch { /* silencio */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscarProducto, modalNueva]);

  // ========== SELECCIONAR CLIENTE ==========
  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setBuscarCliente(`${c.nombre} ${c.apellido || ''} ${c.dni ? '- ' + c.dni : ''}`);
    setShowClientes(false);
  };

  // ========== AGREGAR PRODUCTO A ITEMS ==========
  const agregarProducto = (p) => {
    const existe = items.find(i => i.cod_producto === p.cod_producto);
    if (existe) {
      if (existe.cantidad + 1 > p.stock) {
        toast.warn(`Stock insuficiente para "${p.nombre_producto}". Disponible: ${p.stock}`);
        return;
      }
      setItems(items.map(i =>
        i.cod_producto === p.cod_producto ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      if (p.stock < 1) {
        toast.warn(`"${p.nombre_producto}" sin stock`);
        return;
      }
      setItems([...items, {
        cod_producto: p.cod_producto,
        nombre_producto: p.nombre_producto,
        unidad_medida: p.unidad_medida,
        precio_venta: parseFloat(p.precio_venta),
        isv_pct: parseFloat(p.isv) || 0,
        stock: p.stock,
        cantidad: 1
      }]);
    }
    setBuscarProducto('');
    setShowProductos(false);
  };

  // ========== CAMBIAR CANTIDAD ==========
  const cambiarCantidad = (codProd, nuevaCant) => {
    const cant = parseInt(nuevaCant) || 0;
    setItems(items.map(i => {
      if (i.cod_producto !== codProd) return i;
      if (cant > i.stock) {
        toast.warn(`Stock máx: ${i.stock}`);
        return { ...i, cantidad: i.stock };
      }
      return { ...i, cantidad: cant < 1 ? 1 : cant };
    }));
  };

  // ========== ELIMINAR ITEM ==========
  const eliminarItem = (codProd) => {
    setItems(items.filter(i => i.cod_producto !== codProd));
  };

  // ========== CALCULAR TOTALES ==========
  const calcularTotales = () => {
    let subtotal = 0;
    let isv = 0;
    items.forEach(i => {
      const sub = i.precio_venta * i.cantidad;
      const isvItem = (i.isv_pct / 100) * sub;
      subtotal += sub;
      isv += isvItem;
    });
    return { subtotal, isv, total: subtotal + isv };
  };

  const totales = calcularTotales();

  // ========== ABRIR MODAL NUEVA FACTURA ==========
  const abrirNuevaFactura = () => {
    setClienteSeleccionado(null);
    setBuscarCliente('');
    setItems([]);
    setMetodoPago('');
    setRefPago('');
    setModalNueva(true);
  };

  // ========== GUARDAR FACTURA ==========
  const guardarFactura = async () => {
    if (!clienteSeleccionado) { toast.warn('Selecciona un cliente'); return; }
    if (items.length === 0) { toast.warn('Agrega al menos 1 producto'); return; }

    setGuardando(true);
    try {
      const payload = {
        cod_cliente: clienteSeleccionado.cod_cliente,
        metodo_pago: metodoPago ? parseInt(metodoPago) : null,
        ref_pago: refPago || null,
        items: items.map(i => ({ cod_producto: i.cod_producto, cantidad: i.cantidad }))
      };

      const { data } = await facturaService.crear(payload);
      if (data.ok) {
        toast.success(`Factura #${data.datos.cod_factura} creada exitosamente`);
        setModalNueva(false);
        cargar();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear factura');
    } finally {
      setGuardando(false);
    }
  };

  // ========== VER DETALLE ==========
  const verDetalle = async (id) => {
    try {
      const { data } = await facturaService.obtener(id);
      if (data.ok) {
        setFacturaDetalle(data.datos);
        setModalDetalle(true);
      }
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  // ========== ANULAR FACTURA ==========
  const anularFactura = async (id) => {
    if (!window.confirm('¿Está seguro de anular esta factura? Se restaurará el inventario.')) return;
    try {
      const { data } = await facturaService.anular(id);
      if (data.ok) {
        toast.success('Factura anulada');
        cargar();
        if (modalDetalle) setModalDetalle(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular');
    }
  };

  // ========== CERRAR DROPDOWNS AL CLICK FUERA ==========
  useEffect(() => {
    const handler = (e) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) setShowClientes(false);
      if (productoRef.current && !productoRef.current.contains(e.target)) setShowProductos(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      {/* ========== HEADER ========== */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0"><FiFileText className="me-2" />Facturación</h3>
        {(usuario?.rol === 'Administrador' || usuario?.rol === 'Cajero') && (
          <button className="btn jyr-btn-primary" onClick={abrirNuevaFactura}>
            <FiPlus className="me-2" />Nueva Factura
          </button>
        )}
      </div>

      {/* ========== BUSCADOR ========== */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por cliente, DNI..."
              value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
            {buscar && <button className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}><FiX /></button>}
          </div>
        </div>
      </div>

      {/* ========== TABLA FACTURAS ========== */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Subtotal</th>
                  <th>ISV</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : facturas.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No se encontraron facturas</td></tr>
                ) : facturas.map((f) => (
                  <tr key={f.cod_factura} className={!f.estado ? 'text-decoration-line-through opacity-50' : ''}>
                    <td><strong>FAC-{String(f.cod_factura).padStart(4, '0')}</strong></td>
                    <td>{f.cliente?.nombre} {f.cliente?.apellido || ''}</td>
                    <td>{formatMoney(f.subtotal)}</td>
                    <td>{formatMoney(f.isv)}</td>
                    <td><strong>{formatMoney(f.total)}</strong></td>
                    <td>
                      <span className={`badge ${f.estado ? 'bg-success' : 'bg-danger'}`}>
                        {f.estado ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => verDetalle(f.cod_factura)} title="Ver detalle">
                        <FiEye />
                      </button>
                      {f.estado && usuario?.rol === 'Administrador' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => anularFactura(f.cod_factura)} title="Anular">
                          <FiXCircle />
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

      {/* ========== PAGINACIÓN ========== */}
      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav><ul className="pagination pagination-sm">
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
          </ul></nav>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: NUEVA FACTURA                                             */}
      {/* ================================================================ */}
      {modalNueva && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><FiShoppingCart className="me-2" />Nueva Factura</h5>
                <button className="btn-close" onClick={() => setModalNueva(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">

                  {/* ---------- SELECTOR CLIENTE ---------- */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Cliente *</label>
                    <div ref={clienteRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><FiSearch /></span>
                        <input type="text" className="form-control" placeholder="Buscar cliente..."
                          value={buscarCliente}
                          onChange={(e) => { setBuscarCliente(e.target.value); setClienteSeleccionado(null); setShowClientes(true); }}
                          onFocus={() => setShowClientes(true)} />
                        {clienteSeleccionado && (
                          <button className="btn btn-outline-secondary" onClick={() => { setClienteSeleccionado(null); setBuscarCliente(''); }}>
                            <FiX />
                          </button>
                        )}
                      </div>
                      {showClientes && !clienteSeleccionado && (
                        <div className="list-group" style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          {clientes.length === 0 ? (
                            <div className="list-group-item text-muted">No se encontraron clientes</div>
                          ) : clientes.map(c => (
                            <button key={c.cod_cliente} type="button" className="list-group-item list-group-item-action"
                              onClick={() => seleccionarCliente(c)}>
                              <strong>{c.nombre} {c.apellido || ''}</strong>
                              {c.dni && <small className="text-muted ms-2">DNI: {c.dni}</small>}
                              {c.empresa && <small className="text-muted ms-2">({c.empresa})</small>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---------- MÉTODO PAGO ---------- */}
                  <div className="col-md-3">
                    <label className="form-label fw-bold">Método de Pago</label>
                    <select className="form-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                      <option value="">-- Seleccionar --</option>
                      <option value="1">Efectivo</option>
                      <option value="2">Tarjeta</option>
                      <option value="3">Transferencia</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Ref. Pago</label>
                    <input type="text" className="form-control" placeholder="Nro. referencia"
                      value={refPago} onChange={(e) => setRefPago(e.target.value)} />
                  </div>

                  {/* ---------- AGREGAR PRODUCTOS ---------- */}
                  <div className="col-12">
                    <label className="form-label fw-bold">Agregar Productos</label>
                    <div ref={productoRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><FiSearch /></span>
                        <input type="text" className="form-control" placeholder="Buscar producto por nombre..."
                          value={buscarProducto}
                          onChange={(e) => { setBuscarProducto(e.target.value); setShowProductos(true); }}
                          onFocus={() => setShowProductos(true)} />
                      </div>
                      {showProductos && (
                        <div className="list-group" style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: 250, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          {productos.length === 0 ? (
                            <div className="list-group-item text-muted">No se encontraron productos</div>
                          ) : productos.map(p => (
                            <button key={p.cod_producto} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                              onClick={() => agregarProducto(p)}>
                              <div>
                                <strong>{p.nombre_producto}</strong>
                                <small className="text-muted ms-2">{p.unidad_medida || ''}</small>
                              </div>
                              <div className="text-end">
                                <span className="me-3">{formatMoney(p.precio_venta)}</span>
                                <span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>Stock: {p.stock}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---------- TABLA ITEMS ---------- */}
                  <div className="col-12">
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Producto</th>
                            <th style={{ width: 100 }}>Cantidad</th>
                            <th>P. Unitario</th>
                            <th>ISV %</th>
                            <th>Subtotal</th>
                            <th>ISV</th>
                            <th>Total</th>
                            <th style={{ width: 50 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan="8" className="text-center text-muted py-3">Agrega productos a la factura</td></tr>
                          ) : items.map((item) => {
                            const sub = item.precio_venta * item.cantidad;
                            const isvItem = (item.isv_pct / 100) * sub;
                            const totalItem = sub + isvItem;
                            return (
                              <tr key={item.cod_producto}>
                                <td>{item.nombre_producto} <small className="text-muted">({item.unidad_medida || '-'})</small></td>
                                <td>
                                  <input type="number" className="form-control form-control-sm text-center"
                                    min="1" max={item.stock} value={item.cantidad}
                                    onChange={(e) => cambiarCantidad(item.cod_producto, e.target.value)} />
                                </td>
                                <td>{formatMoney(item.precio_venta)}</td>
                                <td>{item.isv_pct}%</td>
                                <td>{formatMoney(sub)}</td>
                                <td>{formatMoney(isvItem)}</td>
                                <td><strong>{formatMoney(totalItem)}</strong></td>
                                <td>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarItem(item.cod_producto)}>
                                    <FiTrash2 />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ---------- RESUMEN TOTALES ---------- */}
                  {items.length > 0 && (
                    <div className="col-12">
                      <div className="d-flex justify-content-end">
                        <div style={{ minWidth: 280 }}>
                          <div className="d-flex justify-content-between py-1">
                            <span>Subtotal:</span> <strong>{formatMoney(totales.subtotal)}</strong>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <span>ISV:</span> <strong>{formatMoney(totales.isv)}</strong>
                          </div>
                          <hr className="my-1" />
                          <div className="d-flex justify-content-between py-1" style={{ fontSize: '1.2em' }}>
                            <span>TOTAL:</span> <strong className="text-success">{formatMoney(totales.total)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalNueva(false)}>Cancelar</button>
                <button type="button" className="btn jyr-btn-primary" disabled={guardando || items.length === 0 || !clienteSeleccionado}
                  onClick={guardarFactura}>
                  {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : <FiFileText className="me-2" />}
                  Emitir Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: DETALLE FACTURA                                           */}
      {/* ================================================================ */}
      {modalDetalle && facturaDetalle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Factura FAC-{String(facturaDetalle.cod_factura).padStart(4, '0')}
                  {!facturaDetalle.estado && <span className="badge bg-danger ms-2">Anulada</span>}
                </h5>
                <button className="btn-close" onClick={() => setModalDetalle(false)} />
              </div>
              <div className="modal-body">
                {/* Info general */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Cliente:</strong> {facturaDetalle.cliente?.nombre} {facturaDetalle.cliente?.apellido || ''}</p>
                    {facturaDetalle.cliente?.dni && <p className="mb-1"><strong>DNI:</strong> {facturaDetalle.cliente.dni}</p>}
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Cajero:</strong> {facturaDetalle.usuario?.nombre}</p>
                    <p className="mb-1"><strong>Código:</strong> FAC-{String(facturaDetalle.cod_factura).padStart(4, '0')}</p>
                  </div>
                </div>

                {/* Tabla detalles */}
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>P. Unit.</th>
                        <th>ISV</th>
                        <th>Subtotal</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaDetalle.detalles?.map((d, i) => (
                        <tr key={i}>
                          <td>{d.producto?.nombre_producto || `Prod. ${d.cod_producto}`}</td>
                          <td className="text-center">{d.cantidad}</td>
                          <td>{formatMoney(d.precio_unitario)}</td>
                          <td>{formatMoney(d.isv)}</td>
                          <td>{formatMoney(d.subtotal)}</td>
                          <td><strong>{formatMoney(d.total)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="d-flex justify-content-end mt-2">
                  <div style={{ minWidth: 250 }}>
                    <div className="d-flex justify-content-between py-1">
                      <span>Subtotal:</span> <strong>{formatMoney(facturaDetalle.subtotal)}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <span>ISV:</span> <strong>{formatMoney(facturaDetalle.isv)}</strong>
                    </div>
                    <hr className="my-1" />
                    <div className="d-flex justify-content-between py-1" style={{ fontSize: '1.15em' }}>
                      <span>TOTAL:</span> <strong className="text-success">{formatMoney(facturaDetalle.total)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {facturaDetalle.estado && usuario?.rol === 'Administrador' && (
                  <button className="btn btn-danger me-auto" onClick={() => anularFactura(facturaDetalle.cod_factura)}>
                    <FiXCircle className="me-2" />Anular Factura
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setModalDetalle(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturacion;
