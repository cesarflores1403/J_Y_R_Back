import React, { useCallback, useMemo, useState } from 'react';
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

// // Estado inicial para liberar reserva por id
const estadoLiberarInicial = {
  cod_reserva: '',
  motivo: '',
  observaciones: ''
};

// // Estado inicial para consumir reserva por id
const estadoConsumirInicial = {
  cod_reserva: '',
  referencia: '',
  observaciones: ''
};

// // Estado inicial de filtros del listado persistente
const filtrosIniciales = {
  cod_producto: '',
  cod_ubicacion: '',
  estado: '',
  referencia: ''
};

const normalizarListado = (payload) => {
  if (Array.isArray(payload?.data) && payload?.meta) {
    return {
      filas: payload.data,
      total: Number(payload.meta.total || 0)
    };
  }

  return {
    filas: Array.isArray(payload?.datos) ? payload.datos : [],
    total: Number(payload?.total || 0)
  };
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

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString();
};

const InventarioReservasPage = () => {
  // // Estado local de formularios y feedback
  const [formCrear, setFormCrear] = useState(estadoCrearInicial);
  const [formLiberar, setFormLiberar] = useState(estadoLiberarInicial);
  const [formConsumir, setFormConsumir] = useState(estadoConsumirInicial);
  const [filtros, setFiltros] = useState(filtrosIniciales);

  // // Estado de proceso por accion
  const [savingCrear, setSavingCrear] = useState(false);
  const [savingLiberar, setSavingLiberar] = useState(false);
  const [savingConsumir, setSavingConsumir] = useState(false);
  const [loadingListado, setLoadingListado] = useState(true);

  // // Estado de mensajes globales de la pantalla
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservas, setReservas] = useState([]);
  const [totalReservas, setTotalReservas] = useState(0);

  // // Carga reservas persistidas con filtros
  const cargarReservas = useCallback(async (filtrosActivos = filtros) => {
    try {
      setLoadingListado(true);

      const params = {
        page: 1,
        limit: 50
      };
      if (filtrosActivos.cod_producto) params.cod_producto = Number(filtrosActivos.cod_producto);
      if (filtrosActivos.cod_ubicacion) params.cod_ubicacion = Number(filtrosActivos.cod_ubicacion);
      if (filtrosActivos.estado) params.estado = filtrosActivos.estado;
      if (filtrosActivos.referencia) params.referencia = filtrosActivos.referencia;

      const { data } = await inventarioReservasApi.listar(params);
      if (!data?.ok) {
        setReservas([]);
        setTotalReservas(0);
        setError('Respuesta invalida al listar reservas');
        return;
      }

      const normalizado = normalizarListado(data.data);
      setReservas(normalizado.filas);
      setTotalReservas(normalizado.total);
    } catch (err) {
      setReservas([]);
      setTotalReservas(0);
      setError(obtenerMensajeError(err));
    } finally {
      setLoadingListado(false);
    }
  }, [filtros]);

  // // Ejecuta carga inicial del historial persistente
  React.useEffect(() => {
    cargarReservas(filtrosIniciales);
  }, [cargarReservas]);

  // // Resumen rapido de estados en el listado actual
  const resumenReservas = useMemo(() => {
    const activas = reservas.filter((r) => String(r.estado || '').toUpperCase() === 'ACTIVA').length;
    const liberadas = reservas.filter((r) => String(r.estado || '').toUpperCase() === 'LIBERADA').length;
    const consumidas = reservas.filter((r) => String(r.estado || '').toUpperCase() === 'CONSUMIDA').length;
    return {
      activas,
      liberadas,
      consumidas
    };
  }, [reservas]);

  // // Crea reserva y recarga listado persistente
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

      setFormCrear(estadoCrearInicial);
      setSuccess('Reserva creada correctamente');
      await cargarReservas();
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingCrear(false);
    }
  };

  // // Libera reserva por id y recarga historial
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

      setFormLiberar(estadoLiberarInicial);
      setSuccess(`Reserva ${codReserva} liberada correctamente`);
      await cargarReservas();
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingLiberar(false);
    }
  };

  // // Consume reserva por id y recarga historial
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

      setFormConsumir(estadoConsumirInicial);
      setSuccess(`Reserva ${codReserva} consumida correctamente`);
      await cargarReservas();
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingConsumir(false);
    }
  };

  // // Aplica filtros del historial
  const aplicarFiltros = async () => {
    setError('');
    await cargarReservas(filtros);
  };

  // // Limpia filtros del historial
  const limpiarFiltros = async () => {
    setFiltros(filtrosIniciales);
    setError('');
    await cargarReservas(filtrosIniciales);
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
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {error && (
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
                  rows="3"
                  maxLength={500}
                  className="form-control"
                  value={formCrear.observaciones}
                  onChange={(event) => setFormCrear((prev) => ({ ...prev, observaciones: event.target.value }))}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button
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
                    type="text"
                    maxLength={500}
                    className="form-control"
                    value={formLiberar.observaciones}
                    onChange={(event) => setFormLiberar((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                </div>
                <button
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
                    type="text"
                    maxLength={500}
                    className="form-control"
                    value={formConsumir.observaciones}
                    onChange={(event) => setFormConsumir((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                </div>
                <button
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
          <h5 className="mb-3">Historial persistente de reservas</h5>

          <div className="row g-2 mb-3">
            <div className="col-12 col-md-2">
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Producto"
                value={filtros.cod_producto}
                onChange={(event) => setFiltros((prev) => ({ ...prev, cod_producto: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-2">
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Ubicacion"
                value={filtros.cod_ubicacion}
                onChange={(event) => setFiltros((prev) => ({ ...prev, cod_ubicacion: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-2">
              <select
                className="form-select"
                value={filtros.estado}
                onChange={(event) => setFiltros((prev) => ({ ...prev, estado: event.target.value }))}
              >
                <option value="">Estado</option>
                <option value="ACTIVA">ACTIVA</option>
                <option value="LIBERADA">LIBERADA</option>
                <option value="CONSUMIDA">CONSUMIDA</option>
                <option value="ANULADA">ANULADA</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Referencia"
                value={filtros.referencia}
                onChange={(event) => setFiltros((prev) => ({ ...prev, referencia: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-3 d-flex gap-2">
              <button type="button" className="btn btn-outline-primary w-100" onClick={aplicarFiltros} disabled={loadingListado}>
                Buscar
              </button>
              <button type="button" className="btn btn-outline-secondary w-100" onClick={limpiarFiltros} disabled={loadingListado}>
                Limpiar
              </button>
            </div>
          </div>

          <div className="alert alert-light border mb-3">
            <strong>Total:</strong> {totalReservas} | <strong>Activas:</strong> {resumenReservas.activas} | <strong>Liberadas:</strong> {resumenReservas.liberadas} | <strong>Consumidas:</strong> {resumenReservas.consumidas}
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Ubicacion</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Referencia</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!loadingListado && reservas.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      No hay reservas registradas.
                    </td>
                  </tr>
                )}
                {reservas.map((r) => {
                  const estado = String(r.estado || '').toUpperCase();
                  const activa = estado === 'ACTIVA';
                  return (
                    <tr key={r.cod_reserva}>
                      <td>{r.cod_reserva}</td>
                      <td>{formatearFecha(r.fecha_creacion)}</td>
                      <td>{r.nombre_producto || r.cod_producto}</td>
                      <td>{r.ubicacion || r.cod_ubicacion}</td>
                      <td>{r.cantidad}</td>
                      <td>{estado}</td>
                      <td>{r.referencia || '-'}</td>
                      <td>{r.usuario_creacion || '-'}</td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          disabled={!activa || savingLiberar}
                          onClick={() => liberarReserva(r.cod_reserva)}
                        >
                          Liberar
                        </button>
                        <button
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

