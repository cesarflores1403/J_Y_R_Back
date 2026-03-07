import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiDownload, FiFilter, FiX, FiClock, FiUser, FiFileText, FiAlertTriangle, FiTrash2, FiXCircle, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { auditoriaFacturacionService } from '../../services/serviceIndex.js';

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
};

const getEventoConfig = (evento) => EVENTO_CONFIG[evento] || { icon: <FiClock />, color: '#888', label: evento };

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const AuditoriaFacturacion = () => {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Filtros
  const [filtroEvento, setFiltroEvento] = useState('');
  const [filtroFactura, setFiltroFactura] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroBuscar, setFiltroBuscar] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [tiposEvento, setTiposEvento] = useState([]);

  // Detalle expandido
  const [expandido, setExpandido] = useState(null);

  // Cargar tipos de evento
  useEffect(() => {
    auditoriaFacturacionService.tiposEvento()
      .then(resp => setTiposEvento(resp.data?.datos || []))
      .catch(() => {});
  }, []);

  // Cargar registros
  const cargar = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const params = { pagina: pag, limite: 20 };
      if (filtroEvento) params.evento = filtroEvento;
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
  }, [filtroEvento, filtroFactura, filtroFechaDesde, filtroFechaHasta, filtroBuscar]);

  useEffect(() => { cargar(1); }, [cargar]);

  // Exportar CSV
  const exportarCSV = async () => {
    setExportando(true);
    try {
      const params = {};
      if (filtroEvento) params.evento = filtroEvento;
      if (filtroFactura) params.cod_factura = filtroFactura;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (filtroBuscar) params.buscar = filtroBuscar;

      const resp = await auditoriaFacturacionService.exportarCSV(params);
      const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_facturacion_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
    } catch (err) {
      toast.error('Error al exportar: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setExportando(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroEvento('');
    setFiltroFactura('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroBuscar('');
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-HN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const formatFactura = (cod) => cod ? `FAC-${String(cod).padStart(6, '0')}` : '—';

  const renderDetalle = (detalle) => {
    if (!detalle) return <span className="text-muted">Sin detalle</span>;
    return (
      <div style={{ fontSize: '0.78rem', maxHeight: 200, overflow: 'auto' }}>
        {Object.entries(detalle).map(([key, val]) => (
          <div key={key} className="mb-1">
            <strong style={{ color: '#aaa' }}>{key}:</strong>{' '}
            <span style={{ color: '#e0e0e0' }}>
              {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const hayFiltrosActivos = filtroEvento || filtroFactura || filtroFechaDesde || filtroFechaHasta || filtroBuscar;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="mb-1"><FiClock className="me-2" />Auditoría de Facturación</h3>
          <small className="text-muted">{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FiFilter className="me-1" />{mostrarFiltros ? 'Ocultar' : 'Filtros'}
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={exportarCSV} disabled={exportando || total === 0}>
            {exportando ? <span className="spinner-border spinner-border-sm me-1" /> : <FiDownload className="me-1" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="jyr-card mb-3" style={{ border: '1px solid #333' }}>
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
                  <input type="text" className="form-control" placeholder="Usuario, evento..."
                    value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)} />
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
              <table className="table table-dark table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #444' }}>
                    <th style={{ width: 60 }}>#</th>
                    <th style={{ width: 180 }}>Evento</th>
                    <th style={{ width: 130 }}>Factura</th>
                    <th>Usuario</th>
                    <th style={{ width: 180 }}>Fecha</th>
                    <th style={{ width: 80 }} className="text-center">Detalle</th>
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
                        </tr>
                        {isExpanded && reg.detalle && (
                          <tr>
                            <td colSpan={6} style={{ background: '#1a1a2e', borderLeft: `3px solid ${cfg.color}`, padding: '12px 20px' }}>
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
