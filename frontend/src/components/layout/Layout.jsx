import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const pageNames = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/reportes': 'Reportes',
};

const Layout = () => {
  const location = useLocation();
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const pageName = pageNames[basePath] || 'JYR Sistema';

  return (
    <div>
      <Sidebar />
      <main className="jyr-main">
        <header className="jyr-topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="jyr-topbar-title">{pageName}</span>
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
