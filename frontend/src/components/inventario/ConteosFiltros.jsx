import React from 'react';
import { FiCalendar, FiFilter, FiHash, FiRefreshCw } from 'react-icons/fi';
import { sanitizarEntero } from '../../utils/numero.js';
import { sanitizarFiltro } from '../../utils/filtroSanitizar.js';

const ConteosFiltros = ({
  filtros,
  loading,
  onChange,
  onAplicar,
  onLimpiar
}) => {
  const handleInput = (event) => {
    onChange(event.target.name, sanitizarFiltro(event.target.value));
  };

  return (
    <form
      className="kdx-filters-form"
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar();
      }}
    >
      <div className="kdx-filters-topbar mb-3">
        <div className="kdx-filters-topbar-left">
          <span className="kdx-filters-chip">Filtros de busqueda</span>
        </div>
        <div className="kdx-filters-topbar-actions">
          <button
            type="button"
            className="btn kdx-btn kdx-btn-ghost"
            onClick={onLimpiar}
            disabled={loading}
          >
            <FiRefreshCw className="me-1" />
            Limpiar
          </button>
          <button
            type="submit"
            className="btn kdx-btn kdx-btn-accent"
            disabled={loading}
          >
            <FiFilter className="me-1" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiHash size={14} />
            ID Conteo
          </label>
          <input
            type="number"
            min="1"
            max={9999999}
            className="form-control kdx-control"
            name="cod_conteo"
            value={filtros.cod_conteo}
            onChange={(event) => onChange('cod_conteo', sanitizarEntero(event.target.value, 9999999))}
            placeholder="Ej: 9"
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">Estado</label>
          <select
            className="form-select kdx-control"
            name="estado"
            value={filtros.estado}
            onChange={handleInput}
          >
            <option value="">Todos</option>
            <option value="ABIERTO">ABIERTO</option>
            <option value="CERRADO">CERRADO</option>
            <option value="ANULADO">ANULADO</option>
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiCalendar size={14} />
            Fecha desde
          </label>
          <input
            type="date"
            className="form-control kdx-control"
            name="fecha_desde"
            value={filtros.fecha_desde}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiCalendar size={14} />
            Fecha hasta
          </label>
          <input
            type="date"
            className="form-control kdx-control"
            name="fecha_hasta"
            value={filtros.fecha_hasta}
            onChange={handleInput}
          />
        </div>
      </div>
    </form>
  );
};

export default ConteosFiltros;
