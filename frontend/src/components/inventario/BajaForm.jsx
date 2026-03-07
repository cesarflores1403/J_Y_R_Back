import React, { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { inventarioBajasApi } from './inventarioBajas.api.js';

// // Estado inicial del formulario de bajas de inventario
const estadoInicial = {
  cod_producto: '',
  cod_ubicacion: '',
  cantidad: '',
  motivo: '',
  descripcion: '',
  referencia: ''
};

// // Convierte error HTTP a mensaje funcional para la UI de bajas
const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (status === 400) return serverMessage || 'Datos invalidos para registrar la baja';
  if (status === 404) return serverMessage || 'Producto, ubicacion o inventario no encontrado';
  if (status === 409) return serverMessage || 'Stock insuficiente para registrar la baja';
  return serverMessage || 'Error inesperado al registrar la baja';
};

const BajaForm = ({ onBajaRegistrada }) => {
  // // Estado local del formulario y estados de feedback
  const [form, setForm] = useState(estadoInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);

  // // Actualiza un campo controlado del formulario de bajas
  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Ejecuta POST de baja validando reglas cliente basicas antes de enviar
  const registrarBaja = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // // Validacion de cantidad positiva en cliente para evitar request trivialmente invalido
      const cantidad = Number(form.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('cantidad debe ser un entero mayor a 0');
        return;
      }

      // // Regla funcional: al menos motivo o descripcion debe estar informado
      const motivo = String(form.motivo || '').trim();
      const descripcion = String(form.descripcion || '').trim();
      if (!motivo && !descripcion) {
        setError('motivo o descripcion es requerido');
        return;
      }

      // // Payload del endpoint de bajas segun contrato backend
      const payload = {
        cod_producto: Number(form.cod_producto),
        cod_ubicacion: Number(form.cod_ubicacion),
        cantidad,
        motivo,
        descripcion,
        referencia: String(form.referencia || '').trim()
      };

      // // Request POST al endpoint transaccional de bajas
      const { data } = await inventarioBajasApi.registrar(payload);

      // // Contrato de exito estandar del backend con helper sendOk
      if (data?.ok) {
        setSuccess('Baja registrada correctamente');
        setUltimoResultado(data.data || null);
        setForm(estadoInicial);

        // // Notifica al contenedor para feedback adicional de la existencia actualizada
        if (typeof onBajaRegistrada === 'function') {
          await onBajaRegistrada(data.data);
        }
      } else {
        setError('Respuesta invalida del servidor al registrar la baja');
      }
    } catch (err) {
      // // Muestra mensajes funcionales segun codigo HTTP
      setError(obtenerMensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="jyr-card mt-4">
      <div className="jyr-card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FiAlertTriangle />
          <h5 className="mb-0">Registrar Baja (dano/perdida)</h5>
        </div>

        {success && (
          // // Confirmacion visual de exito al registrar la baja
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {error && (
          // // Error funcional/validacion del proceso de baja
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={registrarBaja}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Cod. Producto</label>
              <input
                // // Producto afectado por la baja
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
                // // Ubicacion de la existencia a ajustar por baja
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
                // // Cantidad de unidades dadas de baja (entero > 0)
                type="number"
                min="1"
                step="1"
                className="form-control"
                value={form.cantidad}
                onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                placeholder="Ej: 2"
                required
              />
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label">Motivo</label>
              <input
                // // Motivo principal de la baja (dano/perdida/vencimiento, etc.)
                type="text"
                className="form-control"
                value={form.motivo}
                onChange={(event) => actualizarCampo('motivo', event.target.value)}
                placeholder="Ej: Dano en almacenamiento"
                maxLength={120}
              />
            </div>

            <div className="col-12">
              <label className="form-label">Descripcion</label>
              <textarea
                // // Descripcion complementaria de la baja
                className="form-control"
                rows="3"
                value={form.descripcion}
                onChange={(event) => actualizarCampo('descripcion', event.target.value)}
                placeholder="Detalle de dano o perdida"
                maxLength={500}
              />
            </div>

            <div className="col-12">
              <label className="form-label">Referencia (opcional)</label>
              <input
                // // Referencia de acta/reporte interno para auditoria
                type="text"
                className="form-control"
                value={form.referencia}
                onChange={(event) => actualizarCampo('referencia', event.target.value)}
                placeholder="Acta, reporte interno, etc."
                maxLength={200}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              // // Submit del formulario de bajas con feedback de guardado
              type="submit"
              className="btn btn-warning"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Guardando...
                </>
              ) : (
                'Registrar baja'
              )}
            </button>
          </div>
        </form>

        {ultimoResultado?.resumen && (
          // // Resumen operativo del impacto de la baja en inventario
          <div className="alert alert-light border mt-3 mb-0" role="alert">
            <div><strong>Stock antes:</strong> {ultimoResultado.resumen.stock_antes}</div>
            <div><strong>Disponible antes:</strong> {ultimoResultado.resumen.stock_disponible_antes}</div>
            <div><strong>Cantidad baja:</strong> {ultimoResultado.resumen.cantidad_baja}</div>
            <div><strong>Stock despues:</strong> {ultimoResultado.resumen.stock_despues}</div>
            <div><strong>Movimiento aplicado:</strong> {ultimoResultado.tipo_movimiento_aplicado}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BajaForm;
