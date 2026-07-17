import React, { useState, useEffect, useCallback } from 'react';
import { proveedorService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiSearch, FiX, FiToggleLeft, FiToggleRight, FiTrash2, FiDownload } from 'react-icons/fi';
import { confirmDialog, alertDialog } from '../../utils/notifications.js';
import ModalProveedor from './ModalProveedor.jsx';
import SearchInput from '../common/SearchInput.jsx';

const LIMITE = 10;

const Proveedores = () => {

  // Usuario logueado (para permisos)
  const { usuario } = useAuth();

  // Estados principales
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Estados de modal
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [proveedorEditar, setProveedorEditar] = useState(null);

  // Estado para checkboxes seleccionados
  const [seleccionados, setSeleccionados] = useState([]);

  // Validación de permisos
  const puedeEliminar =
    usuario?.rol === 'Administrador' || usuario?.rol === 'Super Administrador';

  // Cargar proveedores desde backend
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await proveedorService.listar({ pagina, limite: LIMITE, buscar });
      if (data.ok) {
        setProveedores(data.datos);
        setTotalPaginas(data.totalPaginas);

        // Limpiar seleccionados que ya no existen
        setSeleccionados(prev =>
          prev.filter(id => data.datos.some(p => p.cod_proveedor === id))
        );
      }
    } catch {
      toast.error('Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  // Ejecutar carga inicial
  useEffect(() => { cargar(); }, [cargar]);

  // Abrir modal para crear proveedor
  const abrirCrear = () => {
    setEditando(null);
    setProveedorEditar(null);
    setModal(true);
  };

  // Abrir modal para editar proveedor
  const abrirEditar = (prov) => {
    setEditando(prov.cod_proveedor);
    setProveedorEditar({
      nombre_proveedor: prov.nombre_proveedor || '',
      telefono: prov.telefono || '',
      correo: prov.correo || '',
      pais: prov.pais || '',
      es_internacional: prov.es_internacional || false,
      validado: prov.validado || ''
    });
    setModal(true);
  };

  // Cambiar estado activo/inactivo
  const toggleEstado = async (id) => {
    try {
      await proveedorService.toggleEstado(id);
      toast.success('Estado actualizado');
      cargar();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  // Eliminar proveedor individual
  const eliminar = async (id) => {
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar proveedor',
      text: '¿Estás seguro?',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    try {
      const { data } = await proveedorService.eliminar(id);

      if (data?.softDelete) {
        await alertDialog({
          title: 'No se puede eliminar',
          text: 'Tiene órdenes asociadas. Se desactivó.',
          icon: 'warning',
          confirmText: 'Entendido'
        });
      } else {
        toast.success('Proveedor eliminado');
      }

      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  // Seleccionar un proveedor
  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Seleccionar todos los proveedores visibles
  const toggleSeleccionTodos = () => {
    if (seleccionados.length === proveedores.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(proveedores.map(p => p.cod_proveedor));
    }
  };

  // Eliminar múltiples proveedores seleccionados
  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0)
      return toast.warning('Selecciona al menos uno');

    const ok = await confirmDialog({
      variant: 'delete',
      title: `Eliminar ${seleccionados.length} proveedor(es)`,
      text: 'Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    for (const id of seleccionados) {
      try { await proveedorService.eliminar(id); } catch {}
    }

    setSeleccionados([]);
    toast.success('Eliminados correctamente');
    cargar();
  };

  const exportarPdf = async () => {
    setExportandoPdf(true);

    try {
      const response = await proveedorService.exportarPdf({ buscar });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reporte-proveedores.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte de proveedores exportado');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al exportar proveedores en PDF');
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div>

      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Proveedores</h3>

        <div className="d-flex gap-2">

          {/* Botón eliminar múltiple */}
          {seleccionados.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={eliminarSeleccionados}>
              <FiTrash2 className="me-1" />Eliminar seleccionados
            </button>
          )}

          {/* Botón crear */}
          <button
            type="button"
            className="jyr-btn jyr-btn-primary"
            onClick={exportarPdf}
            disabled={exportandoPdf || cargando}
          >
            {exportandoPdf ? <span className="spinner-border spinner-border-sm me-2" /> : <FiDownload className="me-2" />}
            Exportar PDF
          </button>

          <button className="btn jyr-btn-primary" onClick={abrirCrear}>
            <FiPlus className="me-2" />Nuevo Proveedor
          </button>

        </div>
      </div>

      {/* Buscador */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <SearchInput
              className="form-control"
              placeholder="Buscar..."
              value={buscar}
              onChange={(val) => {
                setBuscar(val);
                setPagina(1);
              }}
            />
            {buscar && (
              <button className="btn btn-outline-secondary" onClick={() => {
                setBuscar('');
                setPagina(1);
              }}>
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

              {/* Encabezado tabla */}
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={seleccionados.length === proveedores.length && proveedores.length > 0}
                      onChange={toggleSeleccionTodos}
                    />
                  </th>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>País</th>
                  <th>Internacional</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              {/* Cuerpo tabla */}
              <tbody>
                {cargando ? (
                  <tr><td colSpan="9" className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" />
                  </td></tr>
                ) : proveedores.length === 0 ? (
                  <tr><td colSpan="9" className="text-center text-muted py-4">
                    No se encontraron proveedores
                  </td></tr>
                ) : proveedores.map((p, index) => (
                  <tr key={p.cod_proveedor}>

                    {/* Checkbox fila */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(p.cod_proveedor)}
                        onChange={() => toggleSeleccion(p.cod_proveedor)}
                      />
                    </td>

                    <td className="text-muted">
                      {(pagina - 1) * LIMITE + index + 1}
                    </td>

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
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirEditar(p)}>
                        <FiEdit2 />
                      </button>

                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => toggleEstado(p.cod_proveedor)}>
                        {p.estado_proveedor ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>

                      {puedeEliminar && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.cod_proveedor)}>
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
      <div className="d-flex justify-content-center mt-3">
        <nav><ul className="pagination">
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

      {/* Modal */}
      {modal && (
        <ModalProveedor
          editando={editando}
          proveedorInicial={proveedorEditar}
          onClose={() => setModal(false)}
          onGuardado={() => cargar()}
        />
      )}

    </div>
  );
};

export default Proveedores;
