import React, { useEffect, useMemo, useState } from 'react';
import { inventarioReservasApi } from './inventarioReservas.api.js';

const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia: '',
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
  productos = [],
  ubicaciones = [],
  loadingUbicaciones = false
}) => {
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const opcionesProducto = useMemo(() => (
    (Array.isArray(productos) ? productos : [])
      .filter((item) => String(item?.estado_producto || '').toLowerCase() === 'activo')
      .map((item) => ({
        cod_producto: item.cod_producto,
        nombre_producto: item.nombre_producto || 'Sin nombre',
        codigo_producto: formatearCodigoProducto(item)
      }))
      .filter((item) => Number.isInteger(Number(item.cod_producto)) && Number(item.cod_producto) > 0)
  ), [productos]);

  const opcionesUbicacion = useMemo(() => (
    (Array.isArray(ubicaciones) ? ubicaciones : [])
      .filter((item) => Number.isInteger(Number(item?.cod_ubicacion)) && Number(item.cod_ubicacion) > 0)
  ), [ubicaciones]);

  useEffect(() => {
    if (!abierto) {
      setForm(estadoInicial);
      setError('');
    }
  }, [abierto]);

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

      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      const payload = {
        cod_producto: Number(form.cod_producto),
        cod_ubicacion: Number(form.cod_ubicacion),
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
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    className="form-select"
                    value={form.cod_producto}
                    onChange={(event) => actualizarCampo('cod_producto', event.target.value)}
                    disabled={saving || opcionesProducto.length === 0}
                    required
                  >
                    <option value="">
                      {opcionesProducto.length === 0 ? 'Cargando productos...' : 'Seleccione un producto activo'}
                    </option>
                    {opcionesProducto.map((item) => (
                      <option key={item.cod_producto} value={String(item.cod_producto)}>
                        {item.codigo_producto} - {item.nombre_producto}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Este campo se toma del listado real de productos activos.
                  </small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion *</label>
                  <select
                    className="form-select"
                    value={form.cod_ubicacion}
                    onChange={(event) => actualizarCampo('cod_ubicacion', event.target.value)}
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
                    Este campo se toma del catalogo real de ubicaciones activas.
                  </small>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={form.cantidad}
                    onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                    placeholder="Ej: 5"
                    required
                  />
                </div>

                <div className="col-12 col-md-8">
                  <label className="form-label">Referencia (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.referencia}
                    onChange={(event) => actualizarCampo('referencia', event.target.value)}
                    placeholder="Pedido, cotizacion o ticket"
                    maxLength={200}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.observaciones}
                    onChange={(event) => actualizarCampo('observaciones', event.target.value)}
                    placeholder="Notas de la reserva"
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
