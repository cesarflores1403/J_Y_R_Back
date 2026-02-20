import React, { useState, useEffect, useCallback, useRef } from 'react';
import { facturaService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX, FiTrash2, FiEye, FiFileText, FiArrowLeft, FiPrinter } from 'react-icons/fi';
import logoClean from '../../assets/img/logo2.jpeg';
import logoFull from '../../assets/img/logo1.jpeg';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ==========================================
// VISTA LISTA DE FACTURAS
// ==========================================
const ListaFacturas = ({ onNueva, onVer }) => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const { usuario } = useAuth();

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

  const anular = async (id) => {
    if (!window.confirm('¿Anular esta factura? Se restaurará el inventario.')) return;
    try {
      await facturaService.anular(id);
      toast.success('Factura anulada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0"><FiFileText className="me-2" />Facturación</h3>
        {['Administrador', 'Cajero'].includes(usuario?.rol) && (
          <button className="btn jyr-btn-primary" onClick={onNueva}>
            <FiPlus className="me-2" />Nueva Factura
          </button>
        )}
      </div>

      {/* Buscador */}
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

      {/* Tabla */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr>
                <th>#</th><th>Cliente</th><th>Vendedor</th><th>Subtotal</th><th>ISV</th><th>Total</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="8" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : facturas.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No se encontraron facturas</td></tr>
                ) : facturas.map((f) => (
                  <tr key={f.cod_factura} className={!f.estado ? 'table-secondary text-decoration-line-through' : ''}>
                    <td><strong>FAC-{String(f.cod_factura).padStart(6, '0')}</strong></td>
                    <td>{f.cliente?.nombre} {f.cliente?.apellido || ''}</td>
                    <td>{f.usuario?.nombre_usuario || '-'}</td>
                    <td>{formatMoney(f.subtotal)}</td>
                    <td>{formatMoney(f.isv)}</td>
                    <td><strong>{formatMoney(f.total)}</strong></td>
                    <td>
                      <span className={`badge ${f.estado ? 'bg-success' : 'bg-danger'}`}>
                        {f.estado ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" title="Ver detalle" onClick={() => onVer(f.cod_factura)}>
                        <FiEye />
                      </button>
                      {f.estado && usuario?.rol === 'Administrador' && (
                        <button className="btn btn-sm btn-outline-danger" title="Anular" onClick={() => anular(f.cod_factura)}>
                          <FiX />
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

      {/* Paginación */}
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
    </div>
  );
};

// ==========================================
// VISTA DETALLE DE FACTURA — Diseño moderno para impresión
// ==========================================
const DetalleFactura = ({ codFactura, onVolver }) => {
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await facturaService.obtener(codFactura);
        if (data.ok) setFactura(data.datos);
      } catch {
        toast.error('Error al cargar factura');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [codFactura]);

  const handlePrint = () => window.print();

  if (cargando) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!factura) return <div className="text-center py-5 text-muted">Factura no encontrada</div>;

  const fechaEmision = factura.creado_en
    ? new Date(factura.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const horaEmision = factura.creado_en
    ? new Date(factura.creado_en).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const numFactura = `FAC-${String(factura.cod_factura).padStart(6, '0')}`;
  const cantidadItems = factura.detalles?.reduce((a, d) => a + (parseInt(d.cantidad) || 0), 0) || 0;

  return (
    <div>
      {/* ---- Botones (no se imprimen) ---- */}
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <button className="btn btn-outline-secondary" onClick={onVolver}>
          <FiArrowLeft className="me-2" />Volver
        </button>
        <button className="btn jyr-btn-primary" onClick={handlePrint}>
          <FiPrinter className="me-2" />Imprimir Factura
        </button>
      </div>

      {/* ======== FACTURA IMPRIMIBLE ======== */}
      <div ref={printRef} className="inv">
        {/* Marca de agua si anulada */}
        {!factura.estado && <div className="inv-void-watermark">ANULADA</div>}

        {/* ---- Barra roja superior decorativa ---- */}
        <div className="inv-topbar" />

        <div className="inv-body">

          {/* ======= ENCABEZADO ======= */}
          <div className="inv-header">
            <div className="inv-brand">
              <img src={logoFull} alt="J&R" className="inv-logo" />
              <div className="inv-brand-text">
                <h2 className="inv-company">J & R</h2>
                <span className="inv-tagline">Accesorios & Reparaciones</span>
              </div>
            </div>
            <div className="inv-title-block">
              <div className="inv-title">FACTURA</div>
              <div className="inv-number">{numFactura}</div>
            </div>
          </div>

          {/* ======= DATOS EMPRESA + FACTURA META ======= */}
          <div className="inv-meta-row">
            <div className="inv-empresa-datos">
              <div className="inv-dato"><span>RTN:</span> 0801-1990-00001</div>
              <div className="inv-dato"><span>Dirección:</span> Col. Kennedy, Tegucigalpa, Honduras</div>
              <div className="inv-dato"><span>Teléfono:</span> +504 9999-9999</div>
              <div className="inv-dato"><span>Email:</span> info@jyr-accesorios.com</div>
            </div>
            <div className="inv-meta-datos">
              <table className="inv-meta-table">
                <tbody>
                  <tr><td>Fecha:</td><td>{fechaEmision}</td></tr>
                  <tr><td>Hora:</td><td>{horaEmision}</td></tr>
                  <tr><td>Vendedor:</td><td>{factura.usuario?.nombre_usuario || '-'}</td></tr>
                  <tr><td>Estado:</td><td>
                    <span className={`inv-status ${factura.estado ? 'inv-status-ok' : 'inv-status-void'}`}>
                      {factura.estado ? 'Activa' : 'Anulada'}
                    </span>
                  </td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ======= CLIENTE ======= */}
          <div className="inv-client-box">
            <div className="inv-client-label">FACTURADO A</div>
            <div className="inv-client-content">
              <div className="inv-client-name">{factura.cliente?.nombre} {factura.cliente?.apellido || ''}</div>
              <div className="inv-client-details">
                {factura.cliente?.dni && <span><strong>DNI:</strong> {factura.cliente.dni}</span>}
                {factura.cliente?.empresa && <span><strong>Empresa:</strong> {factura.cliente.empresa}</span>}
                {factura.cliente?.telefono && <span><strong>Tel:</strong> {factura.cliente.telefono}</span>}
                {factura.cliente?.email && <span>{factura.cliente.email}</span>}
                {factura.ref_pago && <span><strong>Ref. Pago:</strong> {factura.ref_pago}</span>}
              </div>
            </div>
          </div>

          {/* ======= TABLA DE PRODUCTOS ======= */}
          <table className="inv-table">
            <thead>
              <tr>
                <th className="inv-th-num">#</th>
                <th className="inv-th-desc">Descripción del Producto</th>
                <th className="inv-th-qty">Cant.</th>
                <th className="inv-th-price">Precio Unit.</th>
                <th className="inv-th-price">Subtotal</th>
                <th className="inv-th-price">ISV</th>
                <th className="inv-th-price">Total</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles?.map((d, i) => (
                <tr key={d.cod_detalle_factura} className={i % 2 === 0 ? 'inv-row-even' : ''}>
                  <td className="text-center">{String(i + 1).padStart(2, '0')}</td>
                  <td className="inv-td-product">
                    <div className="inv-product-name">{d.producto?.nombre_producto || `Producto #${d.cod_producto}`}</div>
                  </td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-end">{formatMoney(d.precio_unitario)}</td>
                  <td className="text-end">{formatMoney(d.subtotal)}</td>
                  <td className="text-end">{formatMoney(d.isv)}</td>
                  <td className="text-end inv-td-bold">{formatMoney(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ======= RESUMEN DE TOTALES ======= */}
          <div className="inv-summary">
            <div className="inv-summary-left">
              <div className="inv-summary-note">
                <strong>Artículos:</strong> {factura.detalles?.length || 0} productos ({cantidadItems} unidades)
              </div>
              <div className="inv-summary-note inv-note-light">
                Los precios incluyen ISV del 15% donde aplica.
              </div>
            </div>
            <div className="inv-summary-right">
              <div className="inv-total-line">
                <span>Subtotal</span>
                <span>{formatMoney(factura.subtotal)}</span>
              </div>
              <div className="inv-total-line">
                <span>ISV (15%)</span>
                <span>{formatMoney(factura.isv)}</span>
              </div>
              <div className="inv-total-line inv-grand-total">
                <span>TOTAL A PAGAR</span>
                <span>{formatMoney(factura.total)}</span>
              </div>
            </div>
          </div>

          {/* ======= PIE DE FACTURA ======= */}
          <div className="inv-footer">
            <div className="inv-footer-top">
              <div className="inv-footer-col">
                <div className="inv-sign-line" />
                <span>Firma Autorizada</span>
              </div>
              <div className="inv-footer-col">
                <div className="inv-sign-line" />
                <span>Recibí Conforme</span>
              </div>
            </div>
            <div className="inv-footer-bottom">
              <img src={logoClean} alt="J&R" className="inv-footer-logo" />
              <div className="inv-footer-text">
                <strong>¡Gracias por su preferencia!</strong>
                <span>J & R Accesorios & Reparaciones — La calidad que tu vehículo merece</span>
                <span className="inv-legal">Este documento es una representación impresa de la factura electrónica.</span>
              </div>
            </div>
          </div>

        </div>

        {/* ---- Barra roja inferior decorativa ---- */}
        <div className="inv-bottombar" />
      </div>
    </div>
  );
};

// ==========================================
// FORMULARIO NUEVA FACTURA
// ==========================================
const NuevaFactura = ({ onVolver, onCreada }) => {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [buscarProducto, setBuscarProducto] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [items, setItems] = useState([]);
  const [refPago, setRefPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);

  // Buscar clientes
  useEffect(() => {
    if (buscarCliente.length < 2) { setClientes([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await facturaService.clientesDisponibles({ buscar: buscarCliente });
        if (data.ok) setClientes(data.datos);
      } catch { /* silenciar */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscarCliente]);

  // Buscar productos
  useEffect(() => {
    if (buscarProducto.length < 2) { setProductos([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await facturaService.productosDisponibles({ buscar: buscarProducto });
        if (data.ok) setProductos(data.datos);
      } catch { /* silenciar */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscarProducto]);

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setBuscarCliente('');
    setShowClienteDropdown(false);
  };

  const agregarProducto = (p) => {
    // Verificar si ya está en la lista
    const existe = items.find(i => i.cod_producto === p.cod_producto);
    if (existe) {
      toast.warning('Este producto ya está en la factura');
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
    setBuscarProducto('');
    setShowProductoDropdown(false);
  };

  const cambiarCantidad = (index, cantidad) => {
    const num = parseInt(cantidad) || 0;
    const nuevo = [...items];
    nuevo[index].cantidad = num;
    setItems(nuevo);
  };

  const eliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Cálculos
  const calcularItem = (item) => {
    const subtotal = item.precio_venta * item.cantidad;
    const isv = (item.isv_pct / 100) * subtotal;
    const total = subtotal + isv;
    return { subtotal, isv, total };
  };

  const totales = items.reduce((acc, item) => {
    const { subtotal, isv, total } = calcularItem(item);
    return { subtotal: acc.subtotal + subtotal, isv: acc.isv + isv, total: acc.total + total };
  }, { subtotal: 0, isv: 0, total: 0 });

  const validarItems = () => {
    for (const item of items) {
      if (item.cantidad <= 0) return 'La cantidad de cada producto debe ser mayor a 0';
      if (item.cantidad > item.stock) return `Stock insuficiente para "${item.nombre_producto}" (disponible: ${item.stock})`;
    }
    return null;
  };

  const guardar = async () => {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return; }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    const errorItems = validarItems();
    if (errorItems) { toast.error(errorItems); return; }

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
        toast.success('Factura creada exitosamente');
        onCreada(data.datos?.cod_factura);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear factura');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <button className="btn btn-outline-secondary mb-3" onClick={onVolver}><FiArrowLeft className="me-2" />Volver</button>
      <h3 className="mb-4"><FiFileText className="me-2" />Nueva Factura</h3>

      <div className="row g-4">
        {/* Columna izquierda: cliente + productos */}
        <div className="col-lg-8">
          {/* Selector de cliente */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="mb-3">Cliente *</h6>
              {clienteSeleccionado ? (
                <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-light">
                  <div>
                    <strong>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido || ''}</strong>
                    {clienteSeleccionado.dni && <span className="text-muted ms-2">DNI: {clienteSeleccionado.dni}</span>}
                    {clienteSeleccionado.empresa && <span className="text-muted ms-2">| {clienteSeleccionado.empresa}</span>}
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setClienteSeleccionado(null)}>
                    <FiX />
                  </button>
                </div>
              ) : (
                <div className="position-relative">
                  <div className="input-group">
                    <span className="input-group-text"><FiSearch /></span>
                    <input type="text" className="form-control" placeholder="Buscar cliente por nombre, DNI..."
                      value={buscarCliente}
                      onChange={(e) => { setBuscarCliente(e.target.value); setShowClienteDropdown(true); }}
                      onFocus={() => setShowClienteDropdown(true)} />
                  </div>
                  {showClienteDropdown && clientes.length > 0 && (
                    <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                      {clientes.map(c => (
                        <div key={c.cod_cliente} className="px-3 py-2 cursor-pointer border-bottom"
                          style={{ cursor: 'pointer' }}
                          onClick={() => seleccionarCliente(c)}>
                          <strong>{c.nombre} {c.apellido || ''}</strong>
                          {c.dni && <span className="text-muted ms-2">DNI: {c.dni}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Agregar productos */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="mb-3">Agregar Productos</h6>
              <div className="position-relative">
                <div className="input-group">
                  <span className="input-group-text"><FiSearch /></span>
                  <input type="text" className="form-control" placeholder="Buscar producto por nombre..."
                    value={buscarProducto}
                    onChange={(e) => { setBuscarProducto(e.target.value); setShowProductoDropdown(true); }}
                    onFocus={() => setShowProductoDropdown(true)} />
                </div>
                {showProductoDropdown && productos.length > 0 && (
                  <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1050, maxHeight: 250, overflowY: 'auto' }}>
                    {productos.map(p => (
                      <div key={p.cod_producto} className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => agregarProducto(p)}>
                        <div>
                          <strong>{p.nombre_producto}</strong>
                          <span className="text-muted ms-2">{formatMoney(p.precio_venta)}</span>
                        </div>
                        <span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                          Stock: {p.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabla de ítems */}
          <div className="jyr-card">
            <div className="jyr-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead><tr>
                    <th>#</th><th>Producto</th><th>P. Unit.</th><th>Cant.</th><th>ISV %</th><th>Subtotal</th><th>Total</th><th></th>
                  </tr></thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="8" className="text-center text-muted py-4">Agrega productos a la factura</td></tr>
                    ) : items.map((item, index) => {
                      const calc = calcularItem(item);
                      const stockError = item.cantidad > item.stock;
                      return (
                        <tr key={item.cod_producto} className={stockError ? 'table-danger' : ''}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{item.nombre_producto}</strong>
                            <div className="text-muted small">Stock: {item.stock} | {item.unidad_medida || 'und'}</div>
                          </td>
                          <td>{formatMoney(item.precio_venta)}</td>
                          <td style={{ width: 100 }}>
                            <input type="number" className={`form-control form-control-sm ${stockError ? 'is-invalid' : ''}`}
                              min="1" max={item.stock} value={item.cantidad}
                              onChange={(e) => cambiarCantidad(index, e.target.value)} />
                          </td>
                          <td>{item.isv_pct}%</td>
                          <td>{formatMoney(calc.subtotal)}</td>
                          <td><strong>{formatMoney(calc.total)}</strong></td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarItem(index)}>
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
          </div>
        </div>

        {/* Columna derecha: resumen + pago */}
        <div className="col-lg-4">
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="mb-3">Método de Pago</h6>
              <select className="form-select mb-2" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="">Sin especificar</option>
                <option value="1">Efectivo</option>
                <option value="2">Tarjeta</option>
                <option value="3">Transferencia</option>
              </select>
              <label className="form-label small">Referencia de pago</label>
              <input type="text" className="form-control form-control-sm" placeholder="Nro. transacción, recibo..."
                value={refPago} onChange={(e) => setRefPago(e.target.value)} />
            </div>
          </div>

          <div className="jyr-card">
            <div className="jyr-card-body">
              <h6 className="mb-3">Resumen</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>Ítems:</span><strong>{items.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span><strong>{formatMoney(totales.subtotal)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>ISV:</span><strong>{formatMoney(totales.isv)}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span className="fs-5 fw-bold">Total:</span>
                <span className="fs-5 fw-bold text-success">{formatMoney(totales.total)}</span>
              </div>

              <button className="btn jyr-btn-primary w-100" disabled={guardando || items.length === 0 || !clienteSeleccionado}
                onClick={guardar}>
                {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : <FiFileText className="me-2" />}
                Emitir Factura
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const Facturas = () => {
  const [vista, setVista] = useState('lista'); // lista | nueva | detalle
  const [facturaDetalle, setFacturaDetalle] = useState(null);

  const irANueva = () => setVista('nueva');
  const irALista = () => { setVista('lista'); setFacturaDetalle(null); };
  const verDetalle = (id) => { setFacturaDetalle(id); setVista('detalle'); };

  switch (vista) {
    case 'nueva':
      return <NuevaFactura onVolver={irALista} onCreada={(id) => { if (id) verDetalle(id); else irALista(); }} />;
    case 'detalle':
      return <DetalleFactura codFactura={facturaDetalle} onVolver={irALista} />;
    default:
      return <ListaFacturas onNueva={irANueva} onVer={verDetalle} />;
  }
};

export default Facturas;
