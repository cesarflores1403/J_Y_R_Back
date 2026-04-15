import React from 'react';
import { FiDatabase } from 'react-icons/fi';
import ConteosDetallesTabla from './ConteosDetallesTabla.jsx';

const ConteosDetallesCard = ({
  inicioDetalles = 0,
  finDetalles = 0,
  total = 0,
  filas = [],
  loading = false
}) => (
  <div className="jyr-card kdx-table-card mt-3">
    <div className="kdx-table-topbar">
      <div className="kdx-table-topbar-left">
        <FiDatabase />
        <span>Detalle persistido del conteo</span>
      </div>
      <div className="kdx-table-topbar-right">
        Mostrando {inicioDetalles}-{finDetalles} de {total}
      </div>
    </div>
    <div className="jyr-card-body p-0">
      <ConteosDetallesTabla
        filas={filas}
        loading={loading}
      />
    </div>
  </div>
);

export default ConteosDetallesCard;
