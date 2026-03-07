import React, { useMemo, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { inventarioReservasApi } from './inventarioReservas.api.js';

// // Estado inicial para crear reserva
const estadoCrearInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia: '',
  observaciones: ''
};

// // Estado inicial para liberar reserva manualmente por id
const estadoLiberarInicial = {
  cod_reserva: '',
  motivo: '',
  observaciones: ''
};

// // Estado inicial para consumir reserva manualmente por id
const estadoConsumirInicial = {
  cod_reserva: '',
  referencia: '',
  observaciones: ''
};

// // Mapea errores HTTP a mensajes funcionales de la UI de reservas
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Datos invalidos para operar la reserva';
  if (status === 404) return serverMessage || 'Reserva o inventario no encontrado';
  if (status === 409) return serverMessage || 'Conflicto logico de estado o stock insuficiente';
  return serverMessage || 'Error inesperado en reservas de inventario';
};

const InventarioReservasPage = () => {
  // // Estado local de formularios y feedback
  const [formCrear, setFormCrear] = useState(estadoCrearInicial);
  const [formLiberar, setFormLiberar] = useState(estadoLiberarInicial);
  const [formConsumir, setFormConsumir] = useState(estadoConsumirInicial);

  // // Estado de proceso por accion
  const [savingCrear, setSavingCrear] = useState(false);
  const [savingLiberar, setSavingLiberar] = useState(false);
  const [savingConsumir, setSavingConsumir] = useState(false);

  // // Estado de mensajes globales de la pantalla
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // // Lista local para visualizar reservas creadas durante la sesion UI
  const [reservasLocales, setReservasLocales] = useState([]);

  // // Resumen local rapido para ver distribucion de estados en la lista de reservas
  const resumenReservas = useMemo(() => {
    const activas = reservasLocales.filter((r) => String(r.estado || '').toUpperCase() === 'ACTIVA').length;
    const liberadas = reservasLocales.filter((r) => String(r.estado || '').toUpperCase() === 'LIBERADA').length;
    const consumidas = reservasLocales.filter((r) => String(r.estado || '').toUpperCase() === 'CONSUMIDA').length;
    return {
      total: reservasLocales.length,
      activas,
      liberadas,
      consumidas
    };
  }, [reservasLocales]);

  // // Inserta o actualiza una reserva en la lista local por id
  const upsertReservaLocal = (reserva, resumen) => {
    if (!reserva && !resumen?.cod_reserva) return;

    const codReserva = Number(
      resumen?.cod_reserva
      || reserva?.cod_reserva_inventario
      || reserva?.cod_reserva
      || reserva?.id_reserva
    );

    const estado = String(
      reserva?.estado
      || reserva?.estado_reserva
      || 'ACTIVA'
    ).toUpperCase();

    const item = {
      cod_reserva: codReserva,
      estado,
      cantidad: Number(reserva?.cantidad ?? resumen?.cantidad ?? 0),
      cod_producto: Number(reserva?.cod_producto ?? resumen?.cod_producto ?? 0),
      cod_ubicacion: Number(reserva?.cod_ubicacion ?? resumen?.cod_ubicacion ?? 0),
      referencia: reserva?.referencia ?? resumen?.referencia ?? null
    };

    setReservasLocales((prev) => {
      const mapa = new Map(prev.map((r) => [r.cod_reserva, r]));
      mapa.set(codReserva, { ...(mapa.get(codReserva) || {}), ...item });
      return Array.from(mapa.values()).sort((a, b) => b.cod_reserva - a.cod_reserva);
    });
  };

  // // Crea reserva y actualiza listado local
  const crearReserva = async (event) => {
    event.preventDefault();

    try {
      setSavingCrear(true);
      setError('');
      setSuccess('');

      const cantidad = Number(formCrear.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      const payload = {
        cod_producto: Number(formCrear.cod_producto),
        cod_ubicacion: Number(formCrear.cod_ubicacion),
        cantidad,
        referencia: String(formCrear.referencia || '').trim(),
        observaciones: String(formCrear.observaciones || '').trim()
      };

      const { data } = await inventarioReservasApi.crear(payload);
      if (!data?.ok) {
        setError('Respuesta invalida al crear reserva');
        return;
      }

      upsertReservaLocal(data?.data?.reserva, data?.data?.resumen);
      setFormCrear(estadoCrearInicial);
      setSuccess('Reserva creada correctamente');
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingCrear(false);
    }
  };

  // // Ejecuta liberacion de reserva por id con motivo/observaciones opcionales
  const liberarReserva = async (codReservaManual = null) => {
    try {
      setSavingLiberar(true);
      setError('');
      setSuccess('');

      const codReserva = Number(codReservaManual || formLiberar.cod_reserva);
      if (!Number.isInteger(codReserva) || codReserva <= 0) {
        setError('Debes indicar un id de reserva valido para liberar');
        return;
      }

      const payload = {
        motivo: String(formLiberar.motivo || '').trim(),
        observaciones: String(formLiberar.observaciones || '').trim()
      };

      const { data } = await inventarioReservasApi.liberar(codReserva, payload);
      if (!data?.ok) {
        setError('Respuesta invalida al liberar reserva');
        return;
      }

      upsertReservaLocal(data?.data?.reserva, data?.data?.resumen);
      setFormLiberar(estadoLiberarInicial);
      setSuccess(`Reserva ${codReserva} liberada correctamente`);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingLiberar(false);
    }
  };

  // // Ejecuta consumo de reserva por id con referencia/observaciones opcionales
  const consumirReserva = async (codReservaManual = null) => {
    try {
      setSavingConsumir(true);
      setError('');
      setSuccess('');

      const codReserva = Number(codReservaManual || formConsumir.cod_reserva);
      if (!Number.isInteger(codReserva) || codReserva <= 0) {
        setError('Debes indicar un id de reserva valido para consumir');
        return;
      }

      const payload = {
        referencia: String(formConsumir.referencia || '').trim(),
        observaciones: String(formConsumir.observaciones || '').trim()
      };

      const { data } = await inventarioReservasApi.consumir(codReserva, payload);
      if (!data?.ok) {
        setError('Respuesta invalida al consumir reserva');
        return;
      }

      upsertReservaLocal(data?.data?.reserva, data?.data?.resumen);
      setFormConsumir(estadoConsumirInicial);
      setSuccess(`Reserva ${codReserva} consumida correctamente`);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingConsumir(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiLock />
          <h3 className="mb-0">Reservas</h3>
        </div>
      </div>

      {success && (
        // // Mensaje de exito de operaciones de reserva
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {error && (
        // // Mensaje de error funcional de reservas
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="jyr-card">
        <div className="jyr-card-body">
          <h5 className="mb-3">Crear reserva</h5>
          <form onSubmit={crearReserva}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Cod. Producto</label>
                <input
                  // // Producto a reservar
                  type="number"
                  min="1"
                  className="form-control"
                  value={formCrear.cod_producto}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, cod_producto: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Cod. Ubicacion</label>
                <input
                  // // Ubicacion donde se reservara inventario
                  type="number"
                  min="1"
                  className="form-control"
                  value={formCrear.cod_ubicacion}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, cod_ubicacion: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label">Cantidad</label>
                <input
                  // // Cantidad a reservar (>0)
                  type="number"
                  min="1"
                  step="1"
                  className="form-control"
                  value={formCrear.cantidad}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, cantidad: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Referencia (opcional)</label>
                <input
                  // // Referencia externa de cotizacion/documento
                  type="text"
                  maxLength={200}
                  className="form-control"
                  value={formCrear.referencia}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, referencia: event.target.value }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Observaciones (opcional)</label>
                <textarea
                  // // Observaciones de la reserva
                  rows="3"
                  maxLength={500}
                  className="form-control"
                  value={formCrear.observaciones}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, observaciones: event.target.value }))}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button
                  // // Submit de creacion de reserva
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingCrear}
                >
                  {savingCrear ? 'Guardando...' : 'Crear reserva'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <h5 className="mb-3">Acciones manuales</h5>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="border rounded p-3 h-100">
                <h6>Liberar reserva</h6>
                <div className="mb-2">
                  <label className="form-label">ID reserva</label>
                  <input
                    // // Id de reserva a liberar
                    type="number"
                    min="1"
                    className="form-control"
                    value={formLiberar.cod_reserva}
                    onChange={(event) => setFormLiberar((prev) => ({ ...prev, cod_reserva: event.target.value }))}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Motivo (opcional)</label>
                  <input
                    // // Motivo de liberacion
                    type="text"
                    maxLength={200}
                    className="form-control"
                    value={formLiberar.motivo}
                    onChange={(event) => setFormLiberar((prev) => ({ ...prev, motivo: event.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Observaciones (opcional)</label>
                  <input
                    // // Observaciones de liberacion
                    type="text"
                    maxLength={500}
                    className="form-control"
                    value={formLiberar.observaciones}
                    onChange={(event) => setFormLiberar((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                </div>
                <button
                  // // Boton de liberacion manual
                  type="button"
                  className="btn btn-warning"
                  disabled={savingLiberar}
                  onClick={() => liberarReserva()}
                >
                  {savingLiberar ? 'Liberando...' : 'Liberar'}
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="border rounded p-3 h-100">
                <h6>Consumir reserva</h6>
                <div className="mb-2">
                  <label className="form-label">ID reserva</label>
                  <input
                    // // Id de reserva a consumir
                    type="number"
                    min="1"
                    className="form-control"
                    value={formConsumir.cod_reserva}
                    onChange={(event) => setFormConsumir((prev) => ({ ...prev, cod_reserva: event.target.value }))}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Referencia (opcional)</label>
                  <input
                    // // Referencia del consumo de reserva
                    type="text"
                    maxLength={200}
                    className="form-control"
                    value={formConsumir.referencia}
                    onChange={(event) => setFormConsumir((prev) => ({ ...prev, referencia: event.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Observaciones (opcional)</label>
                  <input
                    // // Observaciones del consumo
                    type="text"
                    maxLength={500}
                    className="form-control"
                    value={formConsumir.observaciones}
                    onChange={(event) => setFormConsumir((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                </div>
                <button
                  // // Boton de consumo manual
                  type="button"
                  className="btn btn-danger"
                  disabled={savingConsumir}
                  onClick={() => consumirReserva()}
                >
                  {savingConsumir ? 'Consumiendo...' : 'Consumir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <h5 className="mb-3">Reservas locales de la sesión</h5>
          <div className="alert alert-light border mb-3">
            <strong>Total:</strong> {resumenReservas.total} | <strong>Activas:</strong> {resumenReservas.activas} | <strong>Liberadas:</strong> {resumenReservas.liberadas} | <strong>Consumidas:</strong> {resumenReservas.consumidas}
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Producto</th>
                  <th>Ubicación</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Referencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasLocales.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted">
                      Aún no hay reservas registradas en esta sesión.
                    </td>
                  </tr>
                )}
                {reservasLocales.map((r) => {
                  const estado = String(r.estado || '').toUpperCase();
                  const activa = estado === 'ACTIVA';
                  return (
                    <tr key={r.cod_reserva}>
                      <td>{r.cod_reserva}</td>
                      <td>{r.cod_producto || '-'}</td>
                      <td>{r.cod_ubicacion || '-'}</td>
                      <td>{r.cantidad}</td>
                      <td>{estado}</td>
                      <td>{r.referencia || '-'}</td>
                      <td className="d-flex gap-2">
                        <button
                          // // Liberacion rapida desde listado local
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          disabled={!activa || savingLiberar}
                          onClick={() => liberarReserva(r.cod_reserva)}
                        >
                          Liberar
                        </button>
                        <button
                          // // Consumo rapido desde listado local
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={!activa || savingConsumir}
                          onClick={() => consumirReserva(r.cod_reserva)}
                        >
                          Consumir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventarioReservasPage;
