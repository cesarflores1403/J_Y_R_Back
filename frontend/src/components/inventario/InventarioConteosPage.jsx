import React, { useCallback, useMemo, useState } from 'react';
import { FiClipboard } from 'react-icons/fi';
import { inventarioConteosApi } from './inventarioConteos.api.js';

// // Estado inicial del formulario para abrir conteo
const estadoAperturaInicial = {
  observaciones: ''
};

// // Estado inicial del formulario de detalle fisico
const estadoDetalleInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  stock_fisico: '',
  observaciones: ''
};

// // Estado inicial de formulario de cierre
const estadoCierreInicial = {
  observaciones_cierre: ''
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

// // Traduce errores HTTP a mensajes funcionales para el flujo de conteos
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Error de validacion en datos del conteo';
  if (status === 404) return serverMessage || 'Conteo, producto, ubicacion o inventario no encontrado';
  if (status === 409) return serverMessage || 'Conflicto de estado del conteo o stock';
  return serverMessage || 'Error inesperado en conteo fisico';
};

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString();
};

const InventarioConteosPage = () => {
  // // Estado de pantalla
  const [conteos, setConteos] = useState([]);
  const [totalConteos, setTotalConteos] = useState(0);
  const [detalles, setDetalles] = useState([]);
  const [totalDetalles, setTotalDetalles] = useState(0);
  const [conteoActivo, setConteoActivo] = useState(null);
  const [conteoManual, setConteoManual] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // // Formularios por etapa
  const [formApertura, setFormApertura] = useState(estadoAperturaInicial);
  const [formDetalle, setFormDetalle] = useState(estadoDetalleInicial);
  const [formCierre, setFormCierre] = useState(estadoCierreInicial);

  // // Estados de proceso
  const [loadingConteos, setLoadingConteos] = useState(true);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [savingApertura, setSavingApertura] = useState(false);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [savingCierre, setSavingCierre] = useState(false);

  // // Mensajeria visual
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultadoCierre, setResultadoCierre] = useState(null);

  // // Carga historial de conteos persistidos
  const cargarConteos = useCallback(async (estado = filtroEstado) => {
    try {
      setLoadingConteos(true);
      setError('');

      const params = {
        page: 1,
        limit: 30
      };
      if (estado) params.estado = estado;

      const { data } = await inventarioConteosApi.listar(params);
      if (!data?.ok) {
        setConteos([]);
        setTotalConteos(0);
        setError('Respuesta invalida al listar conteos');
        return;
      }

      const normalizado = normalizarListado(data.data);
      setConteos(normalizado.filas);
      setTotalConteos(normalizado.total);
    } catch (err) {
      setConteos([]);
      setTotalConteos(0);
      setError(obtenerMensajeError(err));
    } finally {
      setLoadingConteos(false);
    }
  }, [filtroEstado]);

  // // Carga detalle persistido de un conteo
  const cargarDetallesConteo = useCallback(async (codConteo) => {
    if (!Number.isInteger(codConteo) || codConteo <= 0) return;

    try {
      setLoadingDetalles(true);
      setError('');

      const { data } = await inventarioConteosApi.listarDetalles(codConteo, {
        page: 1,
        limit: 500
      });
      if (!data?.ok) {
        setDetalles([]);
        setTotalDetalles(0);
        setError('Respuesta invalida al listar detalle del conteo');
        return;
      }

      const normalizado = normalizarListado(data.data);
      setDetalles(normalizado.filas);
      setTotalDetalles(normalizado.total);
      setConteoActivo(data.data?.conteo || null);
    } catch (err) {
      setDetalles([]);
      setTotalDetalles(0);
      setError(obtenerMensajeError(err));
    } finally {
      setLoadingDetalles(false);
    }
  }, []);

  // // Carga inicial de historial
  React.useEffect(() => {
    cargarConteos('');
  }, [cargarConteos]);

  // // Calcula resumen local de diferencias capturadas
  const resumenDiferencias = useMemo(() => {
    const positivos = detalles.filter((d) => Number(d.diferencia) > 0).length;
    const negativos = detalles.filter((d) => Number(d.diferencia) < 0).length;
    const sinCambio = detalles.filter((d) => Number(d.diferencia) === 0).length;
    return {
      positivos,
      negativos,
      sinCambio
    };
  }, [detalles]);

  // // Etapa 1: apertura de conteo fisico
  const abrirConteo = async (event) => {
    event.preventDefault();

    try {
      setSavingApertura(true);
      setError('');
      setSuccess('');
      setResultadoCierre(null);

      const payload = {
        observaciones: String(formApertura.observaciones || '').trim()
      };

      const { data } = await inventarioConteosApi.abrir(payload);
      if (!data?.ok) {
        setError('Respuesta invalida al abrir conteo');
        return;
      }

      const codConteo = Number(data?.data?.cod_conteo || 0);
      setConteoManual(codConteo ? String(codConteo) : '');
      setFormApertura(estadoAperturaInicial);
      setFormDetalle(estadoDetalleInicial);
      setFormCierre(estadoCierreInicial);
      setSuccess(`Conteo ${codConteo} abierto correctamente`);
      await cargarConteos();
      await cargarDetallesConteo(codConteo);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingApertura(false);
    }
  };

  // // Etapa 2: captura de detalle fisico persistente
  const registrarDetalle = async (event) => {
    event.preventDefault();

    try {
      setSavingDetalle(true);
      setError('');
      setSuccess('');

      const codConteo = Number(conteoActivo?.cod_conteo || conteoManual);
      if (!Number.isInteger(codConteo) || codConteo <= 0) {
        setError('Debes indicar un conteo valido para registrar detalle');
        return;
      }

      const stockFisico = Number(formDetalle.stock_fisico);
      if (!Number.isInteger(stockFisico) || stockFisico < 0) {
        setError('stock_fisico debe ser un entero mayor o igual a 0');
        return;
      }

      const payload = {
        cod_producto: Number(formDetalle.cod_producto),
        cod_ubicacion: Number(formDetalle.cod_ubicacion),
        stock_fisico: stockFisico,
        observaciones: String(formDetalle.observaciones || '').trim()
      };

      const { data } = await inventarioConteosApi.registrarDetalle(codConteo, payload);
      if (!data?.ok) {
        setError('Respuesta invalida al registrar detalle del conteo');
        return;
      }

      setFormDetalle(estadoDetalleInicial);
      setSuccess(`Detalle ${data?.data?.accion || 'registrado'} en conteo ${codConteo}`);
      await cargarConteos();
      await cargarDetallesConteo(codConteo);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingDetalle(false);
    }
  };

  // // Etapa 3: cierre de conteo con ajustes automaticos
  const cerrarConteo = async (event) => {
    event.preventDefault();

    try {
      setSavingCierre(true);
      setError('');
      setSuccess('');

      const codConteo = Number(conteoActivo?.cod_conteo || conteoManual);
      if (!Number.isInteger(codConteo) || codConteo <= 0) {
        setError('Debes indicar un conteo valido para cerrarlo');
        return;
      }

      const payload = {
        observaciones_cierre: String(formCierre.observaciones_cierre || '').trim()
      };

      const { data } = await inventarioConteosApi.cerrar(codConteo, payload);
      if (!data?.ok) {
        setError('Respuesta invalida al cerrar conteo');
        return;
      }

      setResultadoCierre(data?.data || null);
      setSuccess(`Conteo ${codConteo} cerrado correctamente`);
      await cargarConteos();
      await cargarDetallesConteo(codConteo);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingCierre(false);
    }
  };

  // // Carga manual de detalle de conteo existente
  const cargarConteoManual = async () => {
    const codConteo = Number(conteoManual);
    if (!Number.isInteger(codConteo) || codConteo <= 0) {
      setError('Debes indicar un conteo valido para consultar detalle');
      return;
    }
    await cargarDetallesConteo(codConteo);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiClipboard />
          <h3 className="mb-0">Conteo Fisico</h3>
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
          <h5 className="mb-3">1) Abrir conteo</h5>
          <form onSubmit={abrirConteo}>
            <div className="row g-3">
              <div className="col-12 col-md-9">
                <label className="form-label">Observaciones (opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={500}
                  value={formApertura.observaciones}
                  onChange={(event) => setFormApertura({ observaciones: event.target.value })}
                  placeholder="Conteo general de bodega"
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={savingApertura}
                >
                  {savingApertura ? 'Abriendo...' : 'Abrir conteo'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <h5 className="mb-3">2) Capturar detalle</h5>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Conteo activo</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={conteoManual}
                onChange={(event) => setConteoManual(event.target.value)}
                placeholder="ID conteo"
              />
            </div>
            <div className="col-12 col-md-3 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={cargarConteoManual}
                disabled={loadingDetalles}
              >
                Cargar detalle
              </button>
            </div>
            <div className="col-12 col-md-5 d-flex align-items-end">
              <div className="w-100 alert alert-light border mb-0">
                <strong>Estado actual:</strong>{' '}
                {conteoActivo?.cod_conteo
                  ? `Conteo #${conteoActivo.cod_conteo} (${conteoActivo.estado || 'ABIERTO'})`
                  : 'Sin conteo seleccionado'}
              </div>
            </div>
          </div>

          <form onSubmit={registrarDetalle}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Cod. Producto</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={formDetalle.cod_producto}
                  onChange={(event) => setFormDetalle((prev) => ({ ...prev, cod_producto: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Cod. Ubicacion</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={formDetalle.cod_ubicacion}
                  onChange={(event) => setFormDetalle((prev) => ({ ...prev, cod_ubicacion: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Stock fisico</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={formDetalle.stock_fisico}
                  onChange={(event) => setFormDetalle((prev) => ({ ...prev, stock_fisico: event.target.value }))}
                  required
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-secondary w-100"
                  disabled={savingDetalle}
                >
                  {savingDetalle ? 'Guardando...' : 'Guardar detalle'}
                </button>
              </div>
              <div className="col-12">
                <label className="form-label">Observaciones detalle (opcional)</label>
                <input
                  type="text"
                  maxLength={500}
                  className="form-control"
                  value={formDetalle.observaciones}
                  onChange={(event) => setFormDetalle((prev) => ({ ...prev, observaciones: event.target.value }))}
                  placeholder="Detalle del conteo por ubicacion"
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <h5 className="mb-3">Diferencias persistidas del conteo</h5>
          <div className="alert alert-light border mb-3">
            <strong>Total detalle:</strong> {totalDetalles} | <strong>Positivos:</strong> {resumenDiferencias.positivos} | <strong>Negativos:</strong> {resumenDiferencias.negativos} | <strong>Sin cambio:</strong> {resumenDiferencias.sinCambio}
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ubicacion</th>
                  <th>Sistema</th>
                  <th>Fisico</th>
                  <th>Diferencia</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {!loadingDetalles && detalles.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      Sin detalle persistido para el conteo seleccionado.
                    </td>
                  </tr>
                )}
                {detalles.map((item) => (
                  <tr key={item.cod_conteo_detalle || `${item.cod_producto}-${item.cod_ubicacion}-${item.fecha_registro}`}>
                    <td>{item.nombre_producto || item.cod_producto}</td>
                    <td>{item.ubicacion || item.cod_ubicacion}</td>
                    <td>{item.stock_sistema}</td>
                    <td>{item.stock_fisico}</td>
                    <td className={Number(item.diferencia) === 0 ? '' : Number(item.diferencia) > 0 ? 'text-success' : 'text-danger'}>
                      {item.diferencia}
                    </td>
                    <td>{formatearFecha(item.fecha_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <h5 className="mb-3">3) Cerrar conteo</h5>
          <form onSubmit={cerrarConteo}>
            <div className="row g-3">
              <div className="col-12 col-md-9">
                <label className="form-label">Observaciones cierre (opcional)</label>
                <input
                  type="text"
                  maxLength={500}
                  className="form-control"
                  value={formCierre.observaciones_cierre}
                  onChange={(event) => setFormCierre({ observaciones_cierre: event.target.value })}
                  placeholder="Cierre validado por administracion"
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-danger w-100"
                  disabled={savingCierre}
                >
                  {savingCierre ? 'Cerrando...' : 'Cerrar conteo'}
                </button>
              </div>
            </div>
          </form>

          {resultadoCierre?.resumen && (
            <div className="alert alert-light border mt-3 mb-0">
              <div><strong>Total detalles:</strong> {resultadoCierre.resumen.total_detalles}</div>
              <div><strong>Ajustes +:</strong> {resultadoCierre.resumen.ajustes_positivos}</div>
              <div><strong>Ajustes -:</strong> {resultadoCierre.resumen.ajustes_negativos}</div>
              <div><strong>Sin cambio:</strong> {resultadoCierre.resumen.detalles_sin_cambio}</div>
              <div><strong>Movimientos generados:</strong> {resultadoCierre.resumen.total_movimientos_generados}</div>
            </div>
          )}
        </div>
      </div>

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 className="mb-0">Historial persistente de conteos</h5>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="ABIERTO">ABIERTO</option>
                <option value="CERRADO">CERRADO</option>
                <option value="ANULADO">ANULADO</option>
              </select>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => cargarConteos()}
                disabled={loadingConteos}
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="alert alert-light border mb-3">
            <strong>Total conteos:</strong> {totalConteos}
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th>Detalle</th>
                  <th>Diferencias +</th>
                  <th>Diferencias -</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {!loadingConteos && conteos.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      No hay conteos registrados.
                    </td>
                  </tr>
                )}
                {conteos.map((item) => (
                  <tr key={item.cod_conteo}>
                    <td>{item.cod_conteo}</td>
                    <td>{item.estado || '-'}</td>
                    <td>{formatearFecha(item.fecha_apertura)}</td>
                    <td>{formatearFecha(item.fecha_cierre)}</td>
                    <td>{item.total_detalles || 0}</td>
                    <td>{item.total_diferencias_positivas || 0}</td>
                    <td>{item.total_diferencias_negativas || 0}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={async () => {
                          setConteoManual(String(item.cod_conteo));
                          await cargarDetallesConteo(Number(item.cod_conteo));
                        }}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventarioConteosPage;

