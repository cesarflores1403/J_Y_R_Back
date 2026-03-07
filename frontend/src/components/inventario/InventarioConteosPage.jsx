import React, { useEffect, useMemo, useState } from 'react';
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

// // Traduce errores HTTP a mensajes funcionales para el flujo de conteos
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Error de validacion en datos del conteo';
  if (status === 404) return serverMessage || 'Conteo, producto, ubicacion o inventario no encontrado';
  if (status === 409) return serverMessage || 'Conflicto de estado del conteo o stock';
  return serverMessage || 'Error inesperado en conteo fisico';
};

const InventarioConteosPage = () => {
  // // Estado de carga inicial para feedback visual uniforme
  const [loading, setLoading] = useState(true);
  // // Estado del conteo activo (abierto/cerrado) en la vista
  const [conteoActivo, setConteoActivo] = useState(null);
  // // Lista local de detalles capturados para mostrar diferencias en tabla
  const [detalles, setDetalles] = useState([]);

  // // Formularios por etapa
  const [formApertura, setFormApertura] = useState(estadoAperturaInicial);
  const [formDetalle, setFormDetalle] = useState(estadoDetalleInicial);
  const [formCierre, setFormCierre] = useState(estadoCierreInicial);

  // // Input manual para retomar un conteo por id sin abrir uno nuevo
  const [conteoManual, setConteoManual] = useState('');

  // // Estados de proceso por etapa
  const [savingApertura, setSavingApertura] = useState(false);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [savingCierre, setSavingCierre] = useState(false);

  // // Mensajeria visual
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultadoCierre, setResultadoCierre] = useState(null);

  // // Finaliza loading inicial del submodulo
  useEffect(() => {
    setLoading(false);
  }, []);

  // // Calcula resumen local de diferencias capturadas en la tabla
  const resumenDiferencias = useMemo(() => {
    const positivos = detalles.filter((d) => Number(d.diferencia) > 0).length;
    const negativos = detalles.filter((d) => Number(d.diferencia) < 0).length;
    const sinCambio = detalles.filter((d) => Number(d.diferencia) === 0).length;
    return {
      total: detalles.length,
      positivos,
      negativos,
      sinCambio
    };
  }, [detalles]);

  // // Reemplaza o agrega detalle en el estado local por clave producto+ubicacion
  const upsertDetalleLocal = (resumen) => {
    if (!resumen) return;
    const clave = `${resumen.cod_producto}-${resumen.cod_ubicacion}`;
    setDetalles((prev) => {
      const mapa = new Map(prev.map((item) => [`${item.cod_producto}-${item.cod_ubicacion}`, item]));
      mapa.set(clave, {
        cod_producto: resumen.cod_producto,
        cod_ubicacion: resumen.cod_ubicacion,
        stock_sistema: resumen.stock_sistema,
        stock_fisico: resumen.stock_fisico,
        diferencia: resumen.diferencia,
        accion: resumen.accion
      });
      return Array.from(mapa.values());
    });
  };

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

      const codConteo = data?.data?.cod_conteo;
      setConteoActivo({
        cod_conteo: codConteo,
        estado: data?.data?.estado || 'ABIERTO'
      });
      setDetalles([]);
      setFormDetalle(estadoDetalleInicial);
      setFormCierre(estadoCierreInicial);
      setFormApertura(estadoAperturaInicial);
      setConteoManual(codConteo ? String(codConteo) : '');
      setSuccess(`Conteo ${codConteo} abierto correctamente`);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingApertura(false);
    }
  };

  // // Etapa 2: captura de detalle fisico (insert/update por producto+ubicacion)
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

      const resumen = data?.data?.resumen || null;
      upsertDetalleLocal(resumen);
      setConteoActivo((prev) => ({
        cod_conteo: codConteo,
        estado: prev?.estado || 'ABIERTO'
      }));
      setFormDetalle(estadoDetalleInicial);
      setSuccess(`Detalle ${resumen?.accion || 'registrado'} en conteo ${codConteo}`);
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

      setConteoActivo((prev) => ({
        cod_conteo: codConteo,
        estado: 'CERRADO',
        ...prev
      }));
      setResultadoCierre(data?.data || null);
      setSuccess(`Conteo ${codConteo} cerrado correctamente`);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSavingCierre(false);
    }
  };

  if (loading) {
    return (
      <div className="jyr-card mt-4">
        <div className="jyr-card-body d-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm" />
          <span>Cargando submodulo de conteo fisico...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiClipboard />
          <h3 className="mb-0">Conteo Fisico</h3>
        </div>
      </div>

      {success && (
        // // Feedback positivo del flujo de conteo
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {error && (
        // // Feedback de error funcional (validaciones y conflictos)
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
                  // // Observaciones iniciales del encabezado de conteo
                  type="text"
                  className="form-control"
                  maxLength={500}
                  value={formApertura.observaciones}
                  onChange={(event) => setFormApertura({ observaciones: event.target.value })}
                  placeholder="Conteo general de bodega principal"
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <button
                  // // Accion de apertura del conteo
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
                // // Permite retomar un conteo por id cuando se requiere captura manual posterior
                type="number"
                min="1"
                className="form-control"
                value={conteoManual}
                onChange={(event) => setConteoManual(event.target.value)}
                placeholder="ID conteo"
              />
            </div>
            <div className="col-12 col-md-8 d-flex align-items-end">
              <div className="w-100 alert alert-light border mb-0">
                <strong>Estado actual:</strong>{' '}
                {conteoActivo?.cod_conteo
                  ? `Conteo #${conteoActivo.cod_conteo} (${conteoActivo.estado || 'ABIERTO'})`
                  : 'Sin conteo en memoria'}
              </div>
            </div>
          </div>

          <form onSubmit={registrarDetalle}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Cod. Producto</label>
                <input
                  // // Producto contado fisicamente
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
                  // // Ubicacion fisica del conteo
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
                  // // Conteo fisico capturado (>=0)
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
                  // // Guarda linea de detalle del conteo
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
                  // // Comentario adicional de la linea de conteo
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
          <h5 className="mb-3">Diferencias capturadas</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ubicacion</th>
                  <th>Sistema</th>
                  <th>Fisico</th>
                  <th>Diferencia</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      Sin detalles capturados.
                    </td>
                  </tr>
                )}
                {detalles.map((item) => (
                  <tr key={`${item.cod_producto}-${item.cod_ubicacion}`}>
                    <td>{item.cod_producto}</td>
                    <td>{item.cod_ubicacion}</td>
                    <td>{item.stock_sistema}</td>
                    <td>{item.stock_fisico}</td>
                    <td className={Number(item.diferencia) === 0 ? '' : Number(item.diferencia) > 0 ? 'text-success' : 'text-danger'}>
                      {item.diferencia}
                    </td>
                    <td>{item.accion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="alert alert-light border mt-3 mb-0">
            <strong>Total detalles:</strong> {resumenDiferencias.total} |{' '}
            <strong>Positivos:</strong> {resumenDiferencias.positivos} |{' '}
            <strong>Negativos:</strong> {resumenDiferencias.negativos} |{' '}
            <strong>Sin cambio:</strong> {resumenDiferencias.sinCambio}
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
                  // // Observaciones finales del cierre de conteo
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
                  // // Accion de cierre transaccional del conteo
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
            // // Resumen final de cierre con conteo de ajustes aplicados
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
    </div>
  );
};

export default InventarioConteosPage;
