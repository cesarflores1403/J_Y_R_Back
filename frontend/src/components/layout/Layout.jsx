import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import { FiLogOut } from 'react-icons/fi';

const pageNames = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/ubicaciones': 'Ubicaciones',
  '/inventario': 'Existencias',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/reportes': 'Reportes',
  '/facturas': 'Facturación',
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, cerrarSesion } = useAuth();
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const pageName = pageNames[basePath] || 'JYR Sistema';

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
                {usuario.nombre_usuario} — {usuario.rol}
              </span>
            )}
            <button
              className="jyr-topbar-logout"
              onClick={handleLogout}
              title="Cerrar sesión"
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
