import React, { useState, useEffect, useCallback, useRef } from 'react';
import { facturaService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX, FiTrash2, FiEye, FiFileText, FiArrowLeft, FiPrinter, FiAlertTriangle, FiXCircle, FiUserPlus, FiEdit2 } from 'react-icons/fi';
import logoClean from '../../assets/img/logo2.jpeg';
import logoFull from '../../assets/img/logo1.jpeg';
import BuscadorProducto from './BuscadorProducto.jsx';
import ModalClienteRapido from './ModalClienteRapido.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const normalizeEstado = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === '1') return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return ['activa', 'activo', 'true', '1', 'si', 'sí'].includes(s);
  }
  return Boolean(v);
};

// ==========================================
// VISTA LISTA DE FACTURAS
// ==========================================
const ListaFacturas = ({ onNueva, onVer }) => {
  const confirm = useConfirm();
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const { usuario } = useAuth();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await facturaService.listar({ pagina, limite: 10, buscar });
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

  const [modalAnular, setModalAnular] = useState(null); // { id, numero, estado }
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const abrirModalAnular = (f) => {
    setModalAnular({ id: f.cod_factura, numero: `FAC-${String(f.cod_factura).padStart(6, '0')}`, estado: f.estado });
    setMotivoAnulacion('');
  };

  const anular = async () => {
    if (!modalAnular) return;
    if (!motivoAnulacion.trim()) {
      toast.warn('Debes ingresar el motivo de anulación');
      return;
    }
    try {
      const { data } = await facturaService.anular(modalAnular.id, motivoAnulacion.trim());
      toast.success(data?.mensaje || 'Factura anulada correctamente');
      setModalAnular(null);
      setMotivoAnulacion('');
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
                      <span className={`badge ${normalizeEstado(f.estado) ? 'bg-success' : 'bg-danger'}`}>
                        {normalizeEstado(f.estado) ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" title="Ver detalle" onClick={() => onVer(f.cod_factura)}>
                        <FiEye />
                      </button>
                      {f.estado && usuario?.rol === 'Administrador' && (
                        <button className="btn btn-sm btn-outline-danger me-1" title="Anular" onClick={() => abrirModalAnular(f)}>
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

      {/* ====== MODAL ANULAR FACTURA ====== */}
      {modalAnular && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setModalAnular(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title"><FiAlertTriangle className="me-2" />Gestionar Factura</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalAnular(null)} />
              </div>
              <div className="modal-body py-4">
                <h5 className="text-center mb-3">{modalAnular.numero}</h5>
                <p className="text-muted text-center mb-3">
                  Al anular esta factura, se restaurará el inventario de sus productos y se reversarán los pagos.
                </p>
                <div className="mb-2">
                  <label className="form-label fw-bold">Motivo de anulación <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Ingrese el motivo de anulación (obligatorio)..."
                    value={motivoAnulacion}
                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                    maxLength={500}
                  />
                  <small className="text-muted">{motivoAnulacion.length}/500</small>
                </div>
              </div>
              <div className="modal-footer justify-content-between">
                <button className="btn btn-secondary" onClick={() => { setModalAnular(null); setMotivoAnulacion(''); }}>
                  Cancelar
                </button>
                <button className="btn btn-warning" onClick={anular} disabled={!motivoAnulacion.trim()}>
                  <FiXCircle className="me-1" />Anular
                </button>
              </div>
            </div>
          </div>
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
  const [empresa, setEmpresa] = useState({});
  const [cargando, setCargando] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await facturaService.obtener(codFactura);
        if (data.ok) {
          // data.datos puede ser { factura, empresa } o la factura directamente
          const payload = data.datos;
          const f = payload.factura || payload;
          setFactura(f);
          setEmpresa(payload.empresa || {});
        }
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

  // Normalizar estado (acepta '1', 'ACTIVA', true, etc.)
  const estadoActivo = normalizeEstado(factura.estado);
  const logoFacturaUrl = empresa?.logo_factura_url
    ? (empresa.logo_factura_url.startsWith('http') ? empresa.logo_factura_url : `${API_BASE}${empresa.logo_factura_url}`)
    : logoFull;

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
          {!estadoActivo && <div className="inv-void-watermark">ANULADA</div>}

        {/* ---- Barra roja superior decorativa ---- */}
        <div className="inv-topbar" />

        <div className="inv-body">

          {/* ======= ENCABEZADO ======= */}
          <div className="inv-header">
            <div className="inv-brand">
              <img src={logoFacturaUrl} alt="J&R" className="inv-logo" onError={(e) => { e.currentTarget.src = logoFull; }} />
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
              <div className="inv-dato"><span>R.T.N.:</span> {empresa.rtn || '---'}</div>
              <div className="inv-dato"><span>Dirección:</span> {empresa.direccion || '---'}</div>
              <div className="inv-dato"><span>Celular:</span> {empresa.telefono || '---'}</div>
              <div className="inv-dato"><span>E-mail:</span> {empresa.correo || '---'}</div>
              {empresa.cai && <div className="inv-dato"><span>CAI:</span> {empresa.cai}</div>}
            </div>
            <div className="inv-meta-datos">
              <table className="inv-meta-table">
                <tbody>
                  <tr><td>Fecha:</td><td>{new Date().toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                  <tr><td>Hora:</td><td>{new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</td></tr>
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
                <th className="inv-th-price">Desc %</th>
                <th className="inv-th-price">Subtotal</th>
                <th className="inv-th-price">ISV</th>
                <th className="inv-th-price">Total</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles?.map((d, i) => {
                const descPct = parseFloat(d.descuento) || 0;
                return (
                  <tr key={d.cod_detalle_factura} className={i % 2 === 0 ? 'inv-row-even' : ''}>
                    <td className="text-center">{String(i + 1).padStart(2, '0')}</td>
                    <td className="inv-td-product">
                      <div className="inv-product-name">{d.producto?.nombre_producto || `Producto #${d.cod_producto}`}</div>
                    </td>
                    <td className="text-center">{d.cantidad}</td>
                    <td className="text-end">{formatMoney(d.precio_unitario)}</td>
                    <td className="text-center">{descPct > 0 ? `${descPct}%` : '-'}</td>
                    <td className="text-end">{formatMoney(d.subtotal)}</td>
                    <td className="text-end">{formatMoney(d.isv)}</td>
                    <td className="text-end inv-td-bold">{formatMoney(d.total)}</td>
                  </tr>
                );
              })}
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
              {parseFloat(factura.descuento) > 0 && (
                <div className="inv-total-line" style={{ color: '#dc3545' }}>
                  <span>Descuento</span>
                  <span>- {formatMoney(factura.descuento)}</span>
                </div>
              )}
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
            {empresa.rango_autorizado && (
              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, marginBottom: 8 }}>
                Rango autorizado: {empresa.rango_autorizado}
                {empresa.fecha_limite_emision && <> / Fecha límite de emisión: {new Date(empresa.fecha_limite_emision + 'T00:00:00').toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</>}
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#737373', marginBottom: 8 }}>Original: Cliente / Copia: O.T. Emisor</div>
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
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [items, setItems] = useState([]);
  const [refPago, setRefPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  // HU-FAC-09: Modal de excepción de stock
  const [modalStock, setModalStock] = useState(null);
  const [justificacionStock, setJustificacionStock] = useState('');
  // HU-FAC-11: Modal de cliente rápido
  const [modalCliente, setModalCliente] = useState(false);
  const [clienteEditar, setClienteEditar] = useState(null);
  const { usuario } = useAuth();

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

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setBuscarCliente('');
    setShowClienteDropdown(false);
  };

  const agregarProducto = (producto) => {
    // HU-FAC-03: añadir campo descuento por línea (porcentaje 0-100)
    setItems(prev => [...prev, { ...producto, descuento: 0 }]);
  };

  const cambiarCantidad = (index, cantidad) => {
    const num = parseInt(cantidad) || 0;
    const nuevo = [...items];
    nuevo[index].cantidad = num;
    setItems(nuevo);
  };

  const cambiarDescuento = (index, valor) => {
    const num = Math.min(100, Math.max(0, parseFloat(valor) || 0));
    const nuevo = [...items];
    nuevo[index].descuento = num;
    setItems(nuevo);
  };

  const eliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // HU-FAC-03: Redondeo preciso a 2 decimales (misma lógica que backend)
  const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

  // HU-FAC-03: Cálculo ISV y totales por línea con redondeo
  const calcularItem = (item) => {
    const precio = round2(item.precio_venta);
    const descuento = round2(item.descuento || 0);
    const subtotalBruto = round2(precio * item.cantidad);
    const montoDescuento = round2((descuento / 100) * subtotalBruto);
    const subtotal = round2(subtotalBruto - montoDescuento);
    const isv = round2((item.isv_pct / 100) * subtotal);
    const total = round2(subtotal + isv);
    return { subtotalBruto, montoDescuento, subtotal, isv, total };
  };

  const totales = items.reduce((acc, item) => {
    const calc = calcularItem(item);
    return {
      subtotalBruto: round2(acc.subtotalBruto + calc.subtotalBruto),
      descuento: round2(acc.descuento + calc.montoDescuento),
      subtotal: round2(acc.subtotal + calc.subtotal),
      isv: round2(acc.isv + calc.isv),
      total: round2(acc.total + calc.total)
    };
  }, { subtotalBruto: 0, descuento: 0, subtotal: 0, isv: 0, total: 0 });

  // HU-FAC-09: Validación de stock previa (solo bloquea cantidad <= 0, stock se valida en backend)
  const validarItems = () => {
    for (const item of items) {
      if (item.cantidad <= 0) return 'La cantidad de cada producto debe ser mayor a 0';
    }
    return null;
  };

  // HU-FAC-09: Función interna para enviar la factura al backend
  const enviarFactura = async (forzar = false, justificacion = '') => {
    setGuardando(true);
    try {
      const payload = {
        cod_cliente: clienteSeleccionado.cod_cliente,
        metodo_pago: metodoPago ? parseInt(metodoPago) : null,
        ref_pago: refPago || null,
        items: items.map(i => ({ cod_producto: i.cod_producto, cantidad: i.cantidad, descuento: i.descuento || 0 })),
        forzar_sin_stock: forzar,
        justificacion_stock: justificacion
      };
      const { data } = await facturaService.crear(payload);
      if (data.ok) {
        toast.success('Factura creada exitosamente');
        onCreada(data.datos?.cod_factura);
      }
    } catch (err) {
      const resp = err.response?.data;
      // HU-FAC-09: Interceptar error de stock insuficiente
      if (resp?.codigo === 'STOCK_INSUFICIENTE') {
        if (resp.puede_forzar) {
          // Mostrar modal de autorización al Administrador
          setModalStock({ productos: resp.productos, mensaje: resp.mensaje });
          setJustificacionStock('');
        } else {
          // Cajero sin permiso — mostrar detalle del déficit
          const detalle = resp.productos?.map(p =>
            `• ${p.nombre_producto}: disponible ${p.stock_disponible}, solicitado ${p.cantidad_solicitada}`
          ).join('\n') || '';
          toast.error(
            <div>
              <strong>Stock insuficiente</strong>
              <div style={{ fontSize: '0.85em', whiteSpace: 'pre-line', marginTop: 4 }}>{detalle}</div>
              <div style={{ fontSize: '0.8em', marginTop: 6, color: '#ffc107' }}>
                Contacta al Administrador para autorizar la venta sin stock.
              </div>
            </div>,
            { autoClose: 8000 }
          );
        }
      } else {
        toast.error(resp?.mensaje || 'Error al crear factura');
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardar = async () => {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return; }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    const errorItems = validarItems();
    if (errorItems) { toast.error(errorItems); return; }
    await enviarFactura(false, '');
  };

  // HU-FAC-09: Confirmar venta forzada sin stock (solo Admin)
  const confirmarForzarStock = async () => {
    if (!justificacionStock.trim()) {
      toast.warn('Debes ingresar una justificación para autorizar la venta sin stock');
      return;
    }
    setModalStock(null);
    await enviarFactura(true, justificacionStock.trim());
  };

  return (
    <>
    <div>
      <button className="btn btn-outline-secondary mb-3" onClick={onVolver}><FiArrowLeft className="me-2" />Volver</button>
      <h3 className="mb-4"><FiFileText className="me-2" />Nueva Factura</h3>

      <div className="row g-4">
        {/* Columna izquierda: cliente + productos */}
        <div className="col-lg-8">
          {/* Selector de cliente */}
          <div className="jyr-card mb-3" style={{ overflow: 'visible' }}>
            <div className="jyr-card-body" style={{ overflow: 'visible' }}>
              <h6 className="mb-3">Cliente *</h6>
              {clienteSeleccionado ? (
                <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-light">
                  <div>
                    <strong>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido || ''}</strong>
                    {clienteSeleccionado.dni && <span className="text-muted ms-2">DNI: {clienteSeleccionado.dni}</span>}
                    {clienteSeleccionado.empresa && <span className="text-muted ms-2">| {clienteSeleccionado.empresa}</span>}
                  </div>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-primary" title="Editar cliente"
                      onClick={() => { setClienteEditar(clienteSeleccionado); setModalCliente(true); }}>
                      <FiEdit2 />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setClienteSeleccionado(null)}>
                      <FiX />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="position-relative">
                  <div className="input-group">
                    <span className="input-group-text"><FiSearch /></span>
                    <input type="text" className="form-control" placeholder="Buscar cliente por nombre, DNI..."
                      value={buscarCliente}
                      onChange={(e) => { setBuscarCliente(e.target.value); setShowClienteDropdown(true); }}
                      onFocus={() => setShowClienteDropdown(true)} />
                    <button className="btn btn-outline-info btn-sm" type="button" title="Crear nuevo cliente"
                      onClick={() => { setClienteEditar(null); setModalCliente(true); }}>
                      <FiUserPlus className="me-1" />Nuevo
                    </button>
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

          {/* Agregar productos — HU-FAC-02: Buscador rápido por código/nombre */}
          <div className="jyr-card mb-3" style={{ overflow: 'visible' }}>
            <div className="jyr-card-body" style={{ overflow: 'visible' }}>
              <BuscadorProducto onAgregar={agregarProducto} itemsActuales={items} />
            </div>
          </div>

          {/* Tabla de ítems — HU-FAC-03: ISV monto, descuento, totales por línea */}
          <div className="jyr-card">
            <div className="jyr-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle" style={{ fontSize: '0.88rem' }}>
                  <thead className="table-light"><tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Producto</th>
                    <th style={{ width: 100 }}>P. Unit.</th>
                    <th style={{ width: 80 }}>Cant.</th>
                    <th style={{ width: 80 }}>Desc %</th>
                    <th style={{ width: 100 }}>Subtotal</th>
                    <th style={{ width: 60 }}>ISV %</th>
                    <th style={{ width: 100 }}>ISV (L)</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr></thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="10" className="text-center text-muted py-4">Agrega productos a la factura</td></tr>
                    ) : items.map((item, index) => {
                      const calc = calcularItem(item);
                      const stockError = item.cantidad > item.stock;
                      return (
                        <tr key={item.cod_producto} className={stockError ? 'table-danger' : ''}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <strong>{item.nombre_producto}</strong>
                            <div className="text-muted small">Cód: {item.cod_producto} | Stock: {item.stock} {item.unidad_medida || 'und'}</div>
                          </td>
                          <td>{formatMoney(item.precio_venta)}</td>
                          <td>
                            <input type="number" className={`form-control form-control-sm ${stockError ? 'is-invalid' : ''}`}
                              min="1" max={item.stock} value={item.cantidad}
                              onChange={(e) => cambiarCantidad(index, e.target.value)} />
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm"
                              min="0" max="100" step="0.5" value={item.descuento || 0}
                              onChange={(e) => cambiarDescuento(index, e.target.value)} />
                          </td>
                          <td>{formatMoney(calc.subtotal)}</td>
                          <td className="text-center">{item.isv_pct}%</td>
                          <td>{formatMoney(calc.isv)}</td>
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
                <span>Subtotal Bruto:</span><strong>{formatMoney(totales.subtotalBruto)}</strong>
              </div>
              {totales.descuento > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Descuento:</span><strong>- {formatMoney(totales.descuento)}</strong>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal Neto:</span><strong>{formatMoney(totales.subtotal)}</strong>
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

    {/* ══════ Modal Stock Insuficiente ══════ */}
      {modalStock && (
        <div className="modal-backdrop-custom" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,.55)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1e1e2f', color: '#e0e0e0', borderRadius: 12,
            width: '95%', maxWidth: 560, padding: '28px 32px',
            boxShadow: '0 8px 32px rgba(0,0,0,.45)', border: '1px solid #ff9800'
          }}>
            <h5 style={{ color: '#ff9800', marginBottom: 16 }}>
              <FiAlertTriangle className="me-2" style={{ verticalAlign: '-2px' }} />
              Stock Insuficiente — Autorización Requerida
            </h5>
            <p className="small mb-3" style={{ color: '#ccc' }}>
              Los siguientes productos no tienen stock suficiente. Como <strong>Administrador</strong>, puedes autorizar la venta registrando una justificación.
            </p>

            <div className="table-responsive mb-3">
              <table className="table table-sm table-dark table-bordered mb-0" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ color: '#ff9800' }}>
                    <th>Producto</th>
                    <th className="text-center">Disponible</th>
                    <th className="text-center">Solicitado</th>
                    <th className="text-center">Déficit</th>
                  </tr>
                </thead>
                <tbody>
                  {modalStock.productos.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nombre_producto}</td>
                      <td className="text-center">{p.stock_disponible}</td>
                      <td className="text-center">{p.cantidad_solicitada}</td>
                      <td className="text-center text-danger fw-bold">-{p.deficit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3">
              <label className="form-label small" style={{ color: '#ccc' }}>
                Justificación <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                placeholder="Indique el motivo por el cual se autoriza la venta sin stock suficiente..."
                value={justificacionStock}
                onChange={(e) => setJustificacionStock(e.target.value)}
                style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setModalStock(null); setJustificacionStock(''); }}>
                Cancelar
              </button>
              <button
                className="btn btn-warning btn-sm fw-bold"
                disabled={!justificacionStock.trim() || guardando}
                onClick={confirmarForzarStock}
              >
                {guardando ? <span className="spinner-border spinner-border-sm me-1" /> : <FiAlertTriangle className="me-1" />}
                Autorizar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Modal Cliente Rápido (HU-FAC-11) ══════ */}
      <ModalClienteRapido
        visible={modalCliente}
        onCerrar={() => { setModalCliente(false); setClienteEditar(null); }}
        onClienteCreado={(cliente) => {
          setClienteSeleccionado(cliente);
          setBuscarCliente('');
          setShowClienteDropdown(false);
        }}
        clienteEditar={clienteEditar}
      />

    </>
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
