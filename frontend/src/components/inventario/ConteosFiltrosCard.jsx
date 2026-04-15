import React from 'react';
import ConteosFiltros from './ConteosFiltros.jsx';

const ConteosFiltrosCard = ({
  success = '',
  error = '',
  filtros,
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
      <ConteosFiltros
        filtros={filtros}
        loading={loading}
        onChange={onChange}
        onAplicar={onAplicar}
        onLimpiar={onLimpiar}
      />
    </div>
  </div>
);

export default ConteosFiltrosCard;
