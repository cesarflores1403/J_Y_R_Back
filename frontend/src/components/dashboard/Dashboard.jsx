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
  const stockBajo = Number(datos?.alertasInventario?.stockBajo ?? datos?.stockBajo ?? 0);
  const stockEnCero = Number(datos?.alertasInventario?.stockEnCero ?? datos?.stockEnCero ?? 0);
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

  if (cargando) return <div className="jyr-spinner" />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <img src={logoClean} alt="J&R" style={{ height: 48, objectFit: 'contain' }} />
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
            <div className="jyr-card-header"><h5 className="mb-0">Resumen de Ventas</h5></div>
            <div className="jyr-card-body">
              <div className="row text-center dash-ventas-grid">
                <div className="col-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">Subtotal</div>
                  <div className="stat-value dash-ventas-value">{formatMoney(datos?.ventasTotales?.subtotal)}</div>
                </div>
                <div className="col-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">ISV</div>
                  <div className="stat-value dash-ventas-value">{formatMoney(datos?.ventasTotales?.isv)}</div>
                </div>
                <div className="col-4 dash-ventas-item">
                  <div className="stat-label dash-ventas-label">Total</div>
                  <div className="stat-value dash-ventas-value dash-ventas-total">{formatMoney(datos?.ventasTotales?.total)}</div>
                </div>
              </div>
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
                {datos?.ultimasFacturas?.length > 0 ? datos.ultimasFacturas.map((f) => (
                  <tr key={f.cod_factura}>
                    <td><strong>{f.cod_factura}</strong></td>
                    <td>{f.nombre} {f.apellido || ''}</td>
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
