import React, { useState, useEffect, useCallback } from 'react';
import { categoriaService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiSearch, FiX, FiToggleLeft, FiToggleRight, FiTrash2, FiTag } from 'react-icons/fi';

const camposIniciales = { nombre_categoria: '', descripcion: '' };

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
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
      const { data } = await categoriaService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setCategorias(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditando(null); setForm(camposIniciales); setModal(true); };

  const abrirEditar = (cat) => {
    setEditando(cat.cod_categoria);
    setForm({
      nombre_categoria: cat.nombre_categoria || '',
      descripcion: cat.descripcion || ''
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await categoriaService.actualizar(editando, form);
        toast.success('Categoría actualizada');
      } else {
        await categoriaService.crear(form);
        toast.success('Categoría creada');
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
      await categoriaService.toggleEstado(id);
      toast.success('Estado actualizado');
      cargar();
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleEliminar = async (cat) => {
    const ok = window.confirm(`¿Eliminar la categoría "${cat.nombre_categoria}"?\nSi tiene productos asociados, no se podrá eliminar.`);
    if (!ok) return;
    try {
      await categoriaService.eliminar(cat.cod_categoria);
      toast.success('Categoría eliminada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--jyr-red)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-red)'
          }}>
            <FiTag size={24} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Categorías de Productos</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--jyr-gray-500)' }}>
              Gestión de categorías para organizar el catálogo
            </p>
          </div>
        </div>
        <button className="btn jyr-btn-primary" onClick={abrirCrear}><FiPlus className="me-2" />Nueva Categoría</button>
      </div>

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por nombre o descripción..."
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
                <th>ID</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="5" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : categorias.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted py-4">No se encontraron categorías</td></tr>
                ) : categorias.map((c) => (
                  <tr key={c.cod_categoria}>
                    <td><strong>{c.cod_categoria}</strong></td>
                    <td><strong>{c.nombre_categoria}</strong></td>
                    <td>{c.descripcion || '-'}</td>
                    <td>
                      <span className={`badge ${c.estado_categoria ? 'bg-success' : 'bg-danger'}`}>
                        {c.estado_categoria ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirEditar(c)} title="Editar"><FiEdit2 /></button>
                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => toggleEstado(c.cod_categoria)}
                        title={c.estado_categoria ? 'Desactivar' : 'Activar'}>
                        {c.estado_categoria ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminar(c)} title="Eliminar"><FiTrash2 /></button>
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editando ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
                <button className="btn-close" onClick={() => setModal(false)} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Nombre *</label>
                      <input type="text" className="form-control" value={form.nombre_categoria}
                        onChange={(e) => setForm({...form, nombre_categoria: e.target.value})} required
                        minLength={2} maxLength={100} placeholder="Ej: Lubricantes, Repuestos, Accesorios..." />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Descripción</label>
                      <textarea className="form-control" rows="3" value={form.descripcion}
                        onChange={(e) => setForm({...form, descripcion: e.target.value})}
                        maxLength={255} placeholder="Descripción opcional de la categoría..." />
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

export default Categorias;
