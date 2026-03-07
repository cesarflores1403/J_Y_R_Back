import React, { useEffect, useState } from 'react';
import { FiRepeat } from 'react-icons/fi';
import { inventarioTransferenciasApi } from './inventarioTransferencias.api.js';

// // Estado inicial del formulario de transferencias entre ubicaciones
const estadoInicial = {
  cod_producto: '',
  cod_ubicacion_origen: '',
  cod_ubicacion_destino: '',
  cantidad: '',
  referencia: '',
  motivo: '',
  observaciones: ''
};

// // Traduce errores HTTP del endpoint a mensajes funcionales para el usuario de Inventario
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la transferencia';
  if (status === 404) return serverMessage || 'Producto, ubicacion o inventario de origen no encontrado';
  if (status === 409) return serverMessage || 'Stock insuficiente o conflicto de concurrencia';
  return serverMessage || 'Error inesperado al registrar la transferencia';
};

const TransferenciaForm = ({ onTransferenciaRegistrada }) => {
  // // Estado local para loading inicial, guardado, mensajes y resultado de la ultima transferencia
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);

  // // Loading inicial del submodulo (patron visual uniforme con otros formularios operativos)
  useEffect(() => {
    setLoading(false);
  }, []);

  // // Actualiza campos controlados del formulario de transferencia
  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Ejecuta POST de transferencia con validaciones cliente basicas antes del request
  const registrarTransferencia = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // // Validacion cliente de cantidad positiva
      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      // // Validacion cliente de ubicaciones distintas para evitar transferencias nulas
      const codUbicacionOrigen = Number(form.cod_ubicacion_origen);
      const codUbicacionDestino = Number(form.cod_ubicacion_destino);
      if (codUbicacionOrigen === codUbicacionDestino) {
        setError('La ubicacion origen y destino no pueden ser iguales');
        return;
      }

      // // Payload del endpoint de transferencias segun contrato del backend de Inventario
      const payload = {
        cod_producto: Number(form.cod_producto),
        cod_ubicacion_origen: codUbicacionOrigen,
        cod_ubicacion_destino: codUbicacionDestino,
        cantidad,
        referencia: String(form.referencia || '').trim(),
        motivo: String(form.motivo || '').trim(),
        observaciones: String(form.observaciones || '').trim()
      };

      // // Request transaccional: descuenta origen, incrementa destino y registra dos movimientos
      const { data } = await inventarioTransferenciasApi.registrar(payload);

      // // Contrato de exito segun helper sendOk del backend
      if (data?.ok) {
        setSuccess('Transferencia registrada correctamente');
        setUltimoResultado(data.data || null);
        setForm(estadoInicial);

        // // Notifica al contenedor para mostrar feedback adicional de existencias afectadas
        if (typeof onTransferenciaRegistrada === 'function') {
          await onTransferenciaRegistrada(data.data);
        }
      } else {
        setError('Respuesta invalida del servidor al registrar la transferencia');
      }
    } catch (err) {
      // // Manejo funcional de errores (incluye 409 por stock insuficiente)
      setError(obtenerMensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="jyr-card mt-4">
        <div className="jyr-card-body d-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm" />
          <span>Cargando formulario de transferencias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="jyr-card mt-4">
      <div className="jyr-card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FiRepeat />
          <h5 className="mb-0">Registrar Transferencia</h5>
        </div>

        {success && (
          // // Confirmacion visual de exito cuando la transferencia termina correctamente
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {error && (
          // // Mensaje de error funcional para validaciones o conflictos de stock
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={registrarTransferencia}>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Cod. Producto</label>
              <input
                // // Producto que se trasladara entre ubicaciones
                type="number"
                min="1"
                className="form-control"
                value={form.cod_producto}
                onChange={(event) => actualizarCampo('cod_producto', event.target.value)}
                placeholder="Ej: 23"
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Ubicacion origen</label>
              <input
                // // Ubicacion de donde se descuenta stock
                type="number"
                min="1"
                className="form-control"
                value={form.cod_ubicacion_origen}
                onChange={(event) => actualizarCampo('cod_ubicacion_origen', event.target.value)}
                placeholder="Ej: 1"
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Ubicacion destino</label>
              <input
                // // Ubicacion a la que se incrementa stock
                type="number"
                min="1"
                className="form-control"
                value={form.cod_ubicacion_destino}
                onChange={(event) => actualizarCampo('cod_ubicacion_destino', event.target.value)}
                placeholder="Ej: 5"
                required
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Cantidad</label>
              <input
                // // Unidades transferidas (entero > 0)
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

            <div className="col-12 col-md-9">
              <label className="form-label">Referencia</label>
              <input
                // // Referencia compartida para enlazar SALIDA/ENTRADA de la transferencia
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
                // // Motivo operativo de traslado interno
                type="text"
                className="form-control"
                value={form.motivo}
                onChange={(event) => actualizarCampo('motivo', event.target.value)}
                placeholder="Reubicacion para despacho"
                maxLength={120}
              />
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label">Observaciones (opcional)</label>
              <textarea
                // // Observaciones adicionales para auditoria de transferencia
                className="form-control"
                rows="3"
                value={form.observaciones}
                onChange={(event) => actualizarCampo('observaciones', event.target.value)}
                placeholder="Notas del traslado interno"
                maxLength={500}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              // // Submit con estado de guardado para prevenir doble envio concurrente
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
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

        {ultimoResultado?.resumen && (
          // // Resumen del impacto en stock de origen y destino para validacion operativa inmediata
          <div className="alert alert-light border mt-3 mb-0" role="alert">
            <div><strong>Referencia:</strong> {ultimoResultado.resumen.referencia_transferencia}</div>
            <div><strong>Stock origen antes:</strong> {ultimoResultado.resumen.stock_origen_antes}</div>
            <div><strong>Stock origen despues:</strong> {ultimoResultado.resumen.stock_origen_despues}</div>
            <div><strong>Stock destino antes:</strong> {ultimoResultado.resumen.stock_destino_antes}</div>
            <div><strong>Stock destino despues:</strong> {ultimoResultado.resumen.stock_destino_despues}</div>
            <div><strong>Movimiento SALIDA:</strong> {ultimoResultado.movimientos?.salida_id ?? 'N/D'}</div>
            <div><strong>Movimiento ENTRADA:</strong> {ultimoResultado.movimientos?.entrada_id ?? 'N/D'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferenciaForm;
