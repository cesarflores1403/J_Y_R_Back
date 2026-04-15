import React from 'react';
import ReservasFiltros from './ReservasFiltros.jsx';

const ReservasFiltrosCard = ({
  success = '',
  error = '',
  resumenPagina = { activas: 0, liberadas: 0, consumidas: 0 },
  filtros,
  productos = [],
  ubicaciones = [],
  loading = false,
  onChange,
  onAplicar,
  onLimpiar
}) => (
  <div className="jyr-card kdx-filtros-card">
    <div className="jyr-card-body">
      {success && (
        <div className="alert alert-success kdx-error-alert" role="alert">
          {success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger kdx-error-alert" role="alert">
          {error}
        </div>
      )}

      <div className="alert alert-light border mb-3">
        <strong>En pagina:</strong> Activas {resumenPagina.activas} | Liberadas {resumenPagina.liberadas} | Consumidas {resumenPagina.consumidas}
      </div>

      <ReservasFiltros
        filtros={filtros}
        productos={productos}
        ubicaciones={ubicaciones}
        loading={loading}
        onChange={onChange}
        onAplicar={onAplicar}
        onLimpiar={onLimpiar}
      />
    </div>
  </div>
);

export default ReservasFiltrosCard;
