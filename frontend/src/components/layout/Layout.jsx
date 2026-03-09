import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import { FiLogOut } from 'react-icons/fi';

const pageNames = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/ubicaciones': 'Ubicaciones',
  // // Submodulos de Inventario con titulo independiente en topbar
  '/inventario/existencias': 'Existencias',
  '/inventario/kardex': 'Kardex',
  '/inventario/entradas': 'Entradas',
  '/inventario/salidas': 'Salidas',
  '/inventario/bajas': 'Bajas',
  // // Submodulo de transferencias en Inventario
  '/inventario/transferencias': 'Transferencias',
  // // Submodulo de conteos fisicos en Inventario
  '/inventario/conteos': 'Conteos',
  // // Submodulo de reservas en Inventario
  '/inventario/reservas': 'Reservas',
  // // Fallback por segmento base de inventario
  '/inventario': 'Inventario',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/reportes': 'Reportes',
  '/facturas': 'Facturacion',
  '/auditoria-facturacion': 'Auditoría de Facturación',
  '/notas-credito': 'Notas de Crédito',
  '/cotizaciones': 'Cotizaciones',
  '/usuarios': 'Usuarios',
  '/compras/ordenes': 'Órdenes de Compra',
  '/carrusel': 'Carrusel',
  '/config-empresa': 'Configuración de Empresa',
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, cerrarSesion } = useAuth();

  // // Fallback por primer segmento para rutas no mapeadas de forma exacta
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  // // Priorizamos coincidencia exacta y luego fallback
  const pageName = pageNames[location.pathname] || pageNames[basePath] || 'JYR Sistema';

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  return (
    <div>
      <Sidebar />
      <main className="jyr-main">
        <header className="jyr-topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="jyr-topbar-title">{pageName}</span>
          </div>
          <div className="jyr-topbar-actions">
            {usuario && (
              <span className="jyr-topbar-user-label">
                {usuario.nombre_usuario} - {usuario.rol}
              </span>
            )}
            <button
              className="jyr-topbar-logout"
              onClick={handleLogout}
              title="Cerrar sesion"
            >
              <FiLogOut />
              <span>Salir</span>
            </button>
          </div>
        </header>
        <div className="jyr-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
