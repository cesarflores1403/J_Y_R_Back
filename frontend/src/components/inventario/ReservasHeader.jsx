import React from 'react';
import { FiLock, FiPlus } from 'react-icons/fi';

const ReservasHeader = ({
  total = 0,
  onNuevaReserva
}) => (
  <div className="kdx-hero">
    <div className="kdx-hero-head">
      <div className="kdx-title-wrap">
        <div className="kdx-title-icon">
          <FiLock />
        </div>
        <div>
          <h5 className="mb-0">Reservas</h5>
          <p className="kdx-subtitle mb-0">Reserva de stock por producto y ubicacion con seguimiento de estado.</p>
        </div>
      </div>

      <div className="ubi-hero-actions">
        <div className="kdx-mini-kpi">
          <span className="kdx-mini-kpi-label">Total</span>
          <strong>{total}</strong>
        </div>
        <button
          type="button"
          className="btn kdx-btn kdx-btn-accent"
          onClick={onNuevaReserva}
        >
          <FiPlus className="me-1" />
          Nueva reserva
        </button>
      </div>
    </div>
  </div>
);

export default ReservasHeader;
