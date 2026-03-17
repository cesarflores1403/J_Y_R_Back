import React, { useState, useEffect, useCallback } from 'react';
import { proveedorService } from '../../services/serviceIndex.js';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiSearch, FiX, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import { confirmDialog } from '../../utils/notifications.js';

const camposIniciales = { nombre_proveedor: '', telefono: '', correo: '', pais: '', es_internacional: false, validado: '' };

const Proveedores = () => {
  const { usuario } = useAuth();
  const confirm = useConfirm();
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(camposIniciales);
  const [guardando, setGuardando] = useState(false);
  const puedeEliminarProveedor = usuario?.rol === 'Administrador' || usuario?.rol === 'Super Administrador';

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await proveedorService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setProveedores(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch (err) {
      toast.error('Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditando(null); setForm(camposIniciales); setModal(true); };

  const abrirEditar = (prov) => {
    setEditando(prov.cod_proveedor);
    setForm({
      nombre_proveedor: prov.nombre_proveedor || '',
      telefono: prov.telefono || '',
      correo: prov.correo || '',
      pais: prov.pais || '',
      es_internacional: prov.es_internacional || false,
      validado: prov.validado || ''
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await proveedorService.actualizar(editando, form);
        toast.success('Proveedor actualizado');
      } else {
        await proveedorService.crear(form);
        toast.success('Proveedor creado');
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
      await proveedorService.toggleEstado(id);
      toast.success('Estado actualizado');
      cargar();
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const eliminar = async (id) => {
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar proveedor',
      text: '¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
      const { data } = await proveedorService.eliminar(id);
      toast.success(data?.mensaje || 'Proveedor eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar proveedor');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Proveedores</h3>
        <button className="btn jyr-btn-primary" onClick={abrirCrear}><FiPlus className="me-2" />Nuevo Proveedor</button>
      </div>

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por nombre, correo, país..."
              value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
            {buscar && <button className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}><FiX /></button>}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr>
                <th>Nombre</th><th>Teléfono</th><th>Correo</th><th>País</th><th>Internacional</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : proveedores.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No se encontraron proveedores</td></tr>
                ) : proveedores.map((p) => (
                  <tr key={p.cod_proveedor}>
                    <td><strong>{p.nombre_proveedor}</strong></td>
                    <td>{p.telefono || '-'}</td>
                    <td>{p.correo || '-'}</td>
                    <td>{p.pais || '-'}</td>
                    <td>
                      <span className={`badge ${p.es_internacional ? 'bg-info' : 'bg-secondary'}`}>
                        {p.es_internacional ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.estado_proveedor ? 'bg-success' : 'bg-danger'}`}>
                        {p.estado_proveedor ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirEditar(p)}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => toggleEstado(p.cod_proveedor)}
                        title={p.estado_proveedor ? 'Desactivar' : 'Activar'}>
                        {p.estado_proveedor ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      {puedeEliminarProveedor && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.cod_proveedor)} title="Eliminar">
                          <FiTrash2 />
                        </button>
                      )}
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h5>
                <button className="btn-close" onClick={() => setModal(false)} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre *</label>
                      <input type="text" className="form-control" value={form.nombre_proveedor}
                        onChange={(e) => setForm({...form, nombre_proveedor: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Teléfono</label>
                      <input type="text" className="form-control" value={form.telefono}
                        onChange={(e) => setForm({...form, telefono: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Correo</label>
                      <input type="email" className="form-control" value={form.correo}
                        onChange={(e) => setForm({...form, correo: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">País</label>
                      <input type="text" className="form-control" value={form.pais}
                        onChange={(e) => setForm({...form, pais: e.target.value})} />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="esInternacional"
                          checked={form.es_internacional}
                          onChange={(e) => setForm({...form, es_internacional: e.target.checked})} />
                        <label className="form-check-label" htmlFor="esInternacional">Internacional</label>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Validado</label>
                      <input type="text" className="form-control" value={form.validado}
                        onChange={(e) => setForm({...form, validado: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn jyr-btn-primary" disabled={guardando}>
                    {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    {editando ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proveedores;
