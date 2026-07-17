import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiDownload, FiFilter, FiX, FiClock, FiUser, FiFileText, FiAlertTriangle, FiTrash2, FiXCircle, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { auditoriaFacturacionService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { confirmDialog } from '../../utils/notifications.js';
import SearchInput from '../common/SearchInput.jsx';

// ==========================================
// ICONOS Y COLORES POR TIPO DE EVENTO
// ==========================================
const EVENTO_CONFIG = {
  FACTURA_CREADA:    { icon: <FiFileText />, color: '#4caf50', label: 'Factura Creada' },
  FACTURA_ANULADA:   { icon: <FiXCircle />,  color: '#f44336', label: 'Factura Anulada' },
  FACTURA_ELIMINADA: { icon: <FiTrash2 />,   color: '#ff5722', label: 'Factura Eliminada' },
  EXCEPCION_STOCK:   { icon: <FiAlertTriangle />, color: '#ff9800', label: 'Excepción Stock' },
  COTIZACION_CONVERTIDA: { icon: <FiRefreshCw />, color: '#2196f3', label: 'Cotización Convertida' },
  PAGO_REGISTRADO:   { icon: <FiClock />,    color: '#9c27b0', label: 'Pago Registrado' },
  PAGO_ANULADO:       { icon: <FiXCircle />,  color: '#795548', label: 'Pago Anulado' },
  CLIENTE_ACTUALIZADO: { icon: <FiUser />, color: '#0d6efd', label: 'Cliente Actualizado' },
  PRODUCTO_ACTUALIZADO: { icon: <FiFileText />, color: '#198754', label: 'Producto Actualizado' },
  PRODUCTO_ESTADO_MASIVO: { icon: <FiRefreshCw />, color: '#20c997', label: 'Cambio Masivo de Productos' },
  LOGIN_EXITOSO: { icon: <FiUser />, color: '#198754', label: 'Login Exitoso' },
  LOGIN_FALLIDO: { icon: <FiAlertTriangle />, color: '#dc3545', label: 'Login Fallido' },
  LOGIN_BLOQUEADO: { icon: <FiXCircle />, color: '#6f42c1', label: 'Login Bloqueado' },
};

const getEventoConfig = (evento) => EVENTO_CONFIG[evento] || { icon: <FiClock />, color: '#888', label: evento };
const ZONA_HORARIA_LOCAL = 'America/Tegucigalpa';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const AuditoriaFacturacion = () => {
  const { usuario } = useAuth();
  const esSuperAdmin = usuario?.rol === 'Super Administrador';
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Filtros
  const [filtroEvento, setFiltroEvento] = useState('');
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroFactura, setFiltroFactura] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroBuscar, setFiltroBuscar] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [tiposEntidad, setTiposEntidad] = useState([]);

  // Detalle expandido
  const [expandido, setExpandido] = useState(null);

  // Cargar tipos de evento
  useEffect(() => {
    auditoriaFacturacionService.tiposEvento()
      .then(resp => setTiposEvento(resp.data?.datos || []))
      .catch(() => {});
    auditoriaFacturacionService.tiposEntidad()
      .then(resp => setTiposEntidad(resp.data?.datos || []))
      .catch(() => {});
  }, []);

  // Cargar registros
  const cargar = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const params = { pagina: pag, limite: 20 };
      if (filtroEvento) params.evento = filtroEvento;
      if (filtroEntidad) params.entidad = filtroEntidad;
      if (filtroFactura) params.cod_factura = filtroFactura;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (filtroBuscar) params.buscar = filtroBuscar;

      const resp = await auditoriaFacturacionService.listar(params);
      const data = resp.data || resp;
      setRegistros(data.datos || []);
      setTotal(data.total || 0);
      setPagina(data.pagina || 1);
      setTotalPaginas(data.totalPaginas || 1);
    } catch (err) {
      toast.error('Error al cargar auditoría: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  }, [filtroEvento, filtroEntidad, filtroFactura, filtroFechaDesde, filtroFechaHasta, filtroBuscar]);

  useEffect(() => { cargar(1); }, [cargar]);

  // Exportar Excel
  const exportarExcel = async () => {
    setExportando(true);
    try {
      const params = {};
      if (filtroEvento) params.evento = filtroEvento;
      if (filtroEntidad) params.entidad = filtroEntidad;
      if (filtroFactura) params.cod_factura = filtroFactura;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (filtroBuscar) params.buscar = filtroBuscar;

      const resp = await auditoriaFacturacionService.exportarExcel(params);
      const blob = new Blob(
        [resp.data],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_facturacion_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado correctamente');
    } catch (err) {
      toast.error('Error al exportar: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setExportando(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroEvento('');
    setFiltroEntidad('');
    setFiltroFactura('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroBuscar('');
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-HN', {
      timeZone: ZONA_HORARIA_LOCAL,
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  };

  const formatFactura = (cod) => cod ? `FAC-${String(cod).padStart(6, '0')}` : '—';
  const formatEntidad = (entidad) => String(entidad || 'FACTURA').replaceAll('_', ' ');

  const formatValorDetalle = (valor) => {
    if (valor === null || valor === undefined || valor === '') return 'Sin valor';
    if (typeof valor === 'boolean') return valor ? 'Si' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
    return String(valor);
  };

  const renderCambios = (cambios, titulo = 'Datos cambiados') => {
    if (!Array.isArray(cambios) || cambios.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-muted fw-semibold mb-1" style={{ fontSize: '0.78rem' }}>{titulo}</div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.78rem' }}>
            <thead className="table-light">
              <tr>
                <th>Campo</th>
                <th>Antes</th>
                <th>Despues</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((cambio, index) => (
                <tr key={`${cambio.campo || 'campo'}-${index}`}>
                  <td className="fw-semibold">{cambio.campo || 'Campo'}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{formatValorDetalle(cambio.antes)}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{formatValorDetalle(cambio.despues)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDetallesFactura = (detalles) => {
    if (!Array.isArray(detalles) || detalles.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-muted fw-semibold mb-1" style={{ fontSize: '0.78rem' }}>Detalle de productos y precios</div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.76rem' }}>
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Desc.</th>
                <th>ISV</th>
                <th>Subtotal</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((item, index) => (
                <tr key={`${item.cod_detalle_factura || item.cod_producto || 'item'}-${index}`}>
                  <td>{item.linea || index + 1}</td>
                  <td>
                    <div className="fw-semibold">{item.nombre_item || item.descripcion_item || item.cod_producto || 'Item'}</div>
                    <small className="text-muted">{item.tipo_item || 'PRODUCTO'}{item.cod_producto ? ` - Cod. ${item.cod_producto}` : ''}</small>
                  </td>
                  <td>{formatValorDetalle(item.cantidad)}</td>
                  <td>{formatValorDetalle(item.precio_unitario)}</td>
                  <td>{formatValorDetalle(item.monto_descuento ?? item.descuento)}</td>
                  <td>{formatValorDetalle(item.isv)}</td>
                  <td>{formatValorDetalle(item.subtotal)}</td>
                  <td>{formatValorDetalle(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDetalle = (detalle) => {
    if (!detalle) return <span className="text-muted">Sin detalle</span>;
    const cambios = Array.isArray(detalle.cambios) ? detalle.cambios : [];
    const entradas = Object.entries(detalle).filter(([key]) => !['cambios', 'detalles_factura'].includes(key));

    return (
      <div style={{ fontSize: '0.82rem', maxHeight: 220, overflow: 'auto' }}>
        {renderCambios(cambios)}
        {renderDetallesFactura(detalle.detalles_factura)}
        {entradas.map(([key, val]) => {
          if (key === 'pagos_reversados_detalle' && Array.isArray(val)) {
            return (
              <div key={key} className="mt-2">
                <strong className="text-muted" style={{ fontSize: '0.75rem' }}>pagos_reversados_detalle:</strong>
                {val.length === 0 ? (
                  <div className="text-muted">Sin pagos reversados</div>
                ) : val.map((pago, index) => (
                  <div key={`${pago.cod_pago || 'pago'}-${index}`} className="mt-2">
                    {renderCambios(pago.cambios, `Pago #${pago.cod_pago || index + 1} - monto ${formatValorDetalle(pago.monto)}`)}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div key={key} className="mb-1">
              <strong className="text-muted" style={{ fontSize: '0.75rem' }}>{key}:</strong>{' '}
              <span className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                {formatValorDetalle(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const hayFiltrosActivos = filtroEvento || filtroEntidad || filtroFactura || filtroFechaDesde || filtroFechaHasta || filtroBuscar;

  const eliminarEvento = async (id, eventoLabel) => {
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar evento de auditoría',
      text: `Se eliminará el evento "${eventoLabel}" de forma permanente.`,
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    try {
      await auditoriaFacturacionService.eliminar(id);
      toast.success('Evento eliminado correctamente');
      setExpandido((prev) => (prev === id ? null : prev));
      await cargar(pagina);
    } catch (err) {
      toast.error('Error al eliminar evento: ' + (err.response?.data?.mensaje || err.message));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="mb-1"><FiClock className="me-2" />Auditoría del Sistema</h3>
          <small className="text-muted">{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FiFilter className="me-1" />{mostrarFiltros ? 'Ocultar' : 'Filtros'}
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={exportarExcel} disabled={exportando || total === 0}>
            {exportando ? <span className="spinner-border spinner-border-sm me-1" /> : <FiDownload className="me-1" />}
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="jyr-card mb-3">
          <div className="jyr-card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label small">Evento</label>
                <select className="form-select form-select-sm" value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)}>
                  <option value="">Todos</option>
                  {tiposEvento.map(t => {
                    const cfg = getEventoConfig(t);
                    return <option key={t} value={t}>{cfg.label}</option>;
                  })}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small">Módulo</label>
                <select className="form-select form-select-sm" value={filtroEntidad} onChange={e => setFiltroEntidad(e.target.value)}>
                  <option value="">Todos</option>
                  {tiposEntidad.map(t => (
                    <option key={t} value={t}>{formatEntidad(t)}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small">N° Factura</label>
                <input type="number" className="form-control form-control-sm" placeholder="Ej: 15"
                  value={filtroFactura} onChange={e => setFiltroFactura(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Desde</label>
                <input type="date" className="form-control form-control-sm"
                  value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Hasta</label>
                <input type="date" className="form-control form-control-sm"
                  value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Buscar</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><FiSearch /></span>
                  <SearchInput className="form-control" placeholder="Usuario, evento, módulo, detalle..."
                    value={filtroBuscar} onChange={val => setFiltroBuscar(val)} />
                </div>
              </div>
              <div className="col-md-2 d-flex gap-1">
                {hayFiltrosActivos && (
                  <button className="btn btn-outline-warning btn-sm w-100" onClick={limpiarFiltros}>
                    <FiX className="me-1" />Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de registros */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-info" />
              <p className="mt-2 text-muted">Cargando registros...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-5">
              <FiClock size={48} className="text-muted mb-3" />
              <p className="text-muted">No hay registros de auditoría{hayFiltrosActivos ? ' con los filtros aplicados' : ''}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Evento</th>
                    <th style={{ width: 130 }}>Módulo</th>
                    <th style={{ width: 140 }}>Factura</th>
                    <th>Usuario</th>
                    <th style={{ width: 190 }}>Fecha</th>
                    <th style={{ width: 95 }} className="text-center">Detalle</th>
                    {esSuperAdmin && <th style={{ width: 100 }} className="text-center">Eliminar</th>}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((reg) => {
                    const cfg = getEventoConfig(reg.evento);
                    const isExpanded = expandido === reg.cod_bitacora;
                    return (
                      <React.Fragment key={reg.cod_bitacora}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => setExpandido(isExpanded ? null : reg.cod_bitacora)}>
                          <td className="text-muted">{reg.cod_bitacora}</td>
                          <td>
                            <span className="d-inline-flex align-items-center gap-1" style={{ color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">{formatEntidad(reg.entidad)}</span>
                          </td>
                          <td>
                            {reg.cod_factura ? (
                              <span className="badge bg-secondary">{formatFactura(reg.cod_factura)}</span>
                            ) : '—'}
                          </td>
                          <td>
                            <FiUser className="me-1 text-muted" style={{ fontSize: '0.8rem' }} />
                            {reg.nombre_usuario || 'Sistema'}
                          </td>
                          <td className="text-muted">{formatFecha(reg.fecha)}</td>
                          <td className="text-center">
                            {reg.detalle ? (
                              <span className="badge bg-info" style={{ cursor: 'pointer', fontSize: '0.7rem' }}>
                                {isExpanded ? '▲ Ocultar' : '▼ Ver'}
                              </span>
                            ) : '—'}
                          </td>
                          {esSuperAdmin && (
                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => eliminarEvento(reg.cod_bitacora, cfg.label)}
                                title="Eliminar evento"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          )}
                        </tr>
                        {isExpanded && reg.detalle && (
                          <tr>
                            <td colSpan={esSuperAdmin ? 8 : 7} style={{ background: '#f8f9fa', borderLeft: `3px solid ${cfg.color}`, padding: '12px 20px' }}>
                              {renderDetalle(reg.detalle)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Página {pagina} de {totalPaginas} ({total} registros)
          </small>
          <div className="d-flex gap-1">
            <button className="btn btn-outline-secondary btn-sm" disabled={pagina <= 1}
              onClick={() => cargar(pagina - 1)}>
              <FiChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let p;
              if (totalPaginas <= 5) p = i + 1;
              else if (pagina <= 3) p = i + 1;
              else if (pagina >= totalPaginas - 2) p = totalPaginas - 4 + i;
              else p = pagina - 2 + i;
              return (
                <button key={p} className={`btn btn-sm ${p === pagina ? 'btn-info' : 'btn-outline-secondary'}`}
                  onClick={() => cargar(p)}>
                  {p}
                </button>
              );
            })}
            <button className="btn btn-outline-secondary btn-sm" disabled={pagina >= totalPaginas}
              onClick={() => cargar(pagina + 1)}>
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaFacturacion;
