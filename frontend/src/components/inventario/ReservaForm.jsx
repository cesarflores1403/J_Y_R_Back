import React, { useEffect, useMemo, useState } from 'react';
import { inventarioReservasApi } from './inventarioReservas.api.js';
import { REFERENCIAS_RESERVA } from './referenciasReserva.js';
import { sanitizarTexto } from '../../utils/sanitizarTexto.js';

const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia: '',
  observaciones: ''
};

// Tope de cantidad para evitar que un número exagerado bloquee la interfaz.
const MAX_CANTIDAD_RESERVA = 999999;

// Tope de caracteres del campo Observaciones (con contador y alerta al usuario).
const MAX_OBSERVACIONES = 500;

const formatearCodigoProducto = (producto) => {
  const codigo = String(producto?.codigo_producto || '').trim().toUpperCase();
  if (codigo) return codigo;

  const id = Number(producto?.cod_producto || 0);
  if (Number.isInteger(id) && id > 0) {
    return `PROD-${String(id).padStart(4, '0')}`;
  }

  return '';
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

  if (descripcion) {
    return `${traza || 'Ubicacion'} - ${descripcion}`;
  }

  return traza || `Ubicacion ${ubicacion?.cod_ubicacion ?? ''}`.trim();
};

const obtenerMensajeError = (error) => {
  if (!error?.response) {
    return 'No se pudo conectar con la API. Verifica backend y frontend corriendo.';
  }

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;
  const erroresValidacion = error?.response?.data?.errors || error?.response?.data?.errores;

  if (Array.isArray(erroresValidacion) && erroresValidacion.length > 0) {
    const primero = erroresValidacion[0];
    return primero?.msg || primero?.mensaje || serverMessage || 'Datos invalidos para registrar la reserva';
  }

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la reserva';
  if (status === 404) return serverMessage || 'Inventario no encontrado para producto y ubicacion';
  if (status === 409) return serverMessage || 'No hay stock disponible para reservar esa cantidad';
  if (status === 401) return serverMessage || 'Sesion expirada o invalida. Inicia sesion nuevamente';
  if (status === 403) return serverMessage || 'No tienes permisos para registrar reservas';
  if (status >= 500) return serverMessage || 'Error interno del backend al registrar la reserva';
  return serverMessage || 'Error inesperado al registrar la reserva';
};

