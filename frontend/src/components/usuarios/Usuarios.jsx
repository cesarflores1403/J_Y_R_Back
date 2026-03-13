import React, { useState, useEffect, useCallback } from 'react';
import { usuarioService } from '../../services/serviceIndex.js';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiSearch, FiX, FiTrash2,
  FiToggleLeft, FiToggleRight, FiUser, FiEye, FiEyeOff
} from 'react-icons/fi';

const camposIniciales = { nombre_usuario: '', contrasena: '', confirmar: '', cod_rol: '' };

const Usuarios = () => {
  const confirm = useConfirm();
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
    usuarioService.listarRoles()
      .then(r => { if (r.data.ok) setRoles(r.data.datos); })
      .catch(() => {});
  }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(camposIniciales);
    setVerPass(false);
    setVerConfirm(false);
    setModal(true);
  };

  const abrirEditar = (u) => {
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

  const guardar = async () => {
    if (!form.nombre_usuario.trim()) return toast.warning('El nombre de usuario es requerido');
    if (!editando && form.contrasena.length < 6) return toast.warning('La contraseña debe tener al menos 6 caracteres');
    if (form.contrasena && form.contrasena !== form.confirmar) return toast.warning('Las contraseñas no coinciden');

    setGuardando(true);
    try {
      const payload = {
        nombre_usuario: form.nombre_usuario,
        cod_rol: form.cod_rol || null,
        ...(form.contrasena ? { contrasena: form.contrasena } : {})
      };

      if (editando) {
        await usuarioService.actualizar(editando, payload);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuarioService.crear(payload);
        toast.success('Usuario creado correctamente');
      }
      setModal(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id) => {
    try {
      await usuarioService.toggleEstado(id);
      toast.success('Estado actualizado');
      cargar();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const eliminar = async (id) => {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: '¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      tone: 'danger'
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
        <button className="btn jyr-btn-primary" onClick={abrirCrear}>
          <FiPlus className="me-2" />Nuevo Usuario
        </button>
      </div>

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
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="6" className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" />
                  </td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-4">
                    No se encontraron usuarios
                  </td></tr>
                ) : usuarios.map((u) => (
                  <tr key={u.cod_usuario}>
                    <td className="text-muted">{u.cod_usuario}</td>
                    <td><strong>{u.nombre_usuario}</strong></td>
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
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => abrirEditar(u)} title="Editar">
                        <FiEdit2 />
                      </button>
                      <button className="btn btn-sm btn-outline-warning me-1"
                        onClick={() => toggleEstado(u.cod_usuario)}
                        title={u.estado_usuario ? 'Desactivar' : 'Activar'}>
                        {u.estado_usuario ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      <button className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminar(u.cod_usuario)} title="Eliminar">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
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
      {modal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h5>
                <button className="btn-close" onClick={() => setModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Nombre */}
                  <div className="col-12">
                    <label className="form-label">Nombre de usuario *</label>
                    <input type="text" className="form-control"
                      value={form.nombre_usuario}
                      onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
                      placeholder="nombre_usuario" />
                  </div>

                  {/* Rol */}
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

                  {/* Contraseña */}
                  <div className="col-12">
                    <label className="form-label">
                      {editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                    </label>
                    <div className="input-group">
                      <input type={verPass ? 'text' : 'password'} className="form-control"
                        value={form.contrasena}
                        onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                        placeholder={editando ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'} />
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
                <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
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