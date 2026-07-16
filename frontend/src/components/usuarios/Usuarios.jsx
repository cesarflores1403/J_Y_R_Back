import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usuarioService, notificacionSuperAdminService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiSearch, FiX, FiTrash2,
  FiToggleLeft, FiToggleRight, FiUser, FiEye, FiEyeOff
} from 'react-icons/fi';
import { confirmDialog } from '../../utils/notifications.js';

const camposIniciales = { nombre_usuario: '', contrasena: '', confirmar: '', cod_rol: '' };

const Usuarios = () => {
  const location = useLocation();
  const { usuario } = useAuth();
  const esSuperAdmin = usuario?.rol === 'Super Administrador';
  const esAdmin = usuario?.rol === 'Administrador';
  const puedeCambiarContrasena = esSuperAdmin || esAdmin;
  const mostrarPendientes = new URLSearchParams(location.search).get('solicitudes') === 'pendientes';

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(camposIniciales);
  const [guardando, setGuardando] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [verConfirm, setVerConfirm] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await usuarioService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setUsuarios(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!esSuperAdmin) return;
    usuarioService.listarRoles()
      .then(r => { if (r.data.ok) setRoles(r.data.datos); })
      .catch(() => {});
  }, [esSuperAdmin]);

  const cargarSolicitudesPendientes = useCallback(async () => {
    if (!puedeCambiarContrasena || !mostrarPendientes) {
      setSolicitudesPendientes([]);
      return;
    }

    setCargandoPendientes(true);
    try {
      const { data } = await notificacionSuperAdminService.listar({ limite: 50 });
      if (data.ok) {
        const pendientes = (data.datos || []).filter(
          (n) => n.tipo === 'RECUPERACION_PASSWORD' && !n.leida
        );
        setSolicitudesPendientes(pendientes);
      }
    } catch {
      toast.error('No se pudieron cargar las solicitudes pendientes');
    } finally {
      setCargandoPendientes(false);
    }
  }, [puedeCambiarContrasena, mostrarPendientes]);

  useEffect(() => {
    cargarSolicitudesPendientes();
  }, [cargarSolicitudesPendientes]);

  const marcarSolicitudAtendida = async (codNotificacion) => {
    try {
      await notificacionSuperAdminService.marcarLeida(codNotificacion);
      setSolicitudesPendientes((prev) => prev.filter((n) => n.cod_notificacion !== codNotificacion));
      toast.success('Solicitud marcada como atendida');
    } catch {
      toast.error('No se pudo marcar la solicitud');
    }
  };

  const abrirCrear = () => {
    if (!esSuperAdmin) return;
    setEditando(null);
    setForm(camposIniciales);
    setVerPass(false);
    setVerConfirm(false);
    setModal(true);
  };

  const abrirEditar = (u) => {
    if (!puedeCambiarContrasena) return;
    setEditando(u.cod_usuario);
    setForm({
      nombre_usuario: u.nombre_usuario,
      contrasena: '',
      confirmar: '',
      cod_rol: u.roles?.[0]?.cod_rol || ''
    });
    setVerPass(false);
    setVerConfirm(false);
    setModal(true);
  };

  const cerrarModal = () => {
    setModal(false);
    setEditando(null);
    setForm(camposIniciales);
    setVerPass(false);
    setVerConfirm(false);
  };

  const guardar = async () => {
    if (!puedeCambiarContrasena) return;
    if (!form.nombre_usuario.trim()) return toast.warning('El nombre de usuario es requerido');
    if (!editando && form.contrasena.length < 6) return toast.warning('La contraseña debe tener al menos 6 caracteres');
    if (editando && form.contrasena && form.contrasena.length < 6) return toast.warning('La contraseña debe tener al menos 6 caracteres');
    if (form.contrasena && form.contrasena !== form.confirmar) return toast.warning('Las contraseñas no coinciden');

    if (esAdmin) {
      if (!editando) return toast.warning('Administrador no puede crear usuarios');
      if (!form.contrasena) return toast.warning('Debes ingresar la nueva contraseña');
    }

    setGuardando(true);
    try {
      const payload = esAdmin
        ? { contrasena: form.contrasena }
        : {
          nombre_usuario: form.nombre_usuario,
          cod_rol: form.cod_rol || null,
          ...(form.contrasena ? { contrasena: form.contrasena } : {})
        };

      if (editando) {
        await usuarioService.actualizar(editando, payload);
        toast.success(esAdmin ? 'Contraseña actualizada correctamente' : 'Usuario actualizado correctamente');
      } else {
        await usuarioService.crear(payload);
        toast.success('Usuario creado correctamente');
      }
      cerrarModal();
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id) => {
    if (!esSuperAdmin) return;
    try {
      await usuarioService.toggleEstado(id);
      toast.success('Estado actualizado');
      cargar();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const eliminar = async (id) => {
    if (!esSuperAdmin) return;
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar usuario',
      text: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
      await usuarioService.eliminar(id);
      toast.success('Usuario eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar usuario');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Usuarios</h3>
        {esSuperAdmin && (
          <button className="btn jyr-btn-primary" onClick={abrirCrear}>
            <FiPlus className="me-2" />Nuevo Usuario
          </button>
        )}
      </div>

      {!esSuperAdmin && !esAdmin && (
        <div className="alert alert-info py-2">
          Modo lectura: tu rol solo puede ver los usuarios del sistema.
        </div>
      )}

      {puedeCambiarContrasena && mostrarPendientes && (
        <div className="jyr-card mb-3">
          <div className="jyr-card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Solicitudes pendientes de recuperación</h6>
              <span className="badge bg-danger">{solicitudesPendientes.length}</span>
            </div>

            {cargandoPendientes ? (
              <div className="text-muted">Cargando solicitudes...</div>
            ) : solicitudesPendientes.length === 0 ? (
              <div className="text-muted">No hay solicitudes pendientes.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Correo solicitante</th>
                      <th>Fecha</th>
                      <th className="text-end">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesPendientes.map((n) => (
                      <tr key={n.cod_notificacion}>
                        <td>{n.correo_solicitante || '-'}</td>
                        <td>{n.creado_en ? new Date(n.creado_en).toLocaleString('es-HN') : '-'}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => marcarSolicitudAtendida(n.cod_notificacion)}
                          >
                            Marcar atendida
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por nombre de usuario..."
              value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
            {buscar && (
              <button className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}>
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  {puedeCambiarContrasena && (
                    <th className="text-center">{esAdmin ? 'Contraseña' : 'Acciones'}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={puedeCambiarContrasena ? 6 : 5} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" />
                  </td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan={puedeCambiarContrasena ? 6 : 5} className="text-center text-muted py-4">
                    No se encontraron usuarios
                  </td></tr>
                ) : usuarios.map((u, index) =>  (
                  (() => {
                    const esFilaSuperAdmin = (u.roles || []).some((r) => r.nombre_rol === 'Super Administrador');
                    return (
                  <tr key={u.cod_usuario}>
                    <td className="text-muted">
                  {(pagina - 1) * 15 + index + 1}
                </td>
                <td>{u.nombre_usuario}</td>
                    <td>
                      {u.roles?.[0]
                        ? <span className="badge bg-primary">{u.roles[0].nombre_rol}</span>
                        : <span className="badge bg-secondary">Sin rol</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${u.estado_usuario ? 'bg-success' : 'bg-danger'}`}>
                        {u.estado_usuario ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-HN') : '-'}
                    </td>
                    {puedeCambiarContrasena && (
                      <td className="text-center">
                        {esAdmin ? (
                          esFilaSuperAdmin ? (
                            <span className="badge bg-secondary" title="La contraseña del Super Admin solo se cambia en su perfil">
                              Protegida
                            </span>
                          ) : (
                            <button className="btn btn-sm btn-outline-primary"
                              onClick={() => abrirEditar(u)} title="Cambiar contraseña">
                              Cambiar contraseña
                            </button>
                          )
                        ) : (
                          !esFilaSuperAdmin && (
                            <button className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => abrirEditar(u)} title="Editar">
                              <FiEdit2 />
                            </button>
                          )
                        )}
                        {esSuperAdmin && !esFilaSuperAdmin && (
                          <>
                            <button className="btn btn-sm btn-outline-warning me-1"
                              onClick={() => toggleEstado(u.cod_usuario)}
                              title={u.estado_usuario ? 'Desactivar' : 'Activar'}>
                              {u.estado_usuario ? <FiToggleRight /> : <FiToggleLeft />}
                            </button>
                            <button className="btn btn-sm btn-outline-danger"
                              onClick={() => eliminar(u.cod_usuario)} title="Eliminar">
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p - 1)}>Anterior</button>
              </li>
              {[...Array(totalPaginas)].map((_, i) => (
                <li key={i} className={`page-item ${pagina === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPagina(i + 1)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${pagina >= totalPaginas ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p + 1)}>Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Modal */}
      {puedeCambiarContrasena && modal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editando
                    ? (esAdmin ? 'Cambiar Contraseña' : 'Editar Usuario')
                    : 'Nuevo Usuario'}
                </h5>
                <button className="btn-close" onClick={cerrarModal} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Nombre */}
                  {(esSuperAdmin || (esAdmin && editando)) && (
                    esAdmin ? (
                      <div className="col-12">
                        <label className="form-label">Usuario</label>
                        <div className="form-control bg-light" style={{ pointerEvents: 'none' }}>
                          {form.nombre_usuario}
                        </div>
                      </div>
                    ) : (
                      <div className="col-12">
                        <label className="form-label">Nombre de usuario *</label>
                        <input type="text" className="form-control"
                          value={form.nombre_usuario}
                          onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
                          placeholder="nombre_usuario" />
                      </div>
                    )
                  )}

                  {/* Rol */}
                  {esSuperAdmin && (
                    <div className="col-12">
                      <label className="form-label">Rol</label>
                      <select className="form-select" value={form.cod_rol}
                        onChange={(e) => setForm({ ...form, cod_rol: e.target.value })}>
                        <option value="">Sin rol</option>
                        {roles.map(r => (
                          <option key={r.cod_rol} value={r.cod_rol}>{r.nombre_rol}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contraseña */}
                  <div className="col-12">
                    <label className="form-label">
                      {editando
                        ? (esAdmin ? 'Nueva contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)')
                        : 'Contraseña *'}
                    </label>
                    <div className="input-group">
                      <input type={verPass ? 'text' : 'password'} className="form-control"
                        value={form.contrasena}
                        onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                        placeholder={editando
                          ? (esAdmin ? 'Ingrese la nueva contraseña' : 'Dejar vacío para no cambiar')
                          : 'Mínimo 6 caracteres'} />
                      <button className="btn btn-outline-secondary" onClick={() => setVerPass(v => !v)}>
                        {verPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar */}
                  {form.contrasena && (
                    <div className="col-12">
                      <label className="form-label">Confirmar contraseña *</label>
                      <div className="input-group">
                        <input type={verConfirm ? 'text' : 'password'} className="form-control"
                          value={form.confirmar}
                          onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                          placeholder="Repetir contraseña" />
                        <button className="btn btn-outline-secondary" onClick={() => setVerConfirm(v => !v)}>
                          {verConfirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {form.confirmar && form.contrasena !== form.confirmar && (
                        <small className="text-danger">Las contraseñas no coinciden</small>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button className="btn jyr-btn-primary" onClick={guardar} disabled={guardando}>
                  {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
