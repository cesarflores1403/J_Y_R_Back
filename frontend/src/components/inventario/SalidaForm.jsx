import React, { useState } from 'react';
import { FiMinusCircle } from 'react-icons/fi';
import { inventarioSalidasApi } from './inventarioSalidas.api.js';

// // Estado inicial del formulario de salidas
const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia: '',
  observaciones: ''
};

// // Traduce error HTTP a mensaje funcional para la vista de salidas
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la salida';
  if (status === 404) return serverMessage || 'Producto, ubicacion o inventario no encontrado';
  if (status === 409) return serverMessage || 'Stock insuficiente para completar la salida';
  return serverMessage || 'Error inesperado al registrar la salida';
};

const SalidaForm = ({ onSalidaRegistrada }) => {
  // // Estado local de formulario y feedback de proceso
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);

  // // Actualiza un campo controlado del formulario de salida
  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Envia solicitud de salida al backend con validacion cliente basica
  const registrarSalida = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // // Validacion cliente para evitar request trivialmente invalido
      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      // // Payload segun contrato del endpoint de salidas
      const payload = {
        cod_producto: Number(form.cod_producto),
        cod_ubicacion: Number(form.cod_ubicacion),
        cantidad,
        referencia: String(form.referencia || '').trim(),
        observaciones: String(form.observaciones || '').trim()
      };

      // // Request POST al endpoint transaccional de salidas
      const { data } = await inventarioSalidasApi.registrar(payload);

      // // Contrato de exito segun helper sendOk del backend
      if (data?.ok) {
        setSuccess('Salida registrada correctamente');
        setUltimoResultado(data.data || null);
        setForm(estadoInicial);

        // // Refresca estado padre si la pagina provee callback
        if (typeof onSalidaRegistrada === 'function') {
          await onSalidaRegistrada(data.data);
        }
      } else {
        setError('Respuesta invalida del servidor al registrar la salida');
      }
    } catch (err) {
      // // Error HTTP funcional (incluye 409 por stock insuficiente)
      setError(obtenerMensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="jyr-card mt-4">
      <div className="jyr-card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FiMinusCircle />
          <h5 className="mb-0">Registrar Salida</h5>
        </div>

        {success && (
          // // Confirmacion visual de salida registrada
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {error && (
          // // Error funcional/validacion para la salida
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={registrarSalida}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Cod. Producto</label>
              <input
                // // Producto al que se descontara stock
                type="number"
                min="1"
                className="form-control"
                value={form.cod_producto}
                onChange={(event) => actualizarCampo('cod_producto', event.target.value)}
                placeholder="Ej: 23"
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Cod. Ubicacion</label>
              <input
                // // Ubicacion donde se aplica la salida
                type="number"
                min="1"
                className="form-control"
                value={form.cod_ubicacion}
                onChange={(event) => actualizarCampo('cod_ubicacion', event.target.value)}
                placeholder="Ej: 1"
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Cantidad</label>
              <input
                // // Cantidad de unidades a descontar (entero > 0)
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
              <label className="form-label">Referencia</label>
              <input
                // // Referencia de venta para trazabilidad en kardex
                type="text"
                className="form-control"
                value={form.referencia}
                onChange={(event) => actualizarCampo('referencia', event.target.value)}
                placeholder="Factura o comprobante de venta"
                maxLength={200}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Observaciones (opcional)</label>
              <textarea
                // // Notas internas de la salida de inventario
                className="form-control"
                rows="3"
                value={form.observaciones}
                onChange={(event) => actualizarCampo('observaciones', event.target.value)}
                placeholder="Detalle adicional de la salida"
                maxLength={500}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              // // Submit de salida con feedback de guardado
              type="submit"
              className="btn btn-danger"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Guardando...
                </>
              ) : (
                'Registrar salida'
              )}
            </button>
          </div>
        </form>

        {ultimoResultado?.resumen && (
          // // Resumen de impacto de stock post salida
          <div className="alert alert-light border mt-3 mb-0" role="alert">
            <div><strong>Stock antes:</strong> {ultimoResultado.resumen.stock_antes}</div>
            <div><strong>Disponible antes:</strong> {ultimoResultado.resumen.stock_disponible_antes}</div>
            <div><strong>Cantidad salida:</strong> {ultimoResultado.resumen.cantidad_salida}</div>
            <div><strong>Stock despues:</strong> {ultimoResultado.resumen.stock_despues}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalidaForm;
