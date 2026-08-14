import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext.jsx';

import Login from '../components/auth/Login.jsx';
import Layout from '../components/layout/Layout.jsx';
import Dashboard from '../components/dashboard/Dashboard.jsx';
import Clientes from '../components/clientes/Clientes.jsx';
import Proveedores from '../components/proveedores/Proveedores.jsx';
import Reportes from '../components/reportes/Reportes.jsx';
import Facturas from '../components/facturas/Facturas.jsx';
import Cotizaciones from '../components/cotizaciones/Cotizaciones.jsx';
import CarruselPage from '../components/dashboard/CarruselPage.jsx';
import ProductoPage from '../pages/ProductoPage.jsx';
import Ubicaciones from '../components/ubicaciones/Ubicaciones.jsx';
import Categorias from '../components/categorias/Categorias.jsx';
import Existencias from '../components/inventario/Existencias.jsx';
import InventarioKardexPage from '../components/inventario/InventarioKardexPage.jsx';
import InventarioEntradasPage from '../components/inventario/InventarioEntradasPage.jsx';
import InventarioSalidasPage from '../components/inventario/InventarioSalidasPage.jsx';
import InventarioBajasPage from '../components/inventario/InventarioBajasPage.jsx';
import InventarioTransferenciasPage from '../components/inventario/InventarioTransferenciasPage.jsx';
import InventarioConteosPage from '../components/inventario/InventarioConteosPage.jsx';
import InventarioReservasPage from '../components/inventario/InventarioReservasPage.jsx';
import AuditoriaFacturacion from '../components/auditoria/AuditoriaFacturacion.jsx';
import NotasCredito from '../components/notascredito/NotasCredito.jsx';
import Usuarios from '../components/usuarios/Usuarios.jsx';
import RecuperarPassword from '../components/auth/RecuperarPassword.jsx';
import OrdenesCompra from '../components/compras/OrdenesCompra.jsx';
import ConfigEmpresa from '../components/configuracion/ConfigEmpresa.jsx';
import UrlSistema from '../components/configuracion/UrlSistema.jsx';
import BackupSistema from '../components/configuracion/BackupSistema.jsx';
const PrivateRoute = ({ children, roles }) => {
  const { autenticado, usuario, cargando } = useAuth();
  if (cargando) return <div className="jyr-spinner" style={{ minHeight: '100vh' }} />;
  if (!autenticado) return <Navigate to="/login" />;
  // Super Administrador tiene acceso total a todas las rutas
  if (roles && usuario?.rol !== 'Super Administrador' && !roles.includes(usuario?.rol)) return <Navigate to="/" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} /> 
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<ProductoPage />} />
            <Route path="categorias" element={<PrivateRoute roles={['Administrador']}><Categorias /></PrivateRoute>} />
            <Route path="ubicaciones" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Ubicaciones /></PrivateRoute>} />
            <Route path="inventario/existencias" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Existencias /></PrivateRoute>} />
            <Route path="inventario/kardex" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioKardexPage /></PrivateRoute>} />
            <Route path="inventario/entradas" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioEntradasPage /></PrivateRoute>} />
            <Route path="inventario/salidas" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioSalidasPage /></PrivateRoute>} />
            <Route path="inventario/bajas" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioBajasPage /></PrivateRoute>} />
            {/* // Submodulo de Inventario para transferencias origen/destino */}
            <Route path="inventario/transferencias" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioTransferenciasPage /></PrivateRoute>} />
            {/* // Submodulo de Inventario para conteo fisico completo */}
            <Route path="inventario/conteos" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioConteosPage /></PrivateRoute>} />
            {/* // Submodulo de Inventario para reservas de inventario */}
            <Route path="inventario/reservas" element={<PrivateRoute roles={['Administrador', 'Bodeguero', 'Cajero', 'Vendedor']}><InventarioReservasPage /></PrivateRoute>} />
            <Route path="clientes" element={<PrivateRoute roles={['Administrador', 'Cajero', 'Vendedor']}><Clientes /></PrivateRoute>} />
            <Route path="facturas" element={<PrivateRoute roles={['Administrador', 'Cajero', 'Vendedor']}><Facturas /></PrivateRoute>} />
            <Route path="cotizaciones" element={<PrivateRoute roles={['Administrador', 'Cajero', 'Vendedor']}><Cotizaciones /></PrivateRoute>} />
            <Route path="proveedores" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Proveedores /></PrivateRoute>} />
            <Route path="reportes" element={<PrivateRoute roles={['Administrador']}><Reportes /></PrivateRoute>} />
            <Route path="carrusel" element={<PrivateRoute roles={['Administrador']}><CarruselPage /></PrivateRoute>} />
            <Route path="auditoria-facturacion" element={<PrivateRoute roles={['Administrador']}><AuditoriaFacturacion /></PrivateRoute>} />
            <Route path="notas-credito" element={<PrivateRoute roles={['Administrador', 'Cajero', 'Vendedor']}><NotasCredito /></PrivateRoute>} />
            <Route path="usuarios" element={<PrivateRoute roles={['Administrador']}><Usuarios /></PrivateRoute>} />
            <Route path="compras/ordenes" element={<PrivateRoute roles={['Administrador','Bodeguero']}><OrdenesCompra /></PrivateRoute>} />
            <Route path="config-empresa" element={<PrivateRoute roles={['Super Administrador']}><ConfigEmpresa /></PrivateRoute>} />
            <Route path="url-sistema" element={<PrivateRoute roles={['Administrador', 'Super Administrador']}><UrlSistema /></PrivateRoute>} />
            <Route path="respaldos" element={<PrivateRoute roles={['Administrador', 'Super Administrador']}><BackupSistema /></PrivateRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
      </ConfirmDialogProvider>
    </AuthProvider>
  );
};

export default App;




