import React, { useState, useEffect, useCallback } from 'react';
import { clienteService } from '../../services/serviceIndex.js';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';

const camposIniciales = { nombre: '', apellido: '', dni: '', empresa: '', telefono: '', correo: '', direccion: '' };

const Clientes = () => {
  const confirm = useConfirm();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(camposIniciales);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await clienteService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setClientes(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch (err) {
      toast.error('Error al cargar clientes');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditando(null); setForm(camposIniciales); setModal(true); };

  const abrirEditar = (cliente) => {
    setEditando(cliente.cod_cliente);
    setForm({
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      dni: cliente.dni || '',
      empresa: cliente.empresa || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || ''
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!form.nombre.trim()) return toast.warn('El nombre es obligatorio');
    if (form.nombre.trim().length > 10) return toast.warn('El nombre no puede exceder 10 caracteres');
    if (!form.apellido.trim()) return toast.warn('El apellido es obligatorio');
    if (!form.dni.trim()) return toast.warn('El DNI es obligatorio');
    if (!/^\d{13}$/.test(form.dni.trim())) return toast.warn('El DNI debe tener exactamente 13 dígitos numéricos');
    if (!form.empresa.trim()) return toast.warn('La empresa es obligatoria');
    if (form.empresa.trim().length > 15) return toast.warn('La empresa no puede exceder 15 caracteres');
    if (!form.telefono.trim()) return toast.warn('El teléfono es obligatorio');
    if (!/^\d{8}$/.test(form.telefono.trim())) return toast.warn('El teléfono debe tener exactamente 8 dígitos numéricos');
    if (!form.correo.trim()) return toast.warn('El correo es obligatorio');
    if (!form.direccion.trim()) return toast.warn('La dirección es obligatoria');
    if (form.direccion.trim().length > 40) return toast.warn('La dirección no puede exceder 40 caracteres');

    setGuardando(true);
    try {
      if (editando) {
        await clienteService.actualizar(editando, form);
        toast.success('Cliente actualizado');
      } else {
        await clienteService.crear(form);
        toast.success('Cliente creado');
      }
      setModal(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: '¿Está seguro de eliminar este cliente?',
      confirmText: 'Eliminar',
      tone: 'danger'
    });
    if (!ok) return;
    try {
      await clienteService.eliminar(id);
      toast.success('Cliente eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Clientes</h3>
        <button className="btn jyr-btn-primary" onClick={abrirCrear}><FiPlus className="me-2" />Nuevo Cliente</button>
      </div>

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por nombre, DNI, empresa, correo..."
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
                <th>Nombre</th><th>DNI</th><th>Empresa</th><th>Teléfono</th><th>Correo</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="6" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : clientes.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-4">No se encontraron clientes</td></tr>
                ) : clientes.map((c) => (
                  <tr key={c.cod_cliente}>
                    <td><strong>{c.nombre}</strong> {c.apellido || ''}</td>
                    <td>{c.dni || '-'}</td>
                    <td>{c.empresa || '-'}</td>
                    <td>{c.telefono || '-'}</td>
                    <td>{c.correo || '-'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirEditar(c)}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.cod_cliente)}><FiTrash2 /></button>
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
          <nav><ul className="pagination pagination-sm">
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
          </ul></nav>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h5>
                <button className="btn-close" onClick={() => setModal(false)} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre *</label>
                      <input type="text" className="form-control" value={form.nombre}
                        onChange={(e) => setForm({...form, nombre: e.target.value})} required maxLength={10} />
                      <small className="text-muted">{form.nombre.length}/10</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Apellido *</label>
                      <input type="text" className="form-control" value={form.apellido}
                        onChange={(e) => setForm({...form, apellido: e.target.value})} required maxLength={10} />
                      <small className="text-muted">{form.apellido.length}/10</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">DNI *</label>
                      <input type="text" className="form-control" value={form.dni}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 13) setForm({...form, dni: v}); }}
                        required maxLength={13} placeholder="13 dígitos" />
                      <small className="text-muted">{form.dni.length}/13</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Empresa *</label>
                      <input type="text" className="form-control" value={form.empresa}
                        onChange={(e) => setForm({...form, empresa: e.target.value})} required maxLength={15} />
                      <small className="text-muted">{form.empresa.length}/15</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Teléfono *</label>
                      <input type="text" className="form-control" value={form.telefono}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 8) setForm({...form, telefono: v}); }}
                        required maxLength={8} placeholder="8 dígitos" />
                      <small className="text-muted">{form.telefono.length}/8</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Correo *</label>
                      <input type="email" className="form-control" value={form.correo}
                        onChange={(e) => setForm({...form, correo: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Dirección *</label>
                      <input type="text" className="form-control" value={form.direccion}
                        onChange={(e) => setForm({...form, direccion: e.target.value})} required maxLength={40} />
                      <small className="text-muted">{form.direccion.length}/40</small>
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

export default Clientes;
