import React from 'react';
import { FiDatabase } from 'react-icons/fi';
import ReservasTabla from './ReservasTabla.jsx';

const ReservasTablaCard = ({
  inicioMostrado = 0,
  finMostrado = 0,
  total = 0,
  filas = [],
  loading = false,
  procesandoId = null,
  onLiberar,
  onConsumir
}) => (
  <div className="jyr-card kdx-table-card">
    <div className="kdx-table-topbar">
      <div className="kdx-table-topbar-left">
        <FiDatabase />
        <span>Reservas registradas</span>
      </div>
      <div className="kdx-table-topbar-right">
        Mostrando {inicioMostrado}-{finMostrado} de {total}
      </div>
    </div>
    <div className="jyr-card-body p-0">
      <ReservasTabla
        filas={filas}
        loading={loading}
        procesandoId={procesandoId}
        onLiberar={onLiberar}
        onConsumir={onConsumir}
      />
    </div>
  </div>
);

export default ReservasTablaCard;
