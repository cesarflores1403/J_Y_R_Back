import React from 'react';

const UbicacionFormModal = ({
  abierto = false,
  editandoId = null,
  saving = false,
  loadingProductos = false,
  form,
  opcionesProducto = [],
  onClose,
  onChange,
  onSubmit
}) => {
  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{editandoId ? 'Editar ubicacion' : 'Nueva ubicacion'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Pasillo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.pasillo}
                    onChange={(e) => onChange('pasillo', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Estanteria *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.estanteria}
                    onChange={(e) => onChange('estanteria', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nivel 1 *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nivel_1}
                    onChange={(e) => onChange('nivel_1', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nivel 2</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nivel_2}
                    onChange={(e) => onChange('nivel_2', e.target.value)}
                  />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    className="form-select"
                    value={form.codigo_producto}
                    onChange={(e) => onChange('codigo_producto', e.target.value)}
                    disabled={saving || loadingProductos}
                    required
                  >
                    <option value="">
                      {loadingProductos ? 'Cargando productos...' : 'Seleccione un producto real'}
                    </option>
                    {opcionesProducto.map((item) => (
                      <option key={item.cod_producto} value={item.codigo_producto}>
                        {item.codigo_producto} - {item.nombre_producto}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Este campo se toma del catalogo real de productos.
                  </small>
                </div>
                <div className="col-md-12">
                  <label className="form-label">Descripcion</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.descripcion}
                    onChange={(e) => onChange('descripcion', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn jyr-btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Guardando...
                  </>
                ) : (
                  editandoId ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UbicacionFormModal;
