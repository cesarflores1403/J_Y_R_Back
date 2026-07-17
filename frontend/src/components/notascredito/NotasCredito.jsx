import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiSearch, FiFileText, FiPlusCircle,
  FiEye, FiXCircle, FiCheckCircle, FiAlertTriangle,
  FiChevronLeft, FiChevronRight, FiPackage, FiRefreshCw, FiX
} from 'react-icons/fi';
import { notaCreditoService, facturaService } from '../../services/serviceIndex.js';
import { confirmDialog } from '../../utils/notifications.js';
import SearchInput from '../common/SearchInput.jsx';
import ContadorLimite from '../common/ContadorLimite.jsx';

// =====================================================
// COMPONENTE: Notas de Crédito (HU-FAC-12)
// Vista: lista | nueva | detalle
// =====================================================

/* ========== LISTA DE NOTAS DE CRÉDITO ========== */
const ListaNotasCredito = ({ onVer, onNueva }) => {
  const [notas, setNotas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await notaCreditoService.listar({ pagina, buscar, limite: 15 });
      if (data.ok) {
        setNotas(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch (err) {
      toast.error('Error al cargar notas de crédito');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const formatMoneda = (n) => `L ${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0"><FiFileText className="me-2" />Notas de Crédito</h3>
        <button id="nc-btn-nueva" className="btn jyr-btn-primary" onClick={onNueva}>
          <FiPlusCircle className="me-1" /> Nueva Nota de Crédito
        </button>
      </div>

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <SearchInput
              id="nc-input-buscar"
              className="form-control" placeholder="Buscar por motivo o cliente..."
              value={buscar} onChange={val => { setBuscar(val); setPagina(1); }}
            />
            {buscar && (
              <button id="nc-btn-limpiar-buscar" className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}>
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th># NC</th>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="8" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : notas.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No se encontraron notas de crédito</td></tr>
                ) : notas.map(nc => (
                  <tr key={nc.cod_nota_credito}>
                    <td><strong>NC-{String(nc.cod_nota_credito).padStart(6, '0')}</strong></td>
                    <td><span className="badge bg-secondary">FAC-{String(nc.cod_factura).padStart(6, '0')}</span></td>
                    <td>{nc.factura?.cliente ? `${nc.factura.cliente.nombre} ${nc.factura.cliente.apellido}` : '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.motivo}</td>
                    <td><strong>{formatMoneda(nc.total)}</strong></td>
                    <td style={{ fontSize: 13 }}>{formatFecha(nc.fecha)}</td>
                    <td>
                      {nc.estado
                        ? <span className="badge bg-success">Activa</span>
                        : <span className="badge bg-danger">Anulada</span>
                      }
                    </td>
                    <td>
                      <button id={`nc-btn-ver-${nc.cod_nota_credito}`} className="btn btn-sm btn-outline-primary me-1" onClick={() => onVer(nc.cod_nota_credito)} title="Ver detalle">
                        <FiEye />
                      </button>
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
        <div className="d-flex justify-content-center mt-3 gap-2">
          <button id="nc-btn-pag-anterior" className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
            <FiChevronLeft />
          </button>
          <span className="align-self-center text-muted" style={{ fontSize: 13 }}>
            Página {pagina} de {totalPaginas}
          </span>
          <button id="nc-btn-pag-siguiente" className="btn btn-sm btn-outline-secondary" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

/* ========== DETALLE DE NOTA DE CRÉDITO ========== */
const DetalleNotaCredito = ({ codNota, onVolver, onRecargar }) => {
  const confirm = useConfirm();
  const [nota, setNota] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const { data } = await notaCreditoService.obtener(codNota);
        if (data.ok) setNota(data.datos);
      } catch { toast.error('Error al cargar nota de crédito'); }
      finally { setCargando(false); }
    })();
  }, [codNota]);

  const handleAnular = async () => {
    const ok = await confirmDialog({
      variant: 'cancel',
      title: 'Anular nota de crédito',
      text: '¿Está seguro de anular esta nota de crédito? Se revertirá el inventario si fue restaurado.',
      confirmText: 'Sí, anular'
    });
    if (!ok) return;
    setAnulando(true);
    try {
      const { data } = await notaCreditoService.anular(codNota);
      if (data.ok) {
        toast.success(data.mensaje);
        onRecargar?.();
        onVolver();
      } else {
        toast.error(data.mensaje);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular');
    } finally {
      setAnulando(false);
    }
  };

  const formatMoneda = (n) => `L ${parseFloat(n || 0).toFixed(2)}`;
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (cargando) return <div className="text-center py-5"><div className="spinner-border spinner-border-sm" /></div>;
  if (!nota) return <div className="text-center text-muted py-5">No se encontró la nota de crédito</div>;

  return (
    <div>
      <button id="nc-btn-volver-detalle" className="btn btn-sm btn-outline-secondary mb-3" onClick={onVolver}>
        <FiArrowLeft className="me-1" /> Volver
      </button>

      <div className="jyr-card mb-3">
        <div className="jyr-card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h4 className="mb-2">
                <FiFileText className="me-2 text-info" />
                NC-{String(nota.cod_nota_credito).padStart(6, '0')}
              </h4>
              <span className="badge bg-secondary me-2">
                Factura: FAC-{String(nota.cod_factura).padStart(6, '0')}
              </span>
              {nota.estado
                ? <span className="badge bg-success"><FiCheckCircle className="me-1" />Activa</span>
                : <span className="badge bg-danger"><FiXCircle className="me-1" />Anulada</span>
              }
            </div>
            {nota.estado && (
              <button id="nc-btn-anular" className="btn btn-outline-danger btn-sm" onClick={handleAnular} disabled={anulando}>
                <FiXCircle className="me-1" /> {anulando ? 'Anulando...' : 'Anular NC'}
              </button>
            )}
          </div>

          <div className="row mb-3" style={{ fontSize: 14 }}>
            <div className="col-md-4">
              <strong>Cliente:</strong> {nota.factura?.cliente ? `${nota.factura.cliente.nombre} ${nota.factura.cliente.apellido}` : '—'}
            </div>
            <div className="col-md-4">
              <strong>Creado por:</strong> {nota.usuario?.nombre_usuario || '—'}
            </div>
            <div className="col-md-4">
              <strong>Fecha:</strong> {formatFecha(nota.fecha)}
            </div>
          </div>
          <div className="mb-3" style={{ fontSize: 14 }}>
            <strong>Motivo:</strong> {nota.motivo}
          </div>
          <div className="mb-3" style={{ fontSize: 14 }}>
            <strong>Inventario restaurado:</strong> {nota.devolver_inventario ? <span className="text-success">Sí</span> : <span className="text-warning">No</span>}
          </div>
        </div>
      </div>

      {/* Tabla de detalles */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cant. Devuelta</th>
                  <th className="text-end">P. Unitario</th>
                  <th className="text-end">Descuento</th>
                  <th className="text-end">ISV</th>
                  <th className="text-end">Subtotal</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {(nota.detalles || []).map((d, i) => (
                  <tr key={i}>
                    <td>
                      <FiPackage className="me-1 text-info" />
                      {d.producto?.nombre_producto || `Producto #${d.cod_producto}`}
                    </td>
                    <td className="text-center">{d.cantidad_devuelta}</td>
                    <td className="text-end">{formatMoneda(d.precio_unitario)}</td>
                    <td className="text-end">{formatMoneda(d.descuento)}</td>
                    <td className="text-end">{formatMoneda(d.isv)}</td>
                    <td className="text-end">{formatMoneda(d.subtotal)}</td>
                    <td className="text-end"><strong>{formatMoneda(d.total)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="jyr-card">
        <div className="jyr-card-body text-end">
          <div>Subtotal: <strong>{formatMoneda(nota.subtotal)}</strong></div>
          <div>Descuento: <strong className="text-warning">- {formatMoneda(nota.descuento)}</strong></div>
          <div>ISV: <strong>{formatMoneda(nota.isv)}</strong></div>
          <div style={{ fontSize: 18 }} className="mt-1">
            Total NC: <strong className="text-danger">{formatMoneda(nota.total)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========== NUEVA NOTA DE CRÉDITO ========== */
const NuevaNotaCredito = ({ onVolver, onCreada }) => {
  const [paso, setPaso] = useState(1);
  const [buscarFactura, setBuscarFactura] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [buscandoFact, setBuscandoFact] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);

  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [items, setItems] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [devolverInventario, setDevolverInventario] = useState(true);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const buscarFacturas = async () => {
    if (!buscarFactura.trim()) return;
    setBuscandoFact(true);
    setYaBusco(true);
    try {
      const { data } = await facturaService.listar({ buscar: buscarFactura, limite: 10 });
      if (data.ok) {
        setFacturas((data.datos || []).filter(f => f.estado));
      } else {
        toast.error(data.mensaje || 'Error al buscar facturas');
        setFacturas([]);
      }
    } catch (err) {
      console.error('Error buscarFacturas:', err);
      toast.error(err.response?.data?.mensaje || 'Error al buscar facturas');
      setFacturas([]);
    } finally {
      setBuscandoFact(false);
    }
  };

  const seleccionarFactura = async (codFactura) => {
    setCargandoDetalles(true);
    try {
      const { data } = await notaCreditoService.detallesFactura(codFactura);
      if (data.ok) {
        setFacturaSeleccionada(data.datos.factura);
        setItems(data.datos.items.map(it => ({
          ...it,
          seleccionado: false,
          cantidad_devuelta: 0
        })));
        setPaso(2);
      } else {
        toast.error(data.mensaje);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cargar detalles de factura');
    } finally {
      setCargandoDetalles(false);
    }
  };

  const toggleItem = (idx) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const sel = !it.seleccionado;
      return { ...it, seleccionado: sel, cantidad_devuelta: sel ? it.cantidad_disponible : 0 };
    }));
  };

  const cambiarCantidad = (idx, val) => {
    const num = parseInt(val) || 0;
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const cant = Math.max(0, Math.min(num, it.cantidad_disponible));
      return { ...it, cantidad_devuelta: cant, seleccionado: cant > 0 };
    }));
  };

  const round2 = (n) => Math.round((parseFloat(n) + Number.EPSILON) * 100) / 100;
  const itemsSeleccionados = items.filter(it => it.seleccionado && it.cantidad_devuelta > 0);

  const calcularTotales = () => {
    let subtotal = 0, descuento = 0, isv = 0, total = 0;
    for (const it of itemsSeleccionados) {
      const proporcion = it.cantidad_devuelta / it.cantidad_original;
      const lineaSub = round2(it.precio_unitario * it.cantidad_devuelta);
      const lineaDesc = round2(it.monto_descuento * proporcion);
      const lineaIsv = round2(it.isv_linea * proporcion);
      const lineaTotal = round2(lineaSub - lineaDesc + lineaIsv);
      subtotal += lineaSub;
      descuento += lineaDesc;
      isv += lineaIsv;
      total += lineaTotal;
    }
    return { subtotal: round2(subtotal), descuento: round2(descuento), isv: round2(isv), total: round2(total) };
  };
  const totales = calcularTotales();

  const handleCrear = async () => {
    if (!motivo.trim()) return toast.warn('El motivo es obligatorio');
    if (itemsSeleccionados.length === 0) return toast.warn('Seleccione al menos un ítem a devolver');

    setEnviando(true);
    try {
      const payload = {
        cod_factura: facturaSeleccionada.cod_factura,
        motivo: motivo.trim(),
        devolver_inventario: devolverInventario,
        items: itemsSeleccionados.map(it => ({
          cod_detalle_factura: it.cod_detalle_factura,
          cantidad_devuelta: it.cantidad_devuelta
        }))
      };
      const { data } = await notaCreditoService.crear(payload);
      if (data.ok) {
        toast.success(data.mensaje || 'Nota de crédito creada');
        onCreada?.();
      } else {
        toast.error(data.mensaje);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear nota de crédito');
    } finally {
      setEnviando(false);
    }
  };

  const formatMoneda = (n) => `L ${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div>
      <button id="nc-btn-volver-nueva" className="btn btn-sm btn-outline-secondary mb-3" onClick={onVolver}>
        <FiArrowLeft className="me-1" /> Volver
      </button>

      <h3 className="mb-4">
        <FiPlusCircle className="me-2 text-info" />
        Nueva Nota de Crédito
      </h3>

      {/* ===== PASO 1: Seleccionar factura ===== */}
      {paso === 1 && (
        <div className="jyr-card">
          <div className="jyr-card-body">
            <h6 className="text-info mb-3">Paso 1: Seleccione la factura origen</h6>

            <div className="input-group mb-3" style={{ maxWidth: 500 }}>
              <span className="input-group-text"><FiSearch /></span>
              <SearchInput
                id="nc-input-buscar-factura"
                className="form-control" placeholder="Buscar por nombre, apellido o DNI del cliente..."
                value={buscarFactura} onChange={val => setBuscarFactura(val)}
                onKeyDown={e => e.key === 'Enter' && buscarFacturas()}
              />
              <button id="nc-btn-buscar-factura" className="btn jyr-btn-primary" onClick={buscarFacturas} disabled={buscandoFact}>
                Buscar
              </button>
            </div>

            {buscandoFact && <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>}
            {cargandoDetalles && <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-info" /> Cargando detalles...</div>}

            {!buscandoFact && facturas.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0">
                  <thead>
                    <tr>
                      <th># Factura</th>
                      <th>Cliente</th>
                      <th className="text-end">Total</th>
                      <th className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map(f => (
                      <tr key={f.cod_factura}>
                        <td><strong>FAC-{String(f.cod_factura).padStart(6, '0')}</strong></td>
                        <td>{f.cliente ? `${f.cliente.nombre} ${f.cliente.apellido}` : '—'}</td>
                        <td className="text-end">{formatMoneda(f.total)}</td>
                        <td className="text-center">
                          <button id={`nc-btn-seleccionar-factura-${f.cod_factura}`} className="btn btn-sm btn-outline-primary" onClick={() => seleccionarFactura(f.cod_factura)} disabled={cargandoDetalles}>
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!buscandoFact && yaBusco && facturas.length === 0 && (
              <div className="text-center text-muted py-3">No se encontraron facturas activas</div>
            )}
          </div>
        </div>
      )}

      {/* ===== PASO 2: Seleccionar ítems y crear ===== */}
      {paso === 2 && facturaSeleccionada && (
        <div>
          {/* Info factura */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong className="me-2">FAC-{String(facturaSeleccionada.cod_factura).padStart(6, '0')}</strong>
                  <span>
                    Cliente: <strong>
                      {facturaSeleccionada.cliente ? `${facturaSeleccionada.cliente.nombre} ${facturaSeleccionada.cliente.apellido}` : '—'}
                    </strong>
                  </span>
                  <span className="ms-3">
                    Total factura: <strong>{formatMoneda(facturaSeleccionada.total)}</strong>
                  </span>
                </div>
                <button id="nc-btn-cambiar-factura" className="btn btn-sm btn-outline-secondary" onClick={() => { setPaso(1); setFacturaSeleccionada(null); setItems([]); setMotivo(''); }}>
                  <FiRefreshCw className="me-1" /> Cambiar factura
                </button>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <label className="form-label" style={{ fontSize: 13 }}>Motivo de la nota de crédito *</label>
              <textarea
                id="nc-input-motivo"
                className="form-control" rows={2} placeholder="Ej: Producto defectuoso, error en facturación, devolución del cliente..."
                value={motivo} onChange={e => setMotivo(e.target.value.slice(0, 500))}
                maxLength={500}
              />
              <ContadorLimite value={motivo} max={500} />
              <div className="form-check mt-2">
                <input
                  type="checkbox" className="form-check-input" id="chkDevolverInv"
                  checked={devolverInventario} onChange={e => setDevolverInventario(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="chkDevolverInv" style={{ fontSize: 13 }}>
                  <FiPackage className="me-1" /> Devolver productos al inventario
                </label>
              </div>
            </div>
          </div>

          {/* Tabla de ítems */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <h6 className="text-info mb-3">Seleccione los ítems a devolver</h6>
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Producto</th>
                      <th className="text-center">Cant. Original</th>
                      <th className="text-center">Ya Devuelto</th>
                      <th className="text-center">Disponible</th>
                      <th className="text-center" style={{ width: 100 }}>Cant. a Devolver</th>
                      <th className="text-end">P. Unit.</th>
                      <th className="text-end">Total Línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const proporcion = it.cantidad_devuelta > 0 ? it.cantidad_devuelta / it.cantidad_original : 0;
                      const lineaTotal = it.cantidad_devuelta > 0
                        ? round2(it.precio_unitario * it.cantidad_devuelta - round2(it.monto_descuento * proporcion) + round2(it.isv_linea * proporcion))
                        : 0;
                      const noDisponible = it.cantidad_disponible <= 0;

                      return (
                        <tr key={idx} style={{ opacity: noDisponible ? 0.4 : 1 }}>
                          <td>
                            <input
                              id={`nc-check-item-${it.cod_detalle_factura}`}
                              type="checkbox" className="form-check-input"
                              checked={it.seleccionado} onChange={() => toggleItem(idx)}
                              disabled={noDisponible}
                            />
                          </td>
                          <td>
                            <FiPackage className="me-1 text-info" />
                            {it.nombre_producto}
                            {noDisponible && <span className="badge bg-warning ms-2" style={{ fontSize: 10 }}>Todo devuelto</span>}
                          </td>
                          <td className="text-center">{it.cantidad_original}</td>
                          <td className="text-center">{it.cantidad_original - it.cantidad_disponible}</td>
                          <td className="text-center">
                            <span className={it.cantidad_disponible > 0 ? 'text-success' : 'text-danger'}>
                              {it.cantidad_disponible}
                            </span>
                          </td>
                          <td className="text-center">
                            <input
                              id={`nc-input-item-cantidad-${it.cod_detalle_factura}`}
                              type="number" className="form-control form-control-sm text-center"
                              value={it.cantidad_devuelta} onChange={e => cambiarCantidad(idx, e.target.value)}
                              min={0} max={it.cantidad_disponible} disabled={noDisponible}
                              style={{ width: 70, margin: '0 auto' }}
                            />
                          </td>
                          <td className="text-end">{formatMoneda(it.precio_unitario)}</td>
                          <td className="text-end">
                            <strong className={lineaTotal > 0 ? 'text-danger' : 'text-muted'}>
                              {formatMoneda(lineaTotal)}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Resumen de totales */}
          <div className="jyr-card mb-3">
            <div className="jyr-card-body">
              <div className="row">
                <div className="col-md-6 d-flex align-items-center">
                  <div style={{ fontSize: 13 }}>
                    <FiAlertTriangle className="me-1 text-warning" />
                    {itemsSeleccionados.length} ítem(s) seleccionado(s) para devolución
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <div>Subtotal: <strong>{formatMoneda(totales.subtotal)}</strong></div>
                  <div>Descuento: <strong className="text-warning">- {formatMoneda(totales.descuento)}</strong></div>
                  <div>ISV: <strong>{formatMoneda(totales.isv)}</strong></div>
                  <div style={{ fontSize: 20 }} className="mt-1">
                    Total NC: <strong className="text-danger">{formatMoneda(totales.total)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón crear */}
          <div className="d-flex justify-content-end gap-2">
            <button id="nc-btn-cancelar-nueva" className="btn btn-outline-secondary" onClick={onVolver}>Cancelar</button>
            <button
              id="nc-btn-crear"
              className="btn jyr-btn-primary"
              onClick={handleCrear}
              disabled={enviando || itemsSeleccionados.length === 0 || !motivo.trim()}
            >
              {enviando ? <><span className="spinner-border spinner-border-sm me-1" /> Creando...</> : <><FiCheckCircle className="me-1" /> Crear Nota de Crédito</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========== COMPONENTE PRINCIPAL ========== */
const NotasCredito = () => {
  const [vista, setVista] = useState('lista');
  const [codNotaDetalle, setCodNotaDetalle] = useState(null);

  return (
    <div>
      {vista === 'lista' && (
        <ListaNotasCredito
          onVer={(id) => { setCodNotaDetalle(id); setVista('detalle'); }}
          onNueva={() => setVista('nueva')}
        />
      )}
      {vista === 'detalle' && codNotaDetalle && (
        <DetalleNotaCredito
          codNota={codNotaDetalle}
          onVolver={() => setVista('lista')}
          onRecargar={() => {}}
        />
      )}
      {vista === 'nueva' && (
        <NuevaNotaCredito
          onVolver={() => setVista('lista')}
          onCreada={() => setVista('lista')}
        />
      )}
    </div>
  );
};

export default NotasCredito;
