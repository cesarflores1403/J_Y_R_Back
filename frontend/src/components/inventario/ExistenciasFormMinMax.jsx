import React, { useEffect, useState } from 'react';

const estadoInicial = {
  stock_minimo: '',
  stock_maximo: ''
};

const ExistenciasFormMinMax = ({
  abierto,
  saving,
  error,
  existencia,
  onCerrar,
  onGuardar
}) => {
  // // Estado local del formulario min/max
  const [form, setForm] = useState(estadoInicial);

  // // Sincroniza formulario cuando cambia la existencia seleccionada
  useEffect(() => {
    if (!existencia) {
      setForm(estadoInicial);
      return;
    }

    setForm({
      stock_minimo: String(existencia.stock_minimo ?? ''),
      stock_maximo: String(existencia.stock_maximo ?? '')
    });
  }, [existencia]);

  // // Si modal no esta abierto no renderizamos nada
  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Actualizar mínimos y máximos</h5>
            <button
              // // Cierre de modal bloqueado mientras guarda
              type="button"
              className="btn-close"
              onClick={onCerrar}
              disabled={saving}
            />
          </div>

          <form
            // // Handler submit del formulario de update
            onSubmit={(event) => {
              event.preventDefault();
              onGuardar({
                stock_minimo: Number(form.stock_minimo),
                stock_maximo: Number(form.stock_maximo)
              });
            }}
          >
            <div className="modal-body">
              {existencia && (
                <div className="mb-3">
                  <div><strong>Producto:</strong> {existencia.nombre_producto}</div>
                  <div><strong>Ubicación:</strong> {existencia.ubicacion}</div>
                  <div><strong>Stock actual:</strong> {existencia.stock}</div>
                </div>
              )}

              {error && (
                // // Feedback visual de error de validacion/backend
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Stock mínimo</label>
                  <input
                    // // Campo minimo no permite negativos
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.stock_minimo}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      stock_minimo: event.target.value
                    }))}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Stock máximo</label>
                  <input
                    // // Campo maximo no permite negativos
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.stock_maximo}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      stock_maximo: event.target.value
                    }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                // // Cancelar cierre del formulario
                type="button"
                className="btn btn-secondary"
                onClick={onCerrar}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                // // Guardar cambios de min/max
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
                  'Guardar cambios'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExistenciasFormMinMax;
