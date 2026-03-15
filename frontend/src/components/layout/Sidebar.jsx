import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getInitials } from '../../utils/helpers.js';
import {
  FiGrid, FiUsers, FiTruck, FiPackage,
  FiBarChart2, FiLogOut, FiFileText, FiMapPin, FiDatabase, FiList, FiPlusCircle, FiMinusCircle,
  FiAlertTriangle, FiTag, FiRepeat, FiClipboard, FiLock, FiShoppingCart, FiClock, FiImage
} from 'react-icons/fi';
import logoClean from '../../assets/img/logo2.jpeg';

const menuItems = [
  { section: 'Principal', items: [
    { path: '/', label: 'Dashboard', icon: <FiGrid />, roles: ['Administrador', 'Cajero', 'Bodeguero'] },
  ]},
  { section: 'Comercial', items: [
    { path: '/clientes', label: 'Clientes', icon: <FiUsers />, roles: ['Administrador', 'Cajero'] },
    { path: '/facturas', label: 'Facturacion', icon: <FiFileText />, roles: ['Administrador', 'Cajero'] },
    { path: '/cotizaciones', label: 'Cotizaciones', icon: <FiClipboard />, roles: ['Administrador', 'Cajero'] },
    { path: '/notas-credito', label: 'Notas de Credito', icon: <FiFileText />, roles: ['Administrador', 'Cajero'] },
  ]},
  { section: 'Catalogo', items: [
    { path: '/productos', label: 'Productos', icon: <FiPackage />, roles: ['Administrador', 'Bodeguero', 'Cajero'] },
    { path: '/categorias', label: 'Categorias', icon: <FiTag />, roles: ['Administrador'] },
  ]},
  { section: 'Inventario', items: [
    { path: '/ubicaciones', label: 'Ubicaciones', icon: <FiMapPin />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/existencias', label: 'Existencias', icon: <FiDatabase />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/kardex', label: 'Kardex', icon: <FiList />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/entradas', label: 'Entradas', icon: <FiPlusCircle />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/salidas', label: 'Salidas', icon: <FiMinusCircle />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/bajas', label: 'Bajas', icon: <FiAlertTriangle />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/transferencias', label: 'Transferencias', icon: <FiRepeat />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/conteos', label: 'Conteos', icon: <FiClipboard />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/inventario/reservas', label: 'Reservas', icon: <FiLock />, roles: ['Administrador', 'Bodeguero', 'Cajero'] },
  ]},
  { section: 'Compras', items: [
    { path: '/proveedores', label: 'Proveedores', icon: <FiTruck />, roles: ['Administrador', 'Bodeguero'] },
    { path: '/compras/ordenes', label: 'Ordenes de Compra', icon: <FiShoppingCart />, roles: ['Administrador', 'Bodeguero'] },
  ]},
  { section: 'Gestion', items: [
    { path: '/reportes', label: 'Reportes', icon: <FiBarChart2 />, roles: ['Administrador'] },
    { path: '/usuarios', label: 'Usuarios', icon: <FiUsers />, roles: ['Administrador'] },
    { path: '/auditoria-facturacion', label: 'Auditoria Fact.', icon: <FiClock />, roles: ['Administrador'] },
  ]},
  { section: 'Fotos Carrusel', items: [
    { path: '/carrusel', label: 'Carrusel', icon: <FiImage />, roles: ['Administrador'] },
  ]},
  { section: 'Configuracion', items: [
    { path: '/config-empresa', label: 'Datos Factura', icon: <FiFileText />, roles: ['Super Administrador'] },
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
        <img src={logoClean} alt="J&R" className="jyr-sidebar-logo" />
        <div>
          <h1>J&R</h1>
          <small>Accesorios & Reparaciones</small>
        </div>
      </div>

      <nav className="jyr-sidebar-nav">
        {menuItems.map((section) => {
          const visibleItems = section.items.filter(
            item => usuario?.rol === 'Super Administrador' || item.roles.includes(usuario?.rol)
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
        <button className="jyr-sidebar-logout" onClick={handleLogout} title="Cerrar sesion">
          <FiLogOut />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
