import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { reporteService } from '../../services/serviceIndex.js';
import { formatMoney } from '../../utils/helpers.js';
import { FiUsers, FiTruck, FiPackage, FiFileText, FiAlertTriangle } from 'react-icons/fi';

const Dashboard = () => {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

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
        <div>
          <h3 className="mb-1">Dashboard</h3>
          <p className="text-muted mb-0">Bienvenido, <strong>{usuario?.nombre_usuario}</strong> ({usuario?.rol})</p>
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
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <div className="jyr-card animate-in">
            <div className="jyr-card-header"><h5 className="mb-0">Resumen de Ventas</h5></div>
            <div className="jyr-card-body">
              <div className="row text-center">
                <div className="col-4">
                  <div className="stat-label">Subtotal</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{formatMoney(datos?.ventasTotales?.subtotal)}</div>
                </div>
                <div className="col-4">
                  <div className="stat-label">ISV</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{formatMoney(datos?.ventasTotales?.isv)}</div>
                </div>
                <div className="col-4">
                  <div className="stat-label">Total</div>
                  <div className="stat-value" style={{ fontSize: 18, color: '#16a34a' }}>{formatMoney(datos?.ventasTotales?.total)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="jyr-card animate-in">
            <div className="jyr-card-header"><h5 className="mb-0">Alertas</h5></div>
            <div className="jyr-card-body text-center">
              <FiAlertTriangle size={32} style={{ color: datos?.stockBajo > 0 ? '#ef4444' : '#10b981' }} />
              <div className="stat-value mt-2">{datos?.stockBajo || 0}</div>
              <div className="stat-label">Productos con stock bajo</div>
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
                      <span className={`badge ${f.estado ? 'bg-success' : 'bg-danger'}`}>
                        {f.estado ? 'Activa' : 'Anulada'}
                      </span>
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
