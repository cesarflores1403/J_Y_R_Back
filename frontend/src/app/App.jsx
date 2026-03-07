import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import { ToastContainer } from 'react-toastify';

import Login from '../components/auth/Login.jsx';
import Layout from '../components/layout/Layout.jsx';
import Dashboard from '../components/dashboard/Dashboard.jsx';
import Clientes from '../components/clientes/Clientes.jsx';
import Proveedores from '../components/proveedores/Proveedores.jsx';
import Reportes from '../components/reportes/Reportes.jsx';
import Facturas from '../components/facturas/Facturas.jsx';
import ProductoPage from '../pages/ProductoPage.jsx';
import Ubicaciones from '../components/ubicaciones/Ubicaciones.jsx';
import Categorias from '../components/categorias/Categorias.jsx';
import Existencias from '../components/inventario/Existencias.jsx';
import InventarioKardexPage from '../components/inventario/InventarioKardexPage.jsx';
import InventarioEntradasPage from '../components/inventario/InventarioEntradasPage.jsx';
import InventarioSalidasPage from '../components/inventario/InventarioSalidasPage.jsx';

const PrivateRoute = ({ children, roles }) => {
  const { autenticado, usuario, cargando } = useAuth();
  if (cargando) return <div className="jyr-spinner" style={{ minHeight: '100vh' }} />;
  if (!autenticado) return <Navigate to="/login" />;
  if (roles && !roles.includes(usuario?.rol)) return <Navigate to="/" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<ProductoPage />} />
            <Route path="categorias" element={<PrivateRoute roles={['Administrador']}><Categorias /></PrivateRoute>} />
            <Route path="ubicaciones" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Ubicaciones /></PrivateRoute>} />
            <Route path="inventario/existencias" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Existencias /></PrivateRoute>} />
            <Route path="inventario/kardex" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioKardexPage /></PrivateRoute>} />
            <Route path="inventario/entradas" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioEntradasPage /></PrivateRoute>} />
            <Route path="inventario/salidas" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><InventarioSalidasPage /></PrivateRoute>} />
            <Route path="clientes" element={<PrivateRoute roles={['Administrador', 'Cajero']}><Clientes /></PrivateRoute>} />
            <Route path="facturas" element={<PrivateRoute roles={['Administrador', 'Cajero']}><Facturas /></PrivateRoute>} />
            <Route path="proveedores" element={<PrivateRoute roles={['Administrador', 'Bodeguero']}><Proveedores /></PrivateRoute>} />
            <Route path="reportes" element={<PrivateRoute roles={['Administrador']}><Reportes /></PrivateRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
    </AuthProvider>
  );
};

export default App;
