import React, { useEffect, useMemo, useState } from 'react';
import { inventarioTransferenciasApi } from './inventarioTransferencias.api.js';
import { inventarioExistenciasApi } from './inventarioExistencias.api.js';

const estadoInicial = {
  cod_producto: '',
  cod_ubicacion_origen: '',
  cod_ubicacion_destino: '',
  cantidad: '',
  referencia: '',
  motivo: '',
  observaciones: ''
};

const formatearCodigoProducto = (producto) => {
  const codigo = String(producto?.codigo_producto || '').trim().toUpperCase();
  if (codigo) return codigo;

  const id = Number(producto?.cod_producto || 0);
  if (Number.isInteger(id) && id > 0) {
    return `PROD-${String(id).padStart(4, '0')}`;
  }

  return '';
};

const esUbicacionActiva = (estado) => {
  if (estado === null || estado === undefined) return true;
  const normalizado = String(estado).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(normalizado);
};

const formatearEtiquetaUbicacion = (ubicacion) => {
  const pasillo = String(ubicacion?.pasillo || '').trim();
  const estanteria = String(ubicacion?.estanteria || '').trim();
  const nivel1 = String(ubicacion?.nivel_1 || '').trim();
  const nivel2 = String(ubicacion?.nivel_2 || '').trim();
  const descripcion = String(ubicacion?.descripcion || '').trim();

  const traza = [
    pasillo ? `P:${pasillo}` : null,
    estanteria ? `E:${estanteria}` : null,
    nivel1 ? `N1:${nivel1}` : null,
    nivel2 ? `N2:${nivel2}` : null
  ].filter(Boolean).join(' ');

  if (descripcion) return `${traza || 'Ubicacion'} - ${descripcion}`;
  return traza || `Ubicacion ${ubicacion?.cod_ubicacion ?? ''}`.trim();
};

const obtenerMensajeError = (error) => {
  if (!error?.response) {
    return 'No se pudo conectar con la API. Verifica backend y frontend, luego recarga la pagina.';
  }

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;
  const erroresValidacion = error?.response?.data?.errors || error?.response?.data?.errores;

  if (Array.isArray(erroresValidacion) && erroresValidacion.length > 0) {
    const primero = erroresValidacion[0];
    return primero?.msg || primero?.mensaje || serverMessage || 'Datos invalidos para registrar la transferencia';
  }

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la transferencia';
  if (status === 404) return serverMessage || 'Producto o ubicacion no encontrado';
  if (status === 409) return serverMessage || 'No se puede completar la transferencia por stock o concurrencia';
  if (status === 401) return serverMessage || 'Sesion expirada o invalida. Inicia sesion nuevamente';
  if (status === 403) return serverMessage || 'No tienes permisos para registrar transferencias';
  if (status >= 500) return serverMessage || 'Error interno del backend al registrar la transferencia';
  return serverMessage || 'Error inesperado al registrar la transferencia';
};

