import React from 'react';
import { FiBox, FiMapPin } from 'react-icons/fi';
import { sanitizarEntero } from '../../utils/numero.js';
import { sanitizarFiltro } from '../../utils/filtroSanitizar.js';

const ExistenciasFiltros = ({
  filtros,
  onChange,
  totalVisibles = 0,
  alertasCriticas = 0
}) => {
  const handleInput = (event) => {
    onChange(event.target.name, sanitizarFiltro(event.target.value));
  };

  return (
    <div className="kdx-filters-form">
      <div className="kdx-filters-topbar mb-3">
        <div className="kdx-filters-topbar-left">
          <span className="kdx-filters-chip">Filtros de busqueda</span>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12 col-md-4">
          <label className="form-label mb-1 kdx-label">
            <FiBox />
            Cod. Producto
          </label>
          <input
            type="text"
            className="form-control kdx-control"
            name="cod_producto"
            value={filtros.cod_producto}
            onChange={handleInput}
            maxLength={20}
            placeholder="Ej: PROD-0023 o 23"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label mb-1 kdx-label">Producto</label>
          <input
            type="text"
            className="form-control kdx-control"
            name="producto"
            value={filtros.producto}
            onChange={handleInput}
            maxLength={100}
            placeholder="Nombre de producto"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label mb-1 kdx-label">
            <FiMapPin />
            ID Ubicacion
          </label>
          <input
            type="number"
            min="1"
            max={9999999}
            className="form-control kdx-control"
            name="cod_ubicacion"
            value={filtros.cod_ubicacion}
            onChange={(event) => onChange('cod_ubicacion', sanitizarEntero(event.target.value, 9999999))}
            placeholder="Ej: 2"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label mb-1 kdx-label">Ubicacion</label>
          <input
            type="text"
            className="form-control kdx-control"
            name="ubicacion"
            value={filtros.ubicacion}
            onChange={handleInput}
            maxLength={100}
            placeholder="Codigo prod, pasillo o nivel"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label mb-1 kdx-label">Estado de existencias</label>
          <div className="form-check form-switch ubi-switch-wrap">
            <input
              id="includeInactiveExistencias"
              className="form-check-input"
              type="checkbox"
              checked={Boolean(filtros.includeInactive)}
              onChange={(event) => onChange('includeInactive', event.target.checked)}
            />
            <label className="form-check-label" htmlFor="includeInactiveExistencias">
              Incluir inactivos
            </label>
          </div>
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1 kdx-label">Visibles</label>
          <input
            type="text"
            readOnly
            className="form-control kdx-control"
            value={totalVisibles}
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1 kdx-label">Criticas</label>
          <input
            type="text"
            readOnly
            className="form-control kdx-control"
            value={alertasCriticas}
          />
        </div>
      </div>
    </div>
  );
};

export default ExistenciasFiltros;
