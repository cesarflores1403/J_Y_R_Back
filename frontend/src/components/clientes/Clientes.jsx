import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { clienteService } from '../../services/serviceIndex.js';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { confirmDialog } from '../../utils/notifications.js';

const camposIniciales = { nombre: '', apellido: '', dni: '', rtn: '', empresa: '', telefono: '', correo: '', direccion: '' };
const REGEX_TEXTO_CON_PUNTO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]+$/;
const REGEX_CORREO_PERMITIDO = /^[A-Za-z0-9@.]+$/;
const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

const sanitizarSoloLetras = (valor = '', maximo = 100) => (
  valor
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maximo)
);

const sanitizarTextoConPunto = (valor = '', maximo = 100) => (
  valor
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maximo)
);

const sanitizarCorreo = (valor = '', maximo = 30) => (
  valor
    .replace(/[^A-Za-z0-9@.]/g, '')
    .toLowerCase()
    .slice(0, maximo)
);

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
  const [seleccionados, setSeleccionados] = useState([]);

  const cargar = useCallback(async (paginaForzada = pagina) => {
    setCargando(true);
    try {
      const { data } = await clienteService.listar({
        pagina: paginaForzada,
        limite: 10,
        buscar
      });

      if (data.ok) {
        setClientes(data.datos);
        setTotalPaginas(data.totalPaginas);
        setSeleccionados(prev =>
          prev.filter(id => data.datos.some(c => c.cod_cliente === id))
        );
      }
    } catch (err) {
      toast.error('Error al cargar clientes');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    setForm(camposIniciales);
    setModal(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente.cod_cliente);
    setForm({
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      dni: cliente.dni || '',
      rtn: cliente.rtn || '',
      empresa: cliente.empresa || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || ''
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) return toast.warn('El nombre es obligatorio');
    if (form.nombre.trim().length > 10) return toast.warn('El nombre no puede exceder 10 caracteres');
    if (!REGEX_SOLO_LETRAS.test(form.nombre.trim())) return toast.warn('El nombre solo permite letras y espacios');
    if (!form.apellido.trim()) return toast.warn('El apellido es obligatorio');
    if (form.apellido.trim().length > 10) return toast.warn('El apellido no puede exceder 10 caracteres');
    if (!REGEX_SOLO_LETRAS.test(form.apellido.trim())) return toast.warn('El apellido solo permite letras y espacios');
    if (!form.dni.trim()) return toast.warn('El DNI es obligatorio');
    if (!/^\d{13}$/.test(form.dni.trim())) return toast.warn('El DNI debe tener exactamente 13 dígitos numéricos');
    if (form.rtn.trim() && !/^\d{14}$/.test(form.rtn.trim())) return toast.warn('El RTN debe tener exactamente 14 dígitos numéricos');
    if (!form.empresa.trim()) return toast.warn('La empresa es obligatoria');
    if (form.empresa.trim().length > 15) return toast.warn('La empresa no puede exceder 15 caracteres');
    if (!REGEX_TEXTO_CON_PUNTO.test(form.empresa.trim())) return toast.warn('La empresa solo permite letras, números, espacios y punto');
    if (!form.telefono.trim()) return toast.warn('El teléfono es obligatorio');
    if (!/^\d{8}$/.test(form.telefono.trim())) return toast.warn('El teléfono debe tener exactamente 8 dígitos numéricos');
    if (!form.correo.trim()) return toast.warn('El correo es obligatorio');
    if (!REGEX_CORREO_PERMITIDO.test(form.correo.trim())) return toast.warn('El correo solo permite letras, números, @ y punto');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) return toast.warn('El correo no tiene un formato válido');
    if (!form.direccion.trim()) return toast.warn('La dirección es obligatoria');
    if (form.direccion.trim().length > 60) return toast.warn('La dirección no puede exceder 60 caracteres');
    if (!REGEX_TEXTO_CON_PUNTO.test(form.direccion.trim())) return toast.warn('La dirección solo permite letras, números, espacios y punto');

    setGuardando(true);

    try {
      const payload = {
        ...form,
        rtn: form.rtn.trim() || null
      };

      if (editando) {
        await clienteService.actualizar(editando, payload);
        toast.success('Cliente actualizado');
        setModal(false);
        await cargar(pagina);
      } else {
        await clienteService.crear(payload);
        toast.success('Cliente creado');
        setModal(false);

        const primeraPagina = 1;
        setPagina(primeraPagina);
        await cargar(primeraPagina);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar cliente',
      text: '¿Eliminar este cliente?',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    try {
      await clienteService.eliminar(id);
      toast.success('Cliente eliminado');
      await cargar(pagina);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  const idsPagina = useMemo(() => clientes.map(c => c.cod_cliente), [clientes]);

  const todosSeleccionados =
    idsPagina.length > 0 && idsPagina.every(id => seleccionados.includes(id));

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleSeleccionPagina = () => {
    if (todosSeleccionados) {
      setSeleccionados(prev => prev.filter(id => !idsPagina.includes(id)));
    } else {
      setSeleccionados(prev => [...new Set([...prev, ...idsPagina])]);
    }
  };

  const limpiarSeleccion = () => setSeleccionados([]);

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) {
      toast.warning('Selecciona al menos un cliente');
      return;
    }

    const ok = await confirmDialog({
      variant: 'delete',
      title: `Eliminar ${seleccionados.length} cliente(s)`,
      text: 'Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    let eliminados = 0;

    for (const id of seleccionados) {
      try {
        await clienteService.eliminar(id);
        eliminados++;
      } catch {}
    }

    if (eliminados > 0) {
      toast.success(`${eliminados} cliente(s) procesado(s)`);
    }

    setSeleccionados([]);
    await cargar(pagina);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Clientes ({clientes.length})</h3>
        <div className="d-flex gap-2">
          <button className="btn jyr-btn-primary" onClick={abrirCrear}>
            <FiPlus className="me-2" />Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, DNI, empresa, correo..."
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
                setPagina(1);
              }}
            />
            {buscar && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setBuscar('');
                  setPagina(1);
                }}
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {seleccionados.length > 0 && (
        <div
          style={{
            padding: '10px 16px',
            marginBottom: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
            {seleccionados.length} cliente(s) seleccionado(s)
          </span>

          <button className="btn btn-sm btn-outline-danger" onClick={eliminarSeleccionados}>
            <FiTrash2 className="me-1" />Eliminar seleccionados
          </button>

          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={limpiarSeleccion}>
            <FiX className="me-1" />Limpiar selección
          </button>
        </div>
      )}

      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleSeleccionPagina}
                      disabled={clientes.length === 0}
                      title="Seleccionar todos en esta página"
                    />
                  </th>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Empresa</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm" />
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  clientes.map((c, index) => (
                    <tr key={c.cod_cliente}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(c.cod_cliente)}
                          onChange={() => toggleSeleccion(c.cod_cliente)}
                          title={`Seleccionar ${c.nombre} ${c.apellido || ''}`}
                        />
                      </td>
                      <td className="text-muted">{((pagina - 1) * 10) + index + 1}</td>
                      <td>{c.nombre} {c.apellido || ''}</td>
                      <td>{c.dni || '-'}</td>
                      <td>{c.empresa || '-'}</td>
                      <td>{c.telefono || '-'}</td>
                      <td>{c.correo || '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => abrirEditar(c)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminar(c.cod_cliente)}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-3 align-items-center gap-3">
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p - 1)}>
                  Anterior
                </button>
              </li>

              {[...Array(totalPaginas)].map((_, i) => (
                <li key={i} className={`page-item ${pagina === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPagina(i + 1)}>
                    {i + 1}
                  </button>
                </li>
              ))}

              <li className={`page-item ${pagina >= totalPaginas ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(p => p + 1)}>
                  Siguiente
                </button>
              </li>
            </ul>
          </nav>

          <span className="fw-semibold fs-6 text-muted">
            Página {pagina} de {totalPaginas}
          </span>
        </div>
      )}

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
                      <input
                        type="text"
                        className="form-control"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: sanitizarSoloLetras(e.target.value, 10) })}
                        required
                        maxLength={10}
                      />
                      <small className="text-muted">{form.nombre.length}/10</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Apellido *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.apellido}
                        onChange={(e) => setForm({ ...form, apellido: sanitizarSoloLetras(e.target.value, 10) })}
                        required
                        maxLength={10}
                      />
                      <small className="text-muted">{form.apellido.length}/10</small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">DNI *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.dni}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 13) setForm({ ...form, dni: v });
                        }}
                        required
                        maxLength={13}
                        placeholder="13 dígitos"
                      />
                      <small className="text-muted">{form.dni.length}/13</small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">RTN (opcional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.rtn}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 14) setForm({ ...form, rtn: v });
                        }}
                        maxLength={14}
                        placeholder="14 dígitos"
                      />
                      <small className="text-muted">{form.rtn.length}/14</small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Empresa *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.empresa}
                        onChange={(e) => setForm({ ...form, empresa: sanitizarTextoConPunto(e.target.value, 15) })}
                        required
                        maxLength={15}
                      />
                      <small className="text-muted">{form.empresa.length}/15</small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Teléfono *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.telefono}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 8) setForm({ ...form, telefono: v });
                        }}
                        required
                        maxLength={8}
                        placeholder="8 dígitos"
                      />
                      <small className="text-muted">{form.telefono.length}/8</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Correo *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.correo}
                        onChange={(e) => setForm({ ...form, correo: sanitizarCorreo(e.target.value, 30) })}
                        required
                        maxLength={30}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Dirección *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.direccion}
                        onChange={(e) => setForm({ ...form, direccion: sanitizarTextoConPunto(e.target.value, 60) })}
                        required
                        maxLength={60}
                      />
                      <small className="text-muted">{form.direccion.length}/60</small>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                    Cancelar
                  </button>
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
