import React from 'react';
import { FiClipboard, FiPlus } from 'react-icons/fi';

const ConteosHeader = ({
  total = 0,
  onNuevoConteo
}) => (
  <div className="kdx-hero">
    <div className="kdx-hero-head">
      <div className="kdx-title-wrap">
        <div className="kdx-title-icon">
          <FiClipboard />
        </div>
        <div>
          <h5 className="mb-0">Conteos</h5>
          <p className="kdx-subtitle mb-0">Conteo fisico con diferencia persistida, ajuste trazable y cierre transaccional.</p>
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
          onClick={onNuevoConteo}
        >
          <FiPlus className="me-1" />
          Nuevo conteo
        </button>
      </div>
    </div>
  </div>
);

export default ConteosHeader;
