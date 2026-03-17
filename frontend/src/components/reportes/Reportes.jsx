import React, { useState, useEffect } from 'react';
import { reporteService } from '../../services/serviceIndex.js';
import { formatMoney } from '../../utils/helpers.js';
import { toast } from 'react-toastify';
import { FiDollarSign, FiPackage, FiDatabase } from 'react-icons/fi';

const Reportes = () => {
  const [tab, setTab] = useState('ventas');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [periodoVentas, setPeriodoVentas] = useState('mensual');

  const periodosDisponibles = [
    { value: 'diaria', label: 'Diaria' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'anual', label: 'Anual' }
  ];

  const cargar = async (tipo, periodo) => {
    setCargando(true);
    setDatos(null);
    try {
      let response;
      if (tipo === 'ventas') response = await reporteService.ventas({ periodo });
      else if (tipo === 'productos') response = await reporteService.productosVendidos();
      else if (tipo === 'inventario') response = await reporteService.inventario();

      if (response.data.ok) setDatos(response.data.datos);
    } catch (err) {
      toast.error('Error al cargar reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tab === 'ventas') {
      cargar(tab, periodoVentas);
      return;
    }
    cargar(tab);
  }, [tab, periodoVentas]);

  const tabs = [
    { key: 'ventas', label: 'Ventas', icon: <FiDollarSign /> },
    { key: 'productos', label: 'Productos Vendidos', icon: <FiPackage /> },
    { key: 'inventario', label: 'Inventario', icon: <FiDatabase /> },
  ];

  return (
    <div>
      <h3 className="mb-4">Reportes</h3>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.icon} <span className="ms-2">{t.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {cargando ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          {/* VENTAS */}
          {tab === 'ventas' && datos && (
            <div>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div>
                  <label className="form-label mb-1">Período</label>
                  <select
                    className="form-select"
                    style={{ minWidth: 220 }}
                    value={periodoVentas}
                    onChange={(e) => setPeriodoVentas(e.target.value)}
                  >
                    {periodosDisponibles.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  <strong>{datos.periodoDescripcion || 'Período'}</strong>
                  {datos.rango?.fecha_inicio && datos.rango?.fecha_fin
                    ? ` (${datos.rango.fecha_inicio} a ${datos.rango.fecha_fin})`
                    : ''}
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-3"><div className="jyr-stat-card">
                  <div className="stat-label">Total Facturas</div>
                  <div className="stat-value">{datos.resumen?.total_facturas || 0}</div>
                </div></div>
                <div className="col-md-3"><div className="jyr-stat-card">
                  <div className="stat-label">Subtotal</div>
                  <div className="stat-value" style={{ fontSize: 16 }}>{formatMoney(datos.resumen?.subtotal)}</div>
                </div></div>
                <div className="col-md-3"><div className="jyr-stat-card">
                  <div className="stat-label">ISV</div>
                  <div className="stat-value" style={{ fontSize: 16 }}>{formatMoney(datos.resumen?.isv)}</div>
                </div></div>
                <div className="col-md-3"><div className="jyr-stat-card">
                  <div className="stat-label">Total General</div>
                  <div className="stat-value" style={{ fontSize: 16, color: '#16a34a' }}>{formatMoney(datos.resumen?.total)}</div>
                </div></div>
              </div>

              <div className="jyr-card">
                <div className="jyr-card-header"><h5 className="mb-0">Detalle de Facturas</h5></div>
                <div className="jyr-card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead><tr>
                        <th>#</th><th>Cliente</th><th>Vendedor</th><th>Método Pago</th><th>Subtotal</th><th>ISV</th><th>Total</th><th>Estado</th>
                      </tr></thead>
                      <tbody>
                        {datos.detalle?.map(f => (
                          <tr key={f.cod_factura}>
                            <td>{f.cod_factura}</td>
                            <td>{f.cliente}</td>
                            <td>{f.nombre_usuario}</td>
                            <td>{f.metodo_pago || '-'}</td>
                            <td>{formatMoney(f.subtotal)}</td>
                            <td>{formatMoney(f.isv)}</td>
                            <td><strong>{formatMoney(f.total)}</strong></td>
                            <td>
                              <span className={`badge ${(() => {
                                const v = f.estado;
                                if (v === true) return 'bg-success';
                                if (v === false) return 'bg-danger';
                                if (v === 1 || v === '1') return 'bg-success';
                                if (typeof v === 'string') {
                                  const s = v.trim().toLowerCase();
                                  return ['activa', 'activo', 'true', '1', 'si', 'sí'].includes(s) ? 'bg-success' : 'bg-danger';
                                }
                                return v ? 'bg-success' : 'bg-danger';
                              })()}`}>{(() => {
                                const v = f.estado;
                                if (v === true) return 'Activa';
                                if (v === false) return 'Anulada';
                                if (v === 1 || v === '1') return 'Activa';
                                if (typeof v === 'string') {
                                  const s = v.trim().toLowerCase();
                                  return ['activa', 'activo', 'true', '1', 'si', 'sí'].includes(s) ? 'Activa' : 'Anulada';
                                }
                                return v ? 'Activa' : 'Anulada';
                              })()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTOS VENDIDOS */}
          {tab === 'productos' && datos && (
            <div className="jyr-card">
              <div className="jyr-card-header"><h5 className="mb-0">Ranking de Productos Más Vendidos</h5></div>
              <div className="jyr-card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead><tr><th>#</th><th>Producto</th><th>Unidades Vendidas</th><th>Total Ingresos</th></tr></thead>
                    <tbody>
                      {datos.productos?.length > 0 ? datos.productos.map((p, i) => (
                        <tr key={i}>
                          <td><span className="badge bg-dark">{i + 1}</span></td>
                          <td><strong>{p.nombre_producto}</strong></td>
                          <td>{parseInt(p.total_vendido).toLocaleString()}</td>
                          <td>{formatMoney(p.total_ingresos)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="text-center text-muted py-4">No hay datos de ventas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVENTARIO */}
          {tab === 'inventario' && datos && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4"><div className="jyr-stat-card">
                  <div className="stat-label">Total Productos</div>
                  <div className="stat-value">{datos.resumen?.totalProductos || 0}</div>
                </div></div>
                <div className="col-md-4"><div className="jyr-stat-card">
                  <div className="stat-label">Total Unidades</div>
                  <div className="stat-value">{(datos.resumen?.totalUnidades || 0).toLocaleString()}</div>
                </div></div>
                <div className="col-md-4"><div className="jyr-stat-card">
                  <div className="stat-label">Valor Total (Venta)</div>
                  <div className="stat-value" style={{ fontSize: 16, color: '#16a34a' }}>{formatMoney(datos.resumen?.valorTotal)}</div>
                </div></div>
              </div>

              <div className="jyr-card">
                <div className="jyr-card-header"><h5 className="mb-0">Inventario por Producto</h5></div>
                <div className="jyr-card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead><tr>
                        <th>Producto</th><th>Categoría</th><th>Precio Venta</th><th>Stock</th><th>Stock Mín.</th><th>Valor Total</th><th>Estado</th>
                      </tr></thead>
                      <tbody>
                        {datos.productos?.map((p, i) => (
                          <tr key={i}>
                            <td><strong>{p.nombre_producto}</strong></td>
                            <td>{p.nombre_categoria || '-'}</td>
                            <td>{formatMoney(p.precio_venta)}</td>
                            <td>{parseInt(p.stock_total)}</td>
                            <td>{parseInt(p.stock_minimo)}</td>
                            <td>{formatMoney(p.valor_total)}</td>
                            <td>
                              <span className={`badge ${parseInt(p.stock_total) <= parseInt(p.stock_minimo) && parseInt(p.stock_minimo) > 0 ? 'bg-danger' : 'bg-success'}`}>
                                {parseInt(p.stock_total) <= parseInt(p.stock_minimo) && parseInt(p.stock_minimo) > 0 ? 'Bajo' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reportes;
