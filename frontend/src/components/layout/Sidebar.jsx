import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getInitials } from '../../utils/helpers.js';
import {
  FiGrid, FiUsers, FiTruck, FiPackage,
  FiBarChart2, FiLogOut
} from 'react-icons/fi';

const menuItems = [
  { section: 'Principal', items: [
    { path: '/', label: 'Dashboard', icon: <FiGrid />, roles: ['Administrador', 'Cajero', 'Bodeguero'] },
  ]},
  { section: 'Comercial', items: [
    { path: '/clientes', label: 'Clientes', icon: <FiUsers />, roles: ['Administrador', 'Cajero'] },
  ]},
  { section: 'Inventario', items: [
    { path: '/productos', label: 'Productos', icon: <FiPackage />, roles: ['Administrador', 'Bodeguero', 'Cajero'] },
  ]},
  { section: 'Compras', items: [
    { path: '/proveedores', label: 'Proveedores', icon: <FiTruck />, roles: ['Administrador', 'Bodeguero'] },
  ]},
  { section: 'Gestión', items: [
    { path: '/reportes', label: 'Reportes', icon: <FiBarChart2 />, roles: ['Administrador'] },
  ]},
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, cerrarSesion } = useAuth();

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  return (
    <aside className="jyr-sidebar">
      <div className="jyr-sidebar-brand">
        <div className="jyr-sidebar-brand-icon">JYR</div>
        <div>
          <h1>JYR</h1>
          <small>Inventario & Facturación</small>
        </div>
      </div>

      <nav className="jyr-sidebar-nav">
        {menuItems.map((section) => {
          const visibleItems = section.items.filter(
            item => item.roles.includes(usuario?.rol)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div className="jyr-sidebar-section" key={section.section}>
              <div className="jyr-sidebar-section-title">{section.section}</div>
              {visibleItems.map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <div
                    key={item.path}
                    className={`jyr-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="jyr-sidebar-user">
        <div className="jyr-sidebar-user-avatar">
          {getInitials(usuario?.nombre_usuario)}
        </div>
        <div className="jyr-sidebar-user-info">
          <div className="jyr-sidebar-user-name">{usuario?.nombre_usuario}</div>
          <div className="jyr-sidebar-user-role">{usuario?.rol}</div>
        </div>
        <button className="jyr-sidebar-logout" onClick={handleLogout} title="Cerrar sesión">
          <FiLogOut />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
