import React from 'react';
import Alert from '../common/Alert.jsx';

const UbicacionesFiltrosPanel = ({
  error = '',
  includeInactive = false,
  totalActivas = 0,
  totalInactivas = 0,
  onCloseError,
  onToggleInactivas
}) => (
  <div className="jyr-card kdx-filtros-card">
    <div className="jyr-card-body">
      <Alert type="danger" message={error} onClose={onCloseError} />

      <div className="kdx-filters-form">
        <div className="kdx-filters-topbar mb-3">
          <div className="kdx-filters-topbar-left">
            <span className="kdx-filters-chip">Filtros de busqueda</span>
          </div>
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label mb-1 kdx-label">Estado de ubicaciones</label>
            <div className="form-check form-switch ubi-switch-wrap">
              <input
                id="includeInactive"
                className="form-check-input"
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => onToggleInactivas(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="includeInactive">
                Incluir inactivas
              </label>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label mb-1 kdx-label">Activas visibles</label>
            <input type="text" readOnly className="form-control kdx-control" value={totalActivas} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label mb-1 kdx-label">Inactivas visibles</label>
            <input
              type="text"
              readOnly
              className="form-control kdx-control"
              value={totalInactivas}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default UbicacionesFiltrosPanel;
