import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import { FiLogOut, FiBell, FiKey, FiMenu } from 'react-icons/fi';
import { authService, notificacionSuperAdminService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';

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
  '/facturas': 'Facturación',
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
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [mostrarPanelNotis, setMostrarPanelNotis] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const puedeGestionarContrasenas = ['Super Administrador', 'Administrador'].includes(usuario?.rol);
  const esSuperAdmin = usuario?.rol === 'Super Administrador';
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  // // Fallback por primer segmento para rutas no mapeadas de forma exacta
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  // // Priorizamos coincidencia exacta y luego fallback
  const pageName = pageNames[location.pathname] || pageNames[basePath] || 'JYR Sistema';

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const abrirModalPassword = () => {
    setPasswordForm({ actual: '', nueva: '', confirmar: '' });
    setModalPasswordAbierto(true);
  };

  const cerrarModalPassword = () => {
    if (guardandoPassword) return;
    setModalPasswordAbierto(false);
  };

  const actualizarCampoPassword = (campo, valor) => {
    setPasswordForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardarPasswordPerfil = async () => {
    const actual = String(passwordForm.actual || '');
    const nueva = String(passwordForm.nueva || '');
    const confirmar = String(passwordForm.confirmar || '');

    if (!actual) return toast.warning('Debes ingresar la contraseña actual');
    if (nueva.length < 6) return toast.warning('La nueva contraseña debe tener al menos 6 caracteres');
    if (nueva !== confirmar) return toast.warning('Las contraseñas no coinciden');

    try {
      setGuardandoPassword(true);
      const { data } = await authService.cambiarPassword({
        password_actual: actual,
        password_nuevo: nueva
      });
      toast.success(data?.mensaje || 'Contraseña actualizada correctamente');
      setModalPasswordAbierto(false);
      setPasswordForm({ actual: '', nueva: '', confirmar: '' });
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'No se pudo actualizar la contraseña');
    } finally {
      setGuardandoPassword(false);
    }
  };

  const cargarNotificaciones = async () => {
    if (!puedeGestionarContrasenas) return;
    try {
      const { data } = await notificacionSuperAdminService.listar({ limite: 15 });
      if (data.ok) {
        setNotificaciones(data.datos || []);
        setNoLeidas(data.noLeidas || 0);
      }
    } catch {
      // Silencioso para no interrumpir navegación
    }
  };

  useEffect(() => {
    if (!puedeGestionarContrasenas) {
      setNotificaciones([]);
      setNoLeidas(0);
      setMostrarPanelNotis(false);
      return;
    }

    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 15000);
    return () => clearInterval(interval);
  }, [puedeGestionarContrasenas]);

  const marcarLeida = async (codNotificacion) => {
    try {
      await notificacionSuperAdminService.marcarLeida(codNotificacion);
      setNotificaciones((prev) => prev.map((n) => (
        n.cod_notificacion === codNotificacion ? { ...n, leida: true } : n
      )));
      setNoLeidas((prev) => Math.max(prev - 1, 0));
    } catch {
      // Silencioso
    }
  };

  const abrirNotificacion = async (notificacion) => {
    await marcarLeida(notificacion.cod_notificacion);
    setMostrarPanelNotis(false);

    // Las solicitudes de recuperación se atienden desde Gestión de Usuarios.
    if (notificacion.tipo === 'RECUPERACION_PASSWORD') {
      navigate('/usuarios?solicitudes=pendientes');
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await notificacionSuperAdminService.marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch {
      // Silencioso
    }
  };

  return (
    <div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="jyr-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="jyr-main">
        <header className="jyr-topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className="jyr-topbar-menu"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Abrir menú"
            >
              <FiMenu />
            </button>
            <span className="jyr-topbar-title">{pageName}</span>
          </div>
          <div className="jyr-topbar-actions">
            {puedeGestionarContrasenas && (
              <div className="jyr-noti-wrap">
                <button
                  className="jyr-topbar-noti-btn"
                  onClick={() => setMostrarPanelNotis((v) => !v)}
                  title="Notificaciones"
                >
                  <FiBell />
                  {noLeidas > 0 && <span className="jyr-noti-badge">{noLeidas > 99 ? '99+' : noLeidas}</span>}
                </button>

                {mostrarPanelNotis && (
                  <div className="jyr-noti-panel">
                    <div className="jyr-noti-header">
                      <span>Notificaciones</span>
                      {noLeidas > 0 && (
                        <button className="jyr-noti-mark-all" onClick={marcarTodasLeidas}>
                          Marcar todas
                        </button>
                      )}
                    </div>

                    <div className="jyr-noti-list">
                      {notificaciones.length === 0 ? (
                        <div className="jyr-noti-empty">Sin notificaciones</div>
                      ) : notificaciones.map((n) => (
                        <button
                          key={n.cod_notificacion}
                          className={`jyr-noti-item ${n.leida ? 'leida' : 'nueva'}`}
                          onClick={() => abrirNotificacion(n)}
                        >
                          <div className="jyr-noti-item-title">{n.titulo}</div>
                          <div className="jyr-noti-item-msg">{n.mensaje}</div>
                          <div className="jyr-noti-item-date">
                            {n.creado_en ? new Date(n.creado_en).toLocaleString('es-HN') : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {usuario && (
              <span className="jyr-topbar-user-label">
                {usuario.nombre_usuario} - {usuario.rol}
              </span>
            )}
            {esSuperAdmin && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={abrirModalPassword}
                title="Cambiar mi contraseña"
                style={{ marginRight: 8 }}
              >
                <FiKey style={{ marginRight: 6 }} />
                Cambiar mi contraseña
              </button>
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

        {esSuperAdmin && modalPasswordAbierto && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-md">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Cambiar mi contraseña</h5>
                  <button className="btn-close" onClick={cerrarModalPassword} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Contraseña actual *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.actual}
                      onChange={(e) => actualizarCampoPassword('actual', e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nueva contraseña *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.nueva}
                      onChange={(e) => actualizarCampoPassword('nueva', e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirmar contraseña *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.confirmar}
                      onChange={(e) => actualizarCampoPassword('confirmar', e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={cerrarModalPassword} disabled={guardandoPassword}>
                    Cancelar
                  </button>
                  <button className="btn jyr-btn-primary" onClick={guardarPasswordPerfil} disabled={guardandoPassword}>
                    {guardandoPassword ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Guardando...
                      </>
                    ) : (
                      'Actualizar contraseña'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