const TransferenciaForm = ({
  abierto = false,
  onClose,
  onTransferenciaRegistrada,
  productos = [],
  ubicaciones = []
}) => {
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existenciasProducto, setExistenciasProducto] = useState([]);
  const [loadingOrigenes, setLoadingOrigenes] = useState(false);
  const [errorOrigenes, setErrorOrigenes] = useState('');

  const opcionesProducto = useMemo(() => (
    (Array.isArray(productos) ? productos : [])
      .filter((item) => String(item?.estado_producto || '').toLowerCase() === 'activo')
      .map((item) => ({
        cod_producto: Number(item.cod_producto),
        nombre_producto: item.nombre_producto || 'Sin nombre',
        codigo_producto: formatearCodigoProducto(item)
      }))
      .filter((item) => Number.isInteger(item.cod_producto) && item.cod_producto > 0)
  ), [productos]);

  const opcionesUbicacion = useMemo(() => (
    (Array.isArray(ubicaciones) ? ubicaciones : [])
      .filter((item) => Number.isInteger(Number(item?.cod_ubicacion)) && Number(item.cod_ubicacion) > 0)
      .filter((item) => esUbicacionActiva(item?.estado_ubi))
  ), [ubicaciones]);

  const codigosOrigenConExistencia = useMemo(() => {
    const set = new Set();
    (Array.isArray(existenciasProducto) ? existenciasProducto : []).forEach((fila) => {
      const codInventario = Number(fila?.cod_inventario || 0);
      const codUbicacion = Number(fila?.cod_ubicacion || 0);
      const stockDisponible = Number(fila?.stock_disponible ?? fila?.stock ?? 0);
      if (
        Number.isInteger(codInventario) && codInventario > 0
        && Number.isInteger(codUbicacion) && codUbicacion > 0
        && stockDisponible > 0
      ) {
        set.add(codUbicacion);
      }
    });
    return set;
  }, [existenciasProducto]);

  const origenesValidos = useMemo(() => (
    opcionesUbicacion.filter((ubi) => codigosOrigenConExistencia.has(Number(ubi.cod_ubicacion)))
  ), [opcionesUbicacion, codigosOrigenConExistencia]);

  useEffect(() => {
    if (!abierto) {
      setForm(estadoInicial);
      setError('');
      setExistenciasProducto([]);
      setErrorOrigenes('');
    }
  }, [abierto]);

  useEffect(() => {
    let cancelado = false;

    const cargarOrigenesPorProducto = async () => {
      const codProducto = Number(form.cod_producto || 0);
      if (!abierto || !Number.isInteger(codProducto) || codProducto < 1) {
        if (!cancelado) {
          setExistenciasProducto([]);
          setErrorOrigenes('');
          setLoadingOrigenes(false);
        }
        return;
      }

      try {
        setLoadingOrigenes(true);
        setErrorOrigenes('');

        const { data } = await inventarioExistenciasApi.listar({
          cod_producto: codProducto,
          page: 1,
          limit: 100,
          includeInactive: false
        });

        if (!cancelado && data?.ok) {
          const filas = Array.isArray(data?.data?.data)
            ? data.data.data
            : (Array.isArray(data?.data?.datos) ? data.data.datos : []);
          setExistenciasProducto(filas);
        }
      } catch (err) {
        if (!cancelado) {
          setExistenciasProducto([]);
          const serverMessage = err?.response?.data?.message || err?.response?.data?.mensaje;
          setErrorOrigenes(serverMessage || 'No se pudieron cargar los origenes con stock para el producto seleccionado');
        }
      } finally {
        if (!cancelado) setLoadingOrigenes(false);
      }
    };

    cargarOrigenesPorProducto();

    return () => {
      cancelado = true;
    };
  }, [abierto, form.cod_producto]);

  useEffect(() => {
    if (!abierto) return;

    const origenActual = Number(form.cod_ubicacion_origen || 0);
    if (!origenActual) return;
    if (codigosOrigenConExistencia.has(origenActual)) return;

    setForm((prev) => ({
      ...prev,
      cod_ubicacion_origen: ''
    }));
  }, [abierto, codigosOrigenConExistencia, form.cod_ubicacion_origen]);

  const cerrarModal = () => {
    if (saving) return;
    if (typeof onClose === 'function') onClose();
  };

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const registrarTransferencia = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const codProducto = Number(form.cod_producto);
      const codUbicacionOrigen = Number(form.cod_ubicacion_origen);
      const codUbicacionDestino = Number(form.cod_ubicacion_destino);
      const cantidad = Number(form.cantidad);

      if (!Number.isInteger(codProducto) || codProducto < 1) {
        setError('Debes seleccionar un producto valido');
        return;
      }

      if (!Number.isInteger(codUbicacionOrigen) || codUbicacionOrigen < 1) {
        setError('Debes seleccionar una ubicacion origen valida');
        return;
      }

      if (!codigosOrigenConExistencia.has(codUbicacionOrigen)) {
        setError('La ubicacion origen no tiene stock disponible para el producto seleccionado');
        return;
      }

      if (!Number.isInteger(codUbicacionDestino) || codUbicacionDestino < 1) {
        setError('Debes seleccionar una ubicacion destino valida');
        return;
      }

      if (codUbicacionOrigen === codUbicacionDestino) {
        setError('La ubicacion origen y destino no pueden ser iguales');
        return;
      }

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      const referencia = String(form.referencia || '').trim();
      if (!referencia) {
        setError('referencia es requerida');
        return;
      }

      const payload = {
        cod_producto: codProducto,
        cod_ubicacion_origen: codUbicacionOrigen,
        cod_ubicacion_destino: codUbicacionDestino,
        cantidad,
        referencia,
        motivo: String(form.motivo || '').trim(),
        observaciones: String(form.observaciones || '').trim()
      };

      const { data } = await inventarioTransferenciasApi.registrar(payload);

      if (data?.ok) {
        setForm(estadoInicial);
        if (typeof onTransferenciaRegistrada === 'function') {
          await onTransferenciaRegistrada(data.data);
        }
        cerrarModal();
      } else {
        setError('Respuesta invalida del servidor al registrar la transferencia');
      }
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!abierto) return null;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cerrarModal();
      }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Registrar transferencia</h5>
            <button type="button" className="btn-close" onClick={cerrarModal} disabled={saving} />
          </div>

          <form onSubmit={registrarTransferencia}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger mb-3" role="alert">
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    className="form-select"
                    value={form.cod_producto}
                    onChange={(event) => actualizarCampo('cod_producto', event.target.value)}
                    disabled={saving || opcionesProducto.length === 0}
                    required
                  >
                    <option value="">
                      {opcionesProducto.length === 0 ? 'Cargando productos...' : 'Seleccione un producto real'}
                    </option>
                    {opcionesProducto.map((item) => (
                      <option key={item.cod_producto} value={String(item.cod_producto)}>
                        {item.codigo_producto} - {item.nombre_producto}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">Este campo se toma del listado real de productos activos.</small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={form.cantidad}
                    onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                    placeholder="Ej: 4"
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion origen *</label>
                  <select
                    className="form-select"
                    value={form.cod_ubicacion_origen}
                    onChange={(event) => actualizarCampo('cod_ubicacion_origen', event.target.value)}
                    disabled={saving || loadingOrigenes || origenesValidos.length === 0}
                    required
                  >
                    <option value="">
                      {loadingOrigenes
                        ? 'Cargando origenes validos...'
                        : 'Seleccione una ubicacion con stock disponible'}
                    </option>
                    {origenesValidos.map((item) => (
                      <option
                        key={`origen-${item.cod_ubicacion}`}
                        value={String(item.cod_ubicacion)}
                        disabled={String(form.cod_ubicacion_destino) === String(item.cod_ubicacion)}
                      >
                        {formatearEtiquetaUbicacion(item)}
                      </option>
                    ))}
                  </select>
                  {errorOrigenes && (
                    <small className="text-danger d-block mt-1">{errorOrigenes}</small>
                  )}
                  {!loadingOrigenes && !errorOrigenes && Number(form.cod_producto || 0) > 0 && origenesValidos.length === 0 && (
                    <small className="text-warning d-block mt-1">
                      Este producto no tiene inventario disponible en ninguna ubicacion para transferir.
                    </small>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion destino *</label>
                  <select
                    className="form-select"
                    value={form.cod_ubicacion_destino}
                    onChange={(event) => actualizarCampo('cod_ubicacion_destino', event.target.value)}
                    disabled={saving || opcionesUbicacion.length === 0}
                    required
                  >
                    <option value="">Seleccione una ubicacion activa</option>
                    {opcionesUbicacion.map((item) => (
                      <option
                        key={`destino-${item.cod_ubicacion}`}
                        value={String(item.cod_ubicacion)}
                        disabled={String(form.cod_ubicacion_origen) === String(item.cod_ubicacion)}
                      >
                        {formatearEtiquetaUbicacion(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-8">
                  <label className="form-label">Referencia documento *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.referencia}
                    onChange={(event) => actualizarCampo('referencia', event.target.value)}
                    placeholder="TRF-2026-0001"
                    maxLength={200}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Motivo (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.motivo}
                    onChange={(event) => actualizarCampo('motivo', event.target.value)}
                    placeholder="Reubicacion interna"
                    maxLength={120}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.observaciones}
                    onChange={(event) => actualizarCampo('observaciones', event.target.value)}
                    placeholder="Notas del traslado interno"
                    maxLength={500}
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
                  'Registrar transferencia'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransferenciaForm;
