import React, { useEffect, useState } from 'react';
import { sanitizarTexto } from '../../utils/sanitizarTexto.js';
import ContadorLimite from '../common/ContadorLimite.jsx';

// Tope de caracteres del campo Observaciones (con contador y alerta al usuario).
const MAX_OBSERVACIONES = 500;

const ReservaAccionModal = ({
  abierto = false,
  tipo = '',
  reserva = null,
  loading = false,
  onClose,
  onConfirm
}) => {
  const [form, setForm] = useState({
    motivo: '',
    referencia: '',
    observaciones: ''
  });

  useEffect(() => {
    if (!abierto) {
      setForm({
        motivo: '',
        referencia: '',
        observaciones: ''
      });
    }
  }, [abierto, tipo, reserva?.cod_reserva]);

  if (!abierto || !reserva) return null;

  const cerrarModal = () => {
    if (loading) return;
    if (typeof onClose === 'function') onClose();
  };

  const esLiberar = tipo === 'liberar';
  const titulo = esLiberar ? 'Liberar reserva' : 'Consumir reserva';
  const boton = esLiberar ? 'Liberar reserva' : 'Consumir reserva';
  const botonClase = esLiberar ? 'btn btn-warning' : 'btn jyr-btn-primary';

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrarModal();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{titulo}</h5>
            <button type="button" className="btn-close" onClick={cerrarModal} disabled={loading} />
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (typeof onConfirm === 'function') {
                await onConfirm({
                  motivo: String(form.motivo || '').trim(),
                  referencia: String(form.referencia || '').trim(),
                  observaciones: String(form.observaciones || '').trim()
                });
              }
            }}
          >
            <div className="modal-body">
              <div className="alert alert-light border mb-3">
                <strong>Reserva:</strong> #{reserva.cod_reserva} <br />
                <strong>Producto:</strong> {reserva.nombre_producto || reserva.cod_producto} <br />
                <strong>Cantidad:</strong> {reserva.cantidad}
              </div>

              {esLiberar ? (
                <div className="mb-3">
                  <label className="form-label">Motivo (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.motivo}
                    onChange={(event) => setForm((prev) => ({ ...prev, motivo: sanitizarTexto(event.target.value) }))}
                    maxLength={200}
                    placeholder="Motivo de liberacion"
                  />
                  <ContadorLimite value={form.motivo} max={200} />
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label">Referencia (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.referencia}
                    onChange={(event) => setForm((prev) => ({ ...prev, referencia: sanitizarTexto(event.target.value) }))}
                    maxLength={200}
                    placeholder="Referencia de consumo"
                  />
                  <ContadorLimite value={form.referencia} max={200} />
                </div>
              )}

              <div className="mb-2">
                <label className="form-label">Observaciones (opcional)</label>
                <textarea
                  className={`form-control ${form.observaciones.length >= MAX_OBSERVACIONES ? 'is-invalid' : ''}`}
                  rows="3"
                  value={form.observaciones}
                  onChange={(event) => setForm((prev) => ({ ...prev, observaciones: sanitizarTexto(event.target.value).slice(0, MAX_OBSERVACIONES) }))}
                  maxLength={MAX_OBSERVACIONES}
                  placeholder="Notas de la operacion"
                  aria-describedby="accion-obs-contador accion-obs-limite"
                />
                <div className="d-flex justify-content-end">
                  <small
                    id="accion-obs-contador"
                    className={form.observaciones.length >= MAX_OBSERVACIONES ? 'text-danger fw-semibold' : 'text-muted'}
                  >
                    {form.observaciones.length}/{MAX_OBSERVACIONES}
                  </small>
                </div>
                {form.observaciones.length >= MAX_OBSERVACIONES && (
                  <div id="accion-obs-limite" className="alert alert-warning py-1 px-2 mb-0 mt-1" role="alert" style={{ fontSize: 12 }}>
                    Ha alcanzado el límite máximo de {MAX_OBSERVACIONES} caracteres permitidos.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={botonClase} disabled={loading}>
                {loading ? 'Procesando...' : boton}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservaAccionModal;
