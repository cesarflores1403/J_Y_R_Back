import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { reporteService } from '../../services/serviceIndex.js';
import { formatMoney } from '../../utils/helpers.js';
import { FiUsers, FiTruck, FiPackage, FiFileText, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import logoClean from '../../assets/img/logo2.jpeg';

const Dashboard = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [periodoVentas, setPeriodoVentas] = useState('mensual');
  const [resumenVentas, setResumenVentas] = useState(null);
  const [cargandoResumenVentas, setCargandoResumenVentas] = useState(false);
  const [errorResumenVentas, setErrorResumenVentas] = useState(false);

  const periodosDisponibles = [
    { value: 'diaria', label: 'Diaria' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'anual', label: 'Anual' }
  ];

  const stockBajo = Number(datos?.alertasInventario?.stockBajo ?? datos?.stockBajo ?? 0);
  const stockEnCero = Number(datos?.alertasInventario?.stockEnCero ?? datos?.stockEnCero ?? 0);
  const productosBajoMinimo = Array.isArray(datos?.productosBajoMinimo) ? datos.productosBajoMinimo : [];
  const totalAlertasInventario = Number(
    datos?.alertasInventario?.total ?? (stockBajo + stockEnCero)
  );
  const hayAlertasStock = totalAlertasInventario > 0;

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await reporteService.dashboard();
        if (data.ok) setDatos(data.datos);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    const cargarResumenVentas = async () => {
      setCargandoResumenVentas(true);
      try {
        const { data } = await reporteService.ventas({ periodo: periodoVentas });
        if (data?.ok) {
          setErrorResumenVentas(false);
          setResumenVentas({
            resumen: data?.datos?.resumen,
            periodoDescripcion: data?.datos?.periodoDescripcion,
            rango: data?.datos?.rango,
            ultimasFacturas: data?.datos?.ultimasFacturas || []
          });
        }
      } catch (err) {
        setErrorResumenVentas(true);
        setResumenVentas(null);
        console.error('Error cargando resumen de ventas:', err);
      } finally {
        setCargandoResumenVentas(false);
      }
    };

    cargarResumenVentas();
  }, [periodoVentas]);

  const ventasResumen = resumenVentas?.resumen || (errorResumenVentas ? {} : (datos?.ventasTotales || {}));
  const ultimasFacturasPeriodo = resumenVentas?.ultimasFacturas?.length
    ? resumenVentas.ultimasFacturas
    : (errorResumenVentas ? [] : (datos?.ultimasFacturas || []));
  const totalFacturasPeriodo = resumenVentas?.resumen?.total_facturas ?? null;

  if (cargando) return <div className="jyr-spinner" />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <img src={logoClean} alt="J&R" style={{ height: 62, objectFit: 'contain' }} />
          <div>
            <h3 className="mb-1">Dashboard</h3>
            <p className="text-muted mb-0">Bienvenido, <strong>{usuario?.nombre_usuario}</strong> ({usuario?.rol})</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="jyr-stat-card animate-in">
            <div className="stat-icon" style={{ color: '#3b82f6' }}><FiUsers size={24} /></div>
            <div className="stat-value">{datos?.totalClientes || 0}</div>
            <div className="stat-label">Clientes</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="jyr-stat-card animate-in">
            <div className="stat-icon" style={{ color: '#8b5cf6' }}><FiTruck size={24} /></div>
            <div className="stat-value">{datos?.totalProveedores || 0}</div>
            <div className="stat-label">Proveedores</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="jyr-stat-card animate-in">
            <div className="stat-icon" style={{ color: '#10b981' }}><FiPackage size={24} /></div>
            <div className="stat-value">{datos?.totalProductos || 0}</div>
            <div className="stat-label">Productos</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="jyr-stat-card animate-in">
            <div className="stat-icon" style={{ color: '#f59e0b' }}><FiFileText size={24} /></div>
            <div className="stat-value">{datos?.totalFacturas || 0}</div>
            <div className="stat-label">Facturas</div>
          </div>
        </div>
      </div>

      {/* Ventas totales + Stock bajo */}
      <div className="row g-3 mb-4 align-items-stretch">
        <div className="col-12 col-lg-6">
          <div className="jyr-card animate-in h-100 dash-ventas-card">
            <div className="jyr-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="mb-0">Resumen de Ventas</h5>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 180, maxWidth: 220 }}
                value={periodoVentas}
                onChange={(e) => setPeriodoVentas(e.target.value)}
              >
                {periodosDisponibles.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="jyr-card-body">
              <div className="dash-ventas-meta">
                <div className="dash-ventas-meta-item">
                  <strong>{resumenVentas?.periodoDescripcion || (errorResumenVentas ? 'No se pudo calcular el período' : 'Período actual')}</strong>
                  {resumenVentas?.rango?.fecha_inicio && resumenVentas?.rango?.fecha_fin
                    ? ` (${resumenVentas.rango.fecha_inicio} a ${resumenVentas.rango.fecha_fin})`
                    : ''}
                </div>
                <div className="dash-ventas-meta-item">
                  Facturas del período:{' '}
                  <strong>{totalFacturasPeriodo !== null ? Number(totalFacturasPeriodo).toLocaleString() : '-'}</strong>
                </div>
              </div>

              <div className="row text-center dash-ventas-grid">
                <div className="col-12 col-md-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">Subtotal</div>
                  <div className="stat-value dash-ventas-value">{formatMoney(ventasResumen?.subtotal)}</div>
                </div>
                <div className="col-12 col-md-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">ISV</div>
                  <div className="stat-value dash-ventas-value">{formatMoney(ventasResumen?.isv)}</div>
                </div>
                <div className="col-12 col-md-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">Total</div>
                  <div className="stat-value dash-ventas-value dash-ventas-total">{formatMoney(ventasResumen?.total)}</div>
                </div>
              </div>

              {cargandoResumenVentas && (
                <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                  Actualizando resumen de ventas...
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="jyr-card animate-in h-100 dash-alertas-card">
            <div className="jyr-card-header"><h5 className="mb-0">Alertas</h5></div>
            <div className="jyr-card-body dash-alertas-body">
              <div className="dash-alertas-main">
                <div className={`dash-alertas-icon ${hayAlertasStock ? 'is-danger' : 'is-ok'}`}>
                  <FiAlertTriangle size={24} />
                </div>
                <div>
                  <div className="dash-alertas-number">{totalAlertasInventario}</div>
                  <div className="dash-alertas-label">Total de alertas de inventario</div>
                </div>
              </div>

              <div className="dash-alertas-breakdown">
                <div className="dash-alerta-chip is-warning">
                  <span className="dash-alerta-chip-label">Stock bajo</span>
                  <strong>{stockBajo}</strong>
                </div>
                <div className="dash-alerta-chip is-danger">
                  <span className="dash-alerta-chip-label">Sin existencia (0)</span>
                  <strong>{stockEnCero}</strong>
                </div>
              </div>

              <div className={`dash-alertas-status ${hayAlertasStock ? 'is-danger' : 'is-ok'}`}>
                {hayAlertasStock ? 'Requiere atencion inmediata' : 'Inventario en estado controlado'}
              </div>

              <div className="dash-alertas-actions">
                <button
                  type="button"
                  className={`btn dash-alertas-btn ${hayAlertasStock ? 'is-danger' : 'is-ok'}`}
                  onClick={() => navigate('/inventario/existencias')}
                >
                  Ver existencias
                  <FiArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="jyr-card animate-in mb-4">
        <div className="jyr-card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">Productos por debajo del mínimo</h5>
          <span className={`badge ${productosBajoMinimo.length > 0 ? 'bg-danger' : 'bg-success'}`}>
            {productosBajoMinimo.length}
          </span>
        </div>
        <div className="jyr-card-body p-0">
          {productosBajoMinimo.length === 0 ? (
            <div className="text-center text-muted py-4">
              No hay productos por debajo del stock mínimo.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Máximo</th>
                    <th>Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {productosBajoMinimo.map((p) => (
                    <tr key={p.cod_producto}>
                      <td><strong>{`PROD-${String(p.cod_producto).padStart(4, '0')}`}</strong></td>
                      <td>{p.nombre_producto}</td>
                      <td>{Number(p.stock_total ?? 0)}</td>
                      <td>{Number(p.umbral_stock ?? p.stock_minimo ?? 0)}</td>
                      <td>
                        <span className="badge bg-danger">{Number(p.faltante ?? 0)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Últimas facturas */}
      <div className="jyr-card animate-in">
        <div className="jyr-card-header"><h5 className="mb-0">Últimas Facturas</h5></div>
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th># Factura</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimasFacturasPeriodo.length > 0 ? ultimasFacturasPeriodo.map((f) => (
                  <tr key={f.cod_factura}>
                    <td><strong>{f.cod_factura}</strong></td>
                    <td>{f.cliente || `${f.nombre || ''} ${f.apellido || ''}`.trim()}</td>
                    <td>{f.nombre_usuario}</td>
                    <td>{formatMoney(f.total)}</td>
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
                )) : (
                  <tr><td colSpan="5" className="text-center text-muted py-4">No hay facturas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
