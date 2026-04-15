import React from 'react';
import { FiDatabase } from 'react-icons/fi';
import ConteosTabla from './ConteosTabla.jsx';

const ConteosTablaCard = ({
  inicioConteos = 0,
  finConteos = 0,
  total = 0,
  filas = [],
  loading = false,
  conteoActivoId = 0,
  onSeleccionar
}) => (
  <div className="jyr-card kdx-table-card mt-3">
    <div className="kdx-table-topbar">
      <div className="kdx-table-topbar-left">
        <FiDatabase />
        <span>Conteos registrados</span>
      </div>
      <div className="kdx-table-topbar-right">
        Mostrando {inicioConteos}-{finConteos} de {total}
      </div>
    </div>
    <div className="jyr-card-body p-0">
      <ConteosTabla
        filas={filas}
        loading={loading}
        conteoActivoId={conteoActivoId}
        onSeleccionar={onSeleccionar}
      />
    </div>
  </div>
);

export default ConteosTablaCard;