const ReservaForm = ({
  abierto = false,
  onClose,
  onReservaRegistrada,
  ubicaciones = [],
  loadingUbicaciones = false
}) => {
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // // Catalogo de productos SIEMPRE condicionado a la ubicacion seleccionada.
  // // No se muestran productos globales: solo los que tienen stock disponible
  // // en la ubicacion elegida (fuente de verdad: backend /reservas/disponibles).
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [avisoProductos, setAvisoProductos] = useState('');

  const opcionesUbicacion = useMemo(() => (
    (Array.isArray(ubicaciones) ? ubicaciones : [])
      .filter((item) => Number.isInteger(Number(item?.cod_ubicacion)) && Number(item.cod_ubicacion) > 0)
  ), [ubicaciones]);

  const opcionesProducto = useMemo(() => (
    (Array.isArray(productosDisponibles) ? productosDisponibles : [])
      .filter((item) => Number.isInteger(Number(item?.cod_producto)) && Number(item.cod_producto) > 0)
      .map((item) => ({
        cod_producto: Number(item.cod_producto),
        nombre_producto: item.nombre_producto || 'Sin nombre',
        codigo_producto: formatearCodigoProducto(item),
        stock_disponible: Number(item.stock_disponible || 0)
      }))
  ), [productosDisponibles]);

  const ubicacionSeleccionada = Number.isInteger(Number(form.cod_ubicacion)) && Number(form.cod_ubicacion) > 0;

  // // Producto elegido dentro del catalogo condicionado (para topar la cantidad)
  const productoSeleccionado = useMemo(() => (
    opcionesProducto.find((item) => String(item.cod_producto) === String(form.cod_producto)) || null
  ), [opcionesProducto, form.cod_producto]);

  const maxDisponible = productoSeleccionado
    ? Math.max(0, Math.min(MAX_CANTIDAD_RESERVA, productoSeleccionado.stock_disponible))
    : MAX_CANTIDAD_RESERVA;

  useEffect(() => {
    if (!abierto) {
      setForm(estadoInicial);
      setError('');
      setProductosDisponibles([]);
      setAvisoProductos('');
    }
  }, [abierto]);

  // // Cada vez que cambia la ubicacion, recargamos el catalogo de productos
  // // disponibles y descartamos cualquier producto previamente elegido.
  useEffect(() => {
    if (!abierto) return undefined;

    const codUbicacion = Number(form.cod_ubicacion);
    if (!Number.isInteger(codUbicacion) || codUbicacion <= 0) {
      setProductosDisponibles([]);
      setAvisoProductos('');
      return undefined;
    }

    let cancelado = false;
    const cargarDisponibles = async () => {
      try {
        setLoadingProductos(true);
        setAvisoProductos('');
        const { data } = await inventarioReservasApi.disponiblesPorUbicacion(codUbicacion);
        if (cancelado) return;
        const lista = Array.isArray(data?.data) ? data.data : [];
        setProductosDisponibles(lista);
        if (lista.length === 0) {
          setAvisoProductos('La ubicacion seleccionada no tiene productos con stock disponible para reservar.');
        }
      } catch (err) {
        if (cancelado) return;
        setProductosDisponibles([]);
        setAvisoProductos(obtenerMensajeError(err));
      } finally {
        if (!cancelado) setLoadingProductos(false);
      }
    };

    cargarDisponibles();
    return () => { cancelado = true; };
  }, [abierto, form.cod_ubicacion]);

  // // Cambio de ubicacion: resetea el producto elegido para no arrastrar
  // // una seleccion que ya no corresponde a la nueva ubicacion.
  const cambiarUbicacion = (valor) => {
    setForm((prev) => ({
      ...prev,
      cod_ubicacion: valor,
      cod_producto: ''
    }));
  };

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

  const registrarReserva = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const codUbicacion = Number(form.cod_ubicacion);
      if (!Number.isInteger(codUbicacion) || codUbicacion <= 0) {
        setError('Seleccione una ubicacion valida');
        return;
      }

      const codProducto = Number(form.cod_producto);
      if (!Number.isInteger(codProducto) || codProducto <= 0) {
        setError('Seleccione un producto disponible en la ubicacion');
        return;
      }

      // // Defensa en profundidad: el producto DEBE pertenecer al catalogo
      // // disponible de la ubicacion elegida (coherente con la validacion del backend).
      const disponible = opcionesProducto.find((item) => item.cod_producto === codProducto);
      if (!disponible) {
        setError('El producto seleccionado no pertenece a la ubicacion elegida o ya no tiene stock disponible');
        return;
      }

      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      if (cantidad > disponible.stock_disponible) {
        setError(`La cantidad supera el stock disponible (${disponible.stock_disponible}) en la ubicacion seleccionada`);
        return;
      }

      const payload = {
        cod_producto: codProducto,
        cod_ubicacion: codUbicacion,
        cantidad,
        referencia: String(form.referencia || '').trim(),
        observaciones: String(form.observaciones || '').trim()
      };

      const { data } = await inventarioReservasApi.crear(payload);
      if (!data?.ok) {
        setError('Respuesta invalida del servidor al registrar la reserva');
        return;
      }

      if (typeof onReservaRegistrada === 'function') {
        await onReservaRegistrada(data.data);
      }

      setForm(estadoInicial);
      cerrarModal();
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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrarModal();
      }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Registrar reserva</h5>
            <button type="button" className="btn-close" onClick={cerrarModal} disabled={saving} />
          </div>
          <form onSubmit={registrarReserva}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger mb-3" role="alert">
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion *</label>
                  <select
                    className="form-select"
                    value={form.cod_ubicacion}
                    onChange={(event) => cambiarUbicacion(event.target.value)}
                    disabled={saving || loadingUbicaciones || opcionesUbicacion.length === 0}
                    required
                  >
                    <option value="">
                      {loadingUbicaciones ? 'Cargando ubicaciones...' : 'Seleccione una ubicacion activa'}
                    </option>
                    {opcionesUbicacion.map((item) => (
                      <option key={item.cod_ubicacion} value={String(item.cod_ubicacion)}>
                        {item.cod_ubicacion} - {formatearEtiquetaUbicacion(item)}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Selecciona primero la ubicacion: define que productos pueden reservarse.
                  </small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    className="form-select"
                    value={form.cod_producto}
                    onChange={(event) => actualizarCampo('cod_producto', event.target.value)}
                    disabled={saving || !ubicacionSeleccionada || loadingProductos || opcionesProducto.length === 0}
                    required
                  >
                    <option value="">
                      {!ubicacionSeleccionada
                        ? 'Seleccione primero una ubicacion'
                        : loadingProductos
                          ? 'Cargando productos de la ubicacion...'
                          : opcionesProducto.length === 0
                            ? 'Sin productos disponibles en esta ubicacion'
                            : 'Seleccione un producto disponible'}
                    </option>
                    {opcionesProducto.map((item) => (
                      <option key={item.cod_producto} value={String(item.cod_producto)}>
                        {item.codigo_producto} - {item.nombre_producto} (Disp: {item.stock_disponible})
                      </option>
                    ))}
                  </select>
                  {avisoProductos ? (
                    <small className="text-danger">{avisoProductos}</small>
                  ) : (
                    <small className="text-muted">
                      Solo se muestran productos con stock disponible en la ubicacion elegida.
                    </small>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    max={maxDisponible}
                    step="1"
                    className="form-control"
                    value={form.cantidad}
                    onChange={(event) => {
                      // Solo dígitos y acotado al stock disponible del producto elegido.
                      const limpio = String(event.target.value).replace(/[^\d]/g, '');
                      if (limpio === '') { actualizarCampo('cantidad', ''); return; }
                      const n = Math.min(maxDisponible, parseInt(limpio, 10));
                      actualizarCampo('cantidad', String(n));
                    }}
                    placeholder="Ej: 5"
                    disabled={saving || !productoSeleccionado}
                    required
                  />
                  {productoSeleccionado && (
                    <small className="text-muted">
                      Stock disponible en la ubicacion: {productoSeleccionado.stock_disponible}
                    </small>
                  )}
                </div>

                <div className="col-12 col-md-8">
                  <label className="form-label">Referencia (opcional)</label>
                  <select
                    className="form-select"
                    value={form.referencia}
                    onChange={(event) => actualizarCampo('referencia', event.target.value)}
                  >
                    <option value="">Sin referencia</option>
                    {REFERENCIAS_RESERVA.map((ref) => (
                      <option key={ref} value={ref}>{ref}</option>
                    ))}
                  </select>
                  <small className="text-muted">Selecciona una referencia estandarizada del catálogo.</small>
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    className={`form-control ${form.observaciones.length >= MAX_OBSERVACIONES ? 'is-invalid' : ''}`}
                    rows="3"
                    value={form.observaciones}
                    onChange={(event) => actualizarCampo('observaciones', sanitizarTexto(event.target.value).slice(0, MAX_OBSERVACIONES))}
                    placeholder="Notas de la reserva"
                    maxLength={MAX_OBSERVACIONES}
                    aria-describedby="reserva-obs-contador reserva-obs-limite"
                  />
                  <div className="d-flex justify-content-end">
                    <small
                      id="reserva-obs-contador"
                      className={form.observaciones.length >= MAX_OBSERVACIONES ? 'text-danger fw-semibold' : 'text-muted'}
                    >
                      {form.observaciones.length}/{MAX_OBSERVACIONES}
                    </small>
                  </div>
                  {form.observaciones.length >= MAX_OBSERVACIONES && (
                    <div id="reserva-obs-limite" className="alert alert-warning py-1 px-2 mb-0 mt-1" role="alert" style={{ fontSize: 12 }}>
                      Ha alcanzado el límite máximo de {MAX_OBSERVACIONES} caracteres permitidos.
                    </div>
                  )}
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
                  'Registrar reserva'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservaForm;
