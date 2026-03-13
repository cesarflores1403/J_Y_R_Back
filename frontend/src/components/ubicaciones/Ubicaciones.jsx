import React, { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiMapPin, FiPlus, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import Alert from '../common/Alert.jsx';
import { ubicacionService } from '../../services/serviceIndex.js';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';

const formularioInicial = {
  pasillo: '',
  estanteria: '',
  nivel_1: '',
  nivel_2: '',
  codigo_qr: '',
  descripcion: ''
};

const MENSAJE_DUPLICADO = 'Ya existe una ubicación con ese código/comb';

const extraerError = (error) => {
  const backendMessage = error?.response?.data?.message
    || error?.response?.data?.mensaje
    || 'Error al procesar la solicitud';

  if (error?.response?.status === 409) {
    if (String(backendMessage).toLowerCase().includes('codigo/comb')) {
      return MENSAJE_DUPLICADO;
    }
  }

  return backendMessage;
};

const Ubicaciones = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formularioInicial);

  const cargarUbicaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await ubicacionService.listar({ includeInactive });
      setUbicaciones(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setUbicaciones([]);
      setError(extraerError(err));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    cargarUbicaciones();
  }, [cargarUbicaciones]);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(formularioInicial);
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (ubicacion) => {
    setEditandoId(ubicacion.cod_ubicacion);
    setForm({
      pasillo: ubicacion.pasillo || '',
      estanteria: ubicacion.estanteria || '',
      nivel_1: ubicacion.nivel_1 || '',
      nivel_2: ubicacion.nivel_2 || '',
      codigo_qr: ubicacion.codigo_qr || '',
      descripcion: ubicacion.descripcion || ''
    });
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (saving) return;
    setModalAbierto(false);
  };

  const guardar = async (event) => {
    event.preventDefault();

    const payload = {
      pasillo: form.pasillo,
      estanteria: form.estanteria,
      nivel_1: form.nivel_1,
      nivel_2: form.nivel_2 || null,
      codigo_qr: form.codigo_qr,
      descripcion: form.descripcion || null
    };

    try {
      setSaving(true);
      setError('');

      if (editandoId) {
        await ubicacionService.actualizar(editandoId, payload);
      } else {
        await ubicacionService.crear(payload);
      }

      setModalAbierto(false);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (id) => {
    const confirmado = await confirm({
      title: 'Desactivar ubicación',
      message: '¿Está seguro de desactivar esta ubicación?',
      confirmText: 'Desactivar',
      tone: 'danger'
    });
    if (!confirmado) return;

    try {
      setError('');
      await ubicacionService.desactivar(id);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    }
  };

  const eliminar = async (id) => {
    const confirmado = await confirm({
      title: 'Eliminar ubicación',
      message: '¿Está seguro de eliminar permanentemente esta ubicación?',
      confirmText: 'Eliminar',
      tone: 'danger'
    });
    if (!confirmado) return;

    try {
      setError('');
      await ubicacionService.eliminar(id);
      await cargarUbicaciones();
    } catch (err) {
      setError(extraerError(err));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiMapPin />
          <h3 className="mb-0">Ubicaciones</h3>
        </div>
        <button className="btn jyr-btn-primary" onClick={abrirCrear}>
          <FiPlus className="me-2" />
          Nueva Ubicación
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="form-check form-switch">
            <input
              id="includeInactive"
              className="form-check-input"
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="includeInactive">
              Incluir inactivas
            </label>
          </div>
        </div>
      </div>

      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Código QR</th>
                  <th>Pasillo</th>
                  <th>Estantería</th>
                  <th>Nivel 1</th>
                  <th>Nivel 2</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm me-2" />
                      Cargando ubicaciones...
                    </td>
                  </tr>
                ) : ubicaciones.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No hay ubicaciones registradas
                    </td>
                  </tr>
                ) : (
                  ubicaciones.map((item) => (
                    <tr key={item.cod_ubicacion}>
                      <td>{item.codigo_qr || '-'}</td>
                      <td>{item.pasillo || '-'}</td>
                      <td>{item.estanteria || '-'}</td>
                      <td>{item.nivel_1 || '-'}</td>
                      <td>{item.nivel_2 || '-'}</td>
                      <td>{item.descripcion || '-'}</td>
                      <td>
                        <span className={`badge ${item.estado_ubi === 'ACTIVA' ? 'bg-success' : 'bg-secondary'}`}>
                          {item.estado_ubi}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => abrirEditar(item)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning me-1"
                          onClick={() => desactivar(item.cod_ubicacion)}
                          disabled={item.estado_ubi !== 'ACTIVA'}
                          title="Desactivar"
                        >
                          <FiToggleRight />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminar(item.cod_ubicacion)}
                          title="Eliminar"
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

      {modalAbierto && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editandoId ? 'Editar Ubicación' : 'Nueva Ubicación'}</h5>
                <button type="button" className="btn-close" onClick={cerrarModal} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pasillo *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.pasillo}
                        onChange={(e) => setForm({ ...form, pasillo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Estantería *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.estanteria}
                        onChange={(e) => setForm({ ...form, estanteria: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nivel 1 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nivel_1}
                        onChange={(e) => setForm({ ...form, nivel_1: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nivel 2</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nivel_2}
                        onChange={(e) => setForm({ ...form, nivel_2: e.target.value })}
                      />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Código QR *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.codigo_qr}
                        onChange={(e) => setForm({ ...form, codigo_qr: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Descripción</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn jyr-btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Guardando...
                      </>
                    ) : (
                      editandoId ? 'Actualizar' : 'Crear'
                    )}
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

export default Ubicaciones;
