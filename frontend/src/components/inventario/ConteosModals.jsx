import React from 'react';
import ContadorLimite from '../common/ContadorLimite.jsx';
import { sanitizarEntero, MAX_CANTIDAD } from '../../utils/numero.js';

export const ConteoAperturaModal = ({
  abierto = false,
  saving = false,
  observaciones = '',
  onClose,
  onChangeObservaciones,
  onSubmit
}) => {
  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Abrir conteo fisico</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={saving}
            />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <label className="form-label">Observaciones (opcional)</label>
              <textarea
                rows="3"
                maxLength={500}
                className="form-control"
                placeholder="Conteo general de bodega"
                value={observaciones}
                onChange={(event) => onChangeObservaciones(event.target.value)}
              />
              <ContadorLimite value={observaciones} max={500} />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn jyr-btn-primary" disabled={saving}>
                {saving ? 'Abriendo...' : 'Abrir conteo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ConteoDetalleModal = ({
  abierto = false,
  saving = false,
  conteoId = null,
  formDetalle = { cod_producto: '', cod_ubicacion: '', stock_fisico: '', observaciones: '' },
  opcionesProducto = [],
  opcionesUbicacion = [],
  loadingUbicaciones = false,
  formatearEtiquetaUbicacion,
  onClose,
  onChangeFormDetalle,
  onSubmit
}) => {
  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Capturar detalle conteo #{conteoId}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={saving}
            />
          </div>

          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Codigo de producto *</label>
                  <select
                    className="form-select"
                    value={formDetalle.cod_producto}
                    onChange={(event) => onChangeFormDetalle('cod_producto', event.target.value)}
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
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Cod. Ubicacion *</label>
                  <select
                    className="form-select"
                    value={formDetalle.cod_ubicacion}
                    onChange={(event) => onChangeFormDetalle('cod_ubicacion', event.target.value)}
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
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">Stock fisico *</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_CANTIDAD}
                    step="1"
                    className="form-control"
                    placeholder="Ej: 18"
                    value={formDetalle.stock_fisico}
                    onChange={(event) => onChangeFormDetalle('stock_fisico', sanitizarEntero(event.target.value))}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    rows="3"
                    maxLength={500}
                    className="form-control"
                    placeholder="Detalle del conteo por ubicacion"
                    value={formDetalle.observaciones}
                    onChange={(event) => onChangeFormDetalle('observaciones', event.target.value)}
                  />
                  <ContadorLimite value={formDetalle.observaciones} max={500} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn jyr-btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar detalle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ConteoCierreModal = ({
  abierto = false,
  saving = false,
  conteoId = null,
  observaciones = '',
  onClose,
  onChangeObservaciones,
  onSubmit
}) => {
  if (!abierto) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Cerrar conteo #{conteoId}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={saving}
            />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <p className="mb-2">
                Se aplicaran ajustes de inventario segun las diferencias capturadas en este conteo.
              </p>
              <label className="form-label">Observaciones de cierre (opcional)</label>
              <textarea
                rows="3"
                maxLength={500}
                className="form-control"
                placeholder="Cierre validado por administracion"
                value={observaciones}
                onChange={(event) => onChangeObservaciones(event.target.value)}
              />
              <ContadorLimite value={observaciones} max={500} />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving ? 'Cerrando...' : 'Cerrar conteo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
