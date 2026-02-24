import React, { useState } from 'react';
import { FiPlusCircle } from 'react-icons/fi';
import { inventarioEntradasApi } from './inventarioEntradas.api.js';

// // Estado inicial del formulario de entradas (HU4)
const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  referencia_documento: '',
  observaciones: ''
};

// // Convierte error HTTP a mensaje legible para la UI de entradas
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la entrada';
  if (status === 404) return serverMessage || 'Producto o ubicacion no encontrado';
  if (status === 409) return serverMessage || 'Conflicto al registrar la entrada';
  return serverMessage || 'Error inesperado al registrar la entrada';
};

const EntradaForm = ({ onEntradaRegistrada }) => {
  // // Estado local del formulario y feedback de proceso
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);

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
      setSuccess('');

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
        setSuccess('Entrada registrada correctamente');
        setUltimoResultado(data.data || null);
        setForm(estadoInicial);

        // // Refrescamos existencias en la vista HU2 si el contenedor provee callback
        if (typeof onEntradaRegistrada === 'function') {
          await onEntradaRegistrada(data.data);
        }
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

  return (
    <div className="jyr-card mt-4">
      <div className="jyr-card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FiPlusCircle />
          <h5 className="mb-0">Registrar Entrada</h5>
        </div>

        {success && (
          // // Confirmacion visual de exito del registro de entrada
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {error && (
          // // Error de validacion/proceso de entrada
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={registrarEntrada}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Cod. Producto</label>
              <input
                // // Producto al que se incrementara stock
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
                // // Ubicacion donde se recibira la entrada
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
                // // Cantidad de unidades ingresadas (entero > 0)
                type="number"
                min="1"
                step="1"
                className="form-control"
                value={form.cantidad}
                onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                placeholder="Ej: 10"
                required
              />
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label">Referencia documento</label>
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
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
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

        {ultimoResultado?.resumen && (
          // // Resumen del impacto en stock para feedback post-registro
          <div className="alert alert-light border mt-3 mb-0" role="alert">
            <div><strong>Stock antes:</strong> {ultimoResultado.resumen.stock_antes}</div>
            <div><strong>Cantidad entrada:</strong> {ultimoResultado.resumen.cantidad_entrada}</div>
            <div><strong>Stock despues:</strong> {ultimoResultado.resumen.stock_despues}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntradaForm;
