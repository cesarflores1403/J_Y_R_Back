import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cotizacionService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiTrash2, FiEye, FiClipboard, FiArrowLeft,
  FiPrinter, FiAlertTriangle, FiXCircle, FiRefreshCw, FiPackage, FiCheckCircle
} from 'react-icons/fi';
import { confirmDialog } from '../../utils/notifications.js';
import logoClean from '../../assets/img/logo2.jpeg';
import logoFull from '../../assets/img/logo1.jpeg';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const estadoBadge = (est) => {
  const map = {
    VIGENTE:   { bg: 'bg-success',   text: 'Vigente' },
    VENCIDA:   { bg: 'bg-warning text-dark', text: 'Vencida' },
    CONVERTIDA:{ bg: 'bg-info',      text: 'Convertida' },
    ANULADA:   { bg: 'bg-danger',    text: 'Anulada' },
  };
  const m = map[est] || { bg: 'bg-secondary', text: est || '-' };
  return <span className={`badge ${m.bg}`}>{m.text}</span>;
};

// ==========================================
// VISTA LISTA DE COTIZACIONES
// ==========================================
const ListaCotizaciones = ({ onNueva, onVer }) => {
  const confirm = useConfirm();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const { usuario } = useAuth();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await cotizacionService.listar({ pagina, limite: 10, buscar, estado: filtroEstado });
      if (data.ok) {
        setCotizaciones(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch {
      toast.error('Error al cargar cotizaciones');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  /* ---- Modales / Acciones ---- */
  const [modalGestion, setModalGestion] = useState(null);

  const anular = async (id) => {
    const ok = await confirmDialog({
      variant: 'cancel',
      title: 'Anular cotización',
      text: '¿Anular esta cotización? Esta acción no se puede deshacer.',
      confirmText: 'Sí, anular'
    });
    if (!ok) return;
    try {
      const { data } = await cotizacionService.anular(id);
      toast.success(data?.mensaje || 'Cotización anulada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular');
    }
  };

  const eliminar = async (id) => {
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar cotización',
      text: '¿Eliminar permanentemente esta cotización? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
      await cotizacionService.eliminar(id);
      toast.success('Cotización eliminada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  const convertir = async (id) => {
    const ok = await confirmDialog({
      variant: 'convert',
      title: 'Convertir a factura',
      text: '¿Convertir esta cotización en factura? Se descontará del inventario.',
      confirmText: 'Sí, convertir'
    });
    if (!ok) return;
    try {
      const { data } = await cotizacionService.convertir(id);
      toast.success(data?.mensaje || `Factura ${data?.num_factura || ''} generada`);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al convertir');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0"><FiClipboard className="me-2" />Cotizaciones</h3>
        {['Administrador', 'Cajero'].includes(usuario?.rol) && (
          <button className="btn jyr-btn-primary" onClick={onNueva}>
            <FiPlus className="me-2" />Nueva Cotización
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text"><FiSearch /></span>
                <input type="text" className="form-control" placeholder="Buscar por cliente, DNI..."
                  value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
                {buscar && <button className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}><FiX /></button>}
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
                <option value="">Todos los estados</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                <option value="CONVERTIDA">Convertida</option>
                <option value="ANULADA">Anulada</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr>
                <th>#</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Vigencia</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : cotizaciones.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No se encontraron cotizaciones</td></tr>
                ) : cotizaciones.map((c) => {
                  const numCot = `COT-${String(c.cod_cotizacion).padStart(6, '0')}`;
                  const fVenc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-HN') : '-';
                  const isAnulada = c.estado_cotizacion === 'ANULADA';
                  return (
                    <tr key={c.cod_cotizacion} className={isAnulada ? 'table-secondary text-decoration-line-through' : ''}>
                      <td><strong>{numCot}</strong></td>
                      <td>{c.cliente?.nombre} {c.cliente?.apellido || ''}</td>
                      <td>{c.usuario?.nombre_usuario || '-'}</td>
                      <td><strong>{formatMoney(c.total)}</strong></td>
                      <td><small>{fVenc}</small></td>
                      <td>{estadoBadge(c.estado_cotizacion)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-primary" title="Ver detalle" onClick={() => onVer(c.cod_cotizacion)}>
                            <FiEye />
                          </button>
                          {c.estado_cotizacion === 'VIGENTE' && ['Administrador', 'Cajero'].includes(usuario?.rol) && (
                            <button className="btn btn-sm btn-outline-success" title="Convertir a Factura" onClick={() => convertir(c.cod_cotizacion)}>
                              <FiRefreshCw />
                            </button>
                          )}
                          {c.estado_cotizacion === 'VIGENTE' && usuario?.rol === 'Administrador' && (
                            <button className="btn btn-sm btn-outline-warning" title="Anular" onClick={() => anular(c.cod_cotizacion)}>
                              <FiXCircle />
                            </button>
                          )}
                          {['VIGENTE', 'VENCIDA', 'ANULADA'].includes(c.estado_cotizacion) && usuario?.rol === 'Administrador' && (
                            <button className="btn btn-sm btn-outline-danger" title="Eliminar" onClick={() => eliminar(c.cod_cotizacion)}>
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
// VISTA DETALLE DE COTIZACIÓN
// ==========================================
const DetalleCotizacion = ({ codCotizacion, onVolver, onConvertida }) => {
  const confirm = useConfirm();
  const [cotizacion, setCotizacion] = useState(null);
  const [empresa, setEmpresa] = useState({});
  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuth();
  const printRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await cotizacionService.obtener(codCotizacion);
        if (data.ok) {
          const payload = data.datos;
          const c = payload.cotizacion || payload;
          setCotizacion(c);
          setEmpresa(payload.empresa || {});
        }
      } catch {
        toast.error('Error al cargar cotización');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [codCotizacion]);

  const handlePrint = () => window.print();

  const handleConvertir = async () => {
    const ok = await confirmDialog({
      variant: 'convert',
      title: 'Convertir a factura',
      text: '¿Convertir esta cotización en factura? Se descontará del inventario.',
      confirmText: 'Sí, convertir'
    });
    if (!ok) return;
    try {
      const { data } = await cotizacionService.convertir(codCotizacion);
      toast.success(data?.mensaje || 'Factura generada');
      if (onConvertida) onConvertida();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al convertir');
    }
  };

  if (cargando) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!cotizacion) return <div className="text-center py-5 text-muted">Cotización no encontrada</div>;

  const numCot = `COT-${String(cotizacion.cod_cotizacion).padStart(6, '0')}`;
  const fechaEmision = cotizacion.createdAt
    ? new Date(cotizacion.createdAt).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const fechaVenc = cotizacion.fecha_vencimiento
    ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const cantidadItems = cotizacion.detalles?.reduce((a, d) => a + (parseInt(d.cantidad) || 0), 0) || 0;
  const esVigente = cotizacion.estado_cotizacion === 'VIGENTE';

  return (
    <div>
      {/* Botones (no se imprimen) */}
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <button className="btn btn-outline-secondary" onClick={onVolver}>
          <FiArrowLeft className="me-2" />Volver
        </button>
        <div className="d-flex gap-2">
          {esVigente && ['Administrador', 'Cajero'].includes(usuario?.rol) && (
            <button className="btn btn-success" onClick={handleConvertir}>
              <FiCheckCircle className="me-2" />Convertir a Factura
            </button>
          )}
          <button className="btn jyr-btn-primary" onClick={handlePrint}>
            <FiPrinter className="me-2" />Imprimir
          </button>
        </div>
      </div>

      {/* ======== COTIZACIÓN IMPRIMIBLE ======== */}
      <div ref={printRef} className="inv">
        {cotizacion.estado_cotizacion === 'ANULADA' && <div className="inv-void-watermark">ANULADA</div>}
        {cotizacion.estado_cotizacion === 'VENCIDA' && <div className="inv-void-watermark" style={{ color: 'rgba(255,165,0,0.12)' }}>VENCIDA</div>}

        <div className="inv-topbar" />

        <div className="inv-body">
          {/* Encabezado */}
          <div className="inv-header">
            <div className="inv-brand">
              <img src={logoFull} alt="J&R" className="inv-logo" />
              <div className="inv-brand-text">
                <h2 className="inv-company">J & R</h2>
                <span className="inv-tagline">Accesorios & Reparaciones</span>
              </div>
            </div>
            <div className="inv-title-block">
              <div className="inv-title">COTIZACIÓN</div>
              <div className="inv-number">{numCot}</div>
            </div>
          </div>

          {/* Datos empresa + Meta */}
          <div className="inv-meta-row">
            <div className="inv-empresa-datos">
              <div className="inv-dato"><span>R.T.N.:</span> {empresa.rtn || '---'}</div>
              <div className="inv-dato"><span>Dirección:</span> {empresa.direccion || '---'}</div>
              <div className="inv-dato"><span>Celular:</span> {empresa.telefono || '---'}</div>
              <div className="inv-dato"><span>E-mail:</span> {empresa.correo || '---'}</div>
            </div>
            <div className="inv-meta-datos">
              <table className="inv-meta-table">
                <tbody>
                  <tr><td>Fecha emisión:</td><td>{fechaEmision}</td></tr>
                  <tr><td>Válida hasta:</td><td>{fechaVenc}</td></tr>
                  <tr><td>Vigencia:</td><td>{cotizacion.vigencia_dias || 15} días</td></tr>
                  <tr><td>Vendedor:</td><td>{cotizacion.usuario?.nombre_usuario || '-'}</td></tr>
                  <tr><td>Estado:</td><td>{estadoBadge(cotizacion.estado_cotizacion)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cliente */}
          <div className="inv-client-box">
            <div className="inv-client-label">COTIZADO A</div>
            <div className="inv-client-content">
              <div className="inv-client-name">{cotizacion.cliente?.nombre} {cotizacion.cliente?.apellido || ''}</div>
              <div className="inv-client-details">
                {cotizacion.cliente?.dni && <span><strong>DNI:</strong> {cotizacion.cliente.dni}</span>}
                {cotizacion.cliente?.empresa && <span><strong>Empresa:</strong> {cotizacion.cliente.empresa}</span>}
                {cotizacion.cliente?.telefono && <span><strong>Tel:</strong> {cotizacion.cliente.telefono}</span>}
                {cotizacion.cliente?.email && <span>{cotizacion.cliente.email}</span>}
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
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
              {cotizacion.detalles?.map((d, i) => {
                const descPct = parseFloat(d.descuento) || 0;
                return (
                  <tr key={d.cod_detalle_cotizacion} className={i % 2 === 0 ? 'inv-row-even' : ''}>
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

          {/* Resumen totales */}
          <div className="inv-summary">
            <div className="inv-summary-left">
              <div className="inv-summary-note">
                <strong>Artículos:</strong> {cotizacion.detalles?.length || 0} productos ({cantidadItems} unidades)
              </div>
              {cotizacion.observaciones && (
                <div className="inv-summary-note inv-note-light" style={{ whiteSpace: 'pre-wrap' }}>
                  <strong>Observaciones:</strong> {cotizacion.observaciones}
                </div>
              )}
              <div className="inv-summary-note inv-note-light">
                Cotización válida por {cotizacion.vigencia_dias || 15} días. Los precios pueden variar al momento de la facturación.
              </div>
              {cotizacion.cod_factura && (
                <div className="inv-summary-note" style={{ color: 'var(--jyr-red)', fontWeight: 600 }}>
                  Factura generada: FAC-{String(cotizacion.cod_factura).padStart(6, '0')}
                </div>
              )}
            </div>
            <div className="inv-summary-right">
              <div className="inv-total-line">
                <span>Subtotal</span>
                <span>{formatMoney(cotizacion.subtotal)}</span>
              </div>
              {parseFloat(cotizacion.descuento) > 0 && (
                <div className="inv-total-line" style={{ color: '#dc3545' }}>
                  <span>Descuento</span>
                  <span>- {formatMoney(cotizacion.descuento)}</span>
                </div>
              )}
              <div className="inv-total-line">
                <span>ISV (15%)</span>
                <span>{formatMoney(cotizacion.isv)}</span>
              </div>
              <div className="inv-total-line inv-grand-total">
                <span>TOTAL ESTIMADO</span>
                <span>{formatMoney(cotizacion.total)}</span>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="inv-footer">
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, marginBottom: 8, color: 'var(--jyr-red)' }}>
              DOCUMENTO NO FISCAL — COTIZACIÓN
            </div>
            <div className="inv-footer-top">
              <div className="inv-footer-col">
                <div className="inv-sign-line" />
                <span>Firma Autorizada</span>
              </div>
              <div className="inv-footer-col">
                <div className="inv-sign-line" />
                <span>Aceptación del Cliente</span>
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

        <div className="inv-bottombar" />
      </div>
    </div>
  );
};

// ==========================================
// BUSCADOR DE PRODUCTOS (para cotizaciones — sin restricción estricta de stock)
// ==========================================
const BuscadorProductoCot = ({ onAgregar, itemsActuales = [] }) => {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = useCallback(async (texto) => {
    if (texto.length < 1) { setResultados([]); setAbierto(false); return; }
    setCargando(true);
    try {
      const { data } = await cotizacionService.productosDisponibles({ buscar: texto });
      if (data.ok) { setResultados(data.datos); setAbierto(true); setIndiceActivo(-1); }
    } catch { setResultados([]); } finally { setCargando(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, buscar]);

  const seleccionar = (p) => {
    if (itemsActuales.some(i => i.cod_producto === p.cod_producto)) {
      toast.warning(`"${p.nombre_producto}" ya está en la cotización`);
      return;
    }
    onAgregar({
      cod_producto: p.cod_producto,
      nombre_producto: p.nombre_producto,
      unidad_medida: p.unidad_medida,
      precio_venta: parseFloat(p.precio_venta),
      isv_pct: parseFloat(p.isv) || 0,
      stock: p.stock,
      cantidad: 1
    });
    setQuery(''); setResultados([]); setAbierto(false);
    inputRef.current?.focus();
  };

  const keyDown = (e) => {
    if (!abierto || resultados.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceActivo(i => (i < resultados.length - 1 ? i + 1 : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceActivo(i => (i > 0 ? i - 1 : resultados.length - 1)); }
    else if (e.key === 'Enter' && indiceActivo >= 0) { e.preventDefault(); seleccionar(resultados[indiceActivo]); }
    else if (e.key === 'Escape') { setAbierto(false); }
  };

  return (
    <div className="prod-search" ref={wrapperRef}>
      <label className="prod-search-label"><FiPackage className="me-1" />Buscar Producto <span className="text-muted">(código o nombre)</span></label>
      <div className="prod-search-input-wrapper">
        <FiSearch className="prod-search-icon" />
        <input ref={inputRef} type="text" className="prod-search-input" placeholder="Ej: 101 ó Filtro de aceite..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
          onKeyDown={keyDown} autoComplete="off" />
        {query && <button className="prod-search-clear" onClick={() => { setQuery(''); setResultados([]); setAbierto(false); inputRef.current?.focus(); }} type="button"><FiX /></button>}
        {cargando && <div className="prod-search-spinner" />}
      </div>
      {abierto && (
        <div className="prod-search-dropdown">
          {resultados.length === 0 && !cargando ? (
            <div className="prod-search-empty"><FiSearch className="me-2" />No se encontraron productos para "<strong>{query}</strong>"</div>
          ) : resultados.map((p, idx) => {
            const yaEn = itemsActuales.some(i => i.cod_producto === p.cod_producto);
            return (
              <div key={p.cod_producto}
                className={`prod-search-item ${idx === indiceActivo ? 'active' : ''} ${yaEn ? 'disabled' : ''}`}
                onClick={() => !yaEn && seleccionar(p)} onMouseEnter={() => setIndiceActivo(idx)}>
                <div className="prod-search-item-code">#{p.cod_producto}</div>
                <div className="prod-search-item-info">
                  <div className="prod-search-item-name">{p.nombre_producto} {yaEn && <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>Ya agregado</span>}</div>
                  <div className="prod-search-item-meta"><span>{p.unidad_medida || 'UND'}</span>{p.isv > 0 && <span className="ms-2">ISV: {p.isv}%</span>}</div>
                </div>
                <div className="prod-search-item-price">{formatMoney(p.precio_venta)}</div>
                <div className={`prod-search-item-stock ${p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : 'ok'}`}>
                  {p.stock <= 0 ? <><FiAlertTriangle className="me-1" />Sin Stock</> : <>Stock: {p.stock}</>}
                </div>
                {!yaEn && <div className="prod-search-item-add"><FiPlus /></div>}
              </div>
            );
          })}
          <div className="prod-search-help"><span>↑↓ navegar</span><span>↵ seleccionar</span><span>Esc cerrar</span></div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// FORMULARIO NUEVA COTIZACIÓN
// ==========================================
const NuevaCotizacion = ({ onVolver, onCreada }) => {
  const [clientes, setClientes] = useState([]);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [items, setItems] = useState([]);
  const [vigenciaDias, setVigenciaDias] = useState(15);
  const [observaciones, setObservaciones] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [tipoDescGlobal, setTipoDescGlobal] = useState('PORCENTAJE');
  const [guardando, setGuardando] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  // Buscar clientes
  useEffect(() => {
    if (buscarCliente.length < 2) { setClientes([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await cotizacionService.clientesDisponibles({ buscar: buscarCliente });
        if (data.ok) setClientes(data.datos);
      } catch { /* silenciar */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscarCliente]);

  const seleccionarCliente = (c) => { setClienteSeleccionado(c); setBuscarCliente(''); setShowClienteDropdown(false); };

  const agregarProducto = (producto) => {
    setItems(prev => [...prev, { ...producto, descuento: 0 }]);
  };
  const cambiarCantidad = (index, cantidad) => { const n = [...items]; n[index].cantidad = parseInt(cantidad) || 0; setItems(n); };
  const cambiarDescuento = (index, valor) => { const n = [...items]; n[index].descuento = Math.min(100, Math.max(0, parseFloat(valor) || 0)); setItems(n); };
  const eliminarItem = (index) => setItems(items.filter((_, i) => i !== index));

  const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;

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

  // Totales antes de descuento global
  const totalesLineas = items.reduce((acc, item) => {
    const calc = calcularItem(item);
    return {
      subtotalBruto: round2(acc.subtotalBruto + calc.subtotalBruto),
      descuento: round2(acc.descuento + calc.montoDescuento),
      subtotal: round2(acc.subtotal + calc.subtotal),
      isv: round2(acc.isv + calc.isv),
      total: round2(acc.total + calc.total)
    };
  }, { subtotalBruto: 0, descuento: 0, subtotal: 0, isv: 0, total: 0 });

  // Aplicar descuento global
  const dg = parseFloat(descuentoGlobal) || 0;
  let montoDescGlobal = 0;
  let subtotalFinal = totalesLineas.subtotal;
  let isvFinal = totalesLineas.isv;
  if (dg > 0) {
    if (tipoDescGlobal === 'PORCENTAJE') {
      montoDescGlobal = round2((dg / 100) * subtotalFinal);
    } else {
      montoDescGlobal = round2(Math.min(dg, subtotalFinal));
    }
    if (subtotalFinal > 0) {
      const factor = round2((subtotalFinal - montoDescGlobal) / subtotalFinal);
      isvFinal = round2(isvFinal * factor);
    }
    subtotalFinal = round2(subtotalFinal - montoDescGlobal);
  }
  const descuentoTotal = round2(totalesLineas.descuento + montoDescGlobal);
  const totalFinal = round2(subtotalFinal + isvFinal);

  const guardar = async () => {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return; }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    for (const item of items) {
      if (item.cantidad <= 0) { toast.error('La cantidad de cada producto debe ser mayor a 0'); return; }
    }

    setGuardando(true);
    try {
      const payload = {
        cod_cliente: clienteSeleccionado.cod_cliente,
        items: items.map(i => ({ cod_producto: i.cod_producto, cantidad: i.cantidad, descuento: i.descuento || 0 })),
        vigencia_dias: parseInt(vigenciaDias) || 15,
        observaciones: observaciones || null,
        descuento_global: dg > 0 ? dg : undefined,
        tipo_descuento_global: dg > 0 ? tipoDescGlobal : undefined
      };
      const { data } = await cotizacionService.crear(payload);
      if (data.ok) {
        toast.success('Cotización creada exitosamente');
        onCreada(data.datos?.cotizacion?.cod_cotizacion || data.datos?.cod_cotizacion);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear cotización');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <button className="btn btn-outline-secondary mb-3" onClick={onVolver}><FiArrowLeft className="me-2" />Volver</button>
      <h3 className="mb-4"><FiClipboard className="me-2" />Nueva Cotización</h3>

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
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setClienteSeleccionado(null)}><FiX /></button>
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
                          style={{ cursor: 'pointer' }} onClick={() => seleccionarCliente(c)}>
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

          {/* Buscador de productos */}
          <div className="jyr-card mb-3" style={{ overflow: 'visible' }}>
            <div className="jyr-card-body" style={{ overflow: 'visible' }}>
              <BuscadorProductoCot onAgregar={agregarProducto} itemsActuales={items} />
            </div>
          </div>

          {/* Tabla de ítems */}
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
                      <tr><td colSpan="10" className="text-center text-muted py-4">Agrega productos a la cotización</td></tr>
                    ) : items.map((item, index) => {
                      const calc = calcularItem(item);
                      return (
                        <tr key={item.cod_producto}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <strong>{item.nombre_producto}</strong>
                            <div className="text-muted small">Cód: {item.cod_producto} | Stock: {item.stock} {item.unidad_medida || 'und'}</div>
                          </td>
                          <td>{formatMoney(item.precio_venta)}</td>
                          <td>
                            <input type="number" className="form-control form-control-sm"
                              min="1" value={item.cantidad}
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

        {/* Columna derecha: opciones + resumen */}
        <div className="col-lg-4">
          {/* Opciones de cotización */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="mb-3">Opciones de Cotización</h6>
              <label className="form-label small">Vigencia (días)</label>
              <input type="number" className="form-control form-control-sm mb-2" min="1" max="90"
                value={vigenciaDias} onChange={(e) => setVigenciaDias(e.target.value)} />
              <label className="form-label small">Observaciones</label>
              <textarea className="form-control form-control-sm mb-2" rows="3" placeholder="Notas adicionales..."
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} />
              <small className="text-muted">{observaciones.length}/500</small>
            </div>
          </div>

          {/* Descuento global */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="mb-3">Descuento Global</h6>
              <div className="row g-2">
                <div className="col-7">
                  <input type="number" className="form-control form-control-sm" min="0" step="0.5"
                    placeholder="Monto o %" value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)} />
                </div>
                <div className="col-5">
                  <select className="form-select form-select-sm" value={tipoDescGlobal} onChange={(e) => setTipoDescGlobal(e.target.value)}>
                    <option value="PORCENTAJE">%</option>
                    <option value="MONTO">L</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="jyr-card">
            <div className="jyr-card-body">
              <h6 className="mb-3">Resumen</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>Ítems:</span><strong>{items.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal Bruto:</span><strong>{formatMoney(totalesLineas.subtotalBruto)}</strong>
              </div>
              {totalesLineas.descuento > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Desc. líneas:</span><strong>- {formatMoney(totalesLineas.descuento)}</strong>
                </div>
              )}
              {montoDescGlobal > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Desc. global:</span><strong>- {formatMoney(montoDescGlobal)}</strong>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal Neto:</span><strong>{formatMoney(subtotalFinal)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>ISV:</span><strong>{formatMoney(isvFinal)}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span className="fs-5 fw-bold">Total:</span>
              
                <span className="fs-5 fw-bold text-success">{formatMoney(totalFinal)}</span>
              </div>

              <button className="btn jyr-btn-primary w-100" disabled={guardando || items.length === 0 || !clienteSeleccionado}
                onClick={guardar}>
                {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : <FiClipboard className="me-2" />}
                Crear Cotización
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
const Cotizaciones = () => {
  const [vista, setVista] = useState('lista');
  const [cotizacionDetalle, setCotizacionDetalle] = useState(null);

  const irANueva = () => setVista('nueva');
  const irALista = () => { setVista('lista'); setCotizacionDetalle(null); };
  const verDetalle = (id) => { setCotizacionDetalle(id); setVista('detalle'); };

  switch (vista) {
    case 'nueva':
      return <NuevaCotizacion onVolver={irALista} onCreada={(id) => { if (id) verDetalle(id); else irALista(); }} />;
    case 'detalle':
      return <DetalleCotizacion codCotizacion={cotizacionDetalle} onVolver={irALista} onConvertida={irALista} />;
    default:
      return <ListaCotizaciones onNueva={irANueva} onVer={verDetalle} />;
  }
};

export default Cotizaciones;
