import React, { useEffect, useState } from 'react';
import { sanitizarEntero, MAX_CANTIDAD } from '../../utils/numero.js';
import { inventarioEntradasApi } from './inventarioEntradas.api.js';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';
import ContadorLimite from '../common/ContadorLimite.jsx';

// // Estado inicial del formulario de entradas (HU4)
const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia_documento: '',
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

// // Convierte error HTTP a mensaje legible para la UI de entradas
const obtenerMensajeError = (error) => {
  if (!error?.response) {
    return 'No se pudo conectar con la API. Reinicia backend y frontend, luego recarga la pagina.';
  }

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;
  const erroresValidacion = error?.response?.data?.errors || error?.response?.data?.errores;

  if (Array.isArray(erroresValidacion) && erroresValidacion.length > 0) {
    const primero = erroresValidacion[0];
    return primero?.msg || primero?.mensaje || serverMessage || 'Datos invalidos para registrar la entrada';
  }

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la entrada';
  if (status === 404) return serverMessage || 'Producto o ubicacion no encontrado';
  if (status === 409) return serverMessage || 'Conflicto al registrar la entrada';
  if (status === 401) return serverMessage || 'Sesion expirada o invalida. Inicia sesion nuevamente';
  if (status === 403) return serverMessage || 'No tienes permisos para registrar entradas';
  if (status >= 500) return serverMessage || 'Error interno del backend al registrar la entrada';
  return serverMessage || 'Error inesperado al registrar la entrada';
};

const formatearEtiquetaUbicacion = (ubicacion) => {
  const pasillo = String(ubicacion?.pasillo || '').trim();
  const estanteria = String(ubicacion?.estanteria || '').trim();
  const nivel1 = String(ubicacion?.nivel_1 || '').trim();
  const nivel2 = String(ubicacion?.nivel_2 || '').trim();
  const textoDescripcion = String(ubicacion?.descripcion || '').trim();

  const traza = [
    pasillo ? `P:${pasillo}` : null,
    estanteria ? `E:${estanteria}` : null,
    nivel1 ? `N1:${nivel1}` : null,
    nivel2 ? `N2:${nivel2}` : null
  ].filter(Boolean).join(' ');

  if (textoDescripcion) {
    return `${traza || 'Ubicacion'} - ${textoDescripcion}`;
  }
  return traza || `Ubicacion ${ubicacion?.cod_ubicacion ?? ''}`.trim();
};

const EntradaForm = ({ abierto = false, onClose, onEntradaRegistrada, productos = [] }) => {
  // // Estado local del formulario y feedback de proceso
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { ubicaciones, loadingUbicaciones } = useUbicaciones();

  const opcionesProducto = productos
    .filter((item) => String(item?.estado_producto || '').toLowerCase() === 'activo')
    .map((item) => ({
      cod_producto: item.cod_producto,
      nombre_producto: item.nombre_producto || 'Sin nombre',
      codigo_producto: formatearCodigoProducto(item)
    }))
    .filter((item) => Number.isInteger(Number(item.cod_producto)) && Number(item.cod_producto) > 0);

  const opcionesUbicacion = (Array.isArray(ubicaciones) ? ubicaciones : [])
    .filter((item) => Number.isInteger(Number(item?.cod_ubicacion)) && Number(item.cod_ubicacion) > 0);

  // // Al cerrar el modal, limpiamos formulario y mensajes para nueva captura
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

  // // Actualiza un campo del formulario controlado
  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Envia entrada al backend y refresca existencias al completar
  const registrarEntrada = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      // // Validacion cliente basica para evitar requests triviales invalidos
      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      // // Payload HU4 con campos minimos y observaciones opcionales
      const payload = {
        cod_producto: Number(form.cod_producto),
        cod_ubicacion: Number(form.cod_ubicacion),
        cantidad,
        referencia_documento: String(form.referencia_documento || '').trim(),
        observaciones: String(form.observaciones || '').trim()
      };

      // // Request POST al endpoint transaccional de entradas
      const { data } = await inventarioEntradasApi.registrar(payload);

      // // Validamos contrato de exito antes de actualizar UI
      if (data?.ok) {
        setForm(estadoInicial);

        // // Refrescamos existencias en la vista HU2 si el contenedor provee callback
        if (typeof onEntradaRegistrada === 'function') {
          await onEntradaRegistrada(data.data);
        }

        cerrarModal();
      } else {
        setError('Respuesta invalida del servidor al registrar la entrada');
      }
    } catch (err) {
      // // Errores de validacion/backend
      setError(obtenerMensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(e) => {
      if (e.target === e.currentTarget) cerrarModal();
    }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Registrar entrada</h5>
            <button type="button" className="btn-close" onClick={cerrarModal} disabled={saving} />
          </div>
          <form onSubmit={registrarEntrada}>
            <div className="modal-body">
              {error && (
                // // Error de validacion/proceso de entrada
                <div className="alert alert-danger mb-3" role="alert">
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    // // Producto real tomado del catalogo de productos
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
                  <small className="text-muted">
                    Este campo se toma del listado real de productos activos.
                  </small>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion *</label>
                  <select
                    // // Ubicacion real tomada del catalogo de ubicaciones activas
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
                        {formatearEtiquetaUbicacion(item)}
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
                    // // Cantidad de unidades ingresadas (entero > 0)
                    type="number"
                    min="1"
                    max={MAX_CANTIDAD}
                    step="1"
                    className="form-control"
                    value={form.cantidad}
                    onChange={(event) => actualizarCampo('cantidad', sanitizarEntero(event.target.value))}
                    placeholder="Ej: 10"
                    required
                  />
                </div>

                <div className="col-12 col-md-8">
                  <label className="form-label">Referencia documento *</label>
                  <input
                    // // Referencia de recepcion/compra para trazabilidad en kardex
                    type="text"
                    className="form-control"
                    value={form.referencia_documento}
                    onChange={(event) => actualizarCampo('referencia_documento', event.target.value)}
                    placeholder="Factura, orden de compra o remision"
                    maxLength={200}
                    required
                  />
                  <ContadorLimite value={form.referencia_documento} max={200} />
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    // // Notas de recepcion; se envian solo si el backend/schema las soporta
                    className="form-control"
                    rows="3"
                    value={form.observaciones}
                    onChange={(event) => actualizarCampo('observaciones', event.target.value)}
                    placeholder="Notas de la recepcion"
                    maxLength={500}
                  />
                  <ContadorLimite value={form.observaciones} max={500} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={saving}>
                Cancelar
              </button>
              <button
                // // Submit de la entrada con estado de guardado
                type="submit"
                className="btn jyr-btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Guardando...
                  </>
                ) : (
                  'Registrar entrada'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EntradaForm;
