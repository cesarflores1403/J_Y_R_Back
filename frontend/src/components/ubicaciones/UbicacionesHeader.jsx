import React from 'react';
import { FiDownload, FiMapPin, FiPlus } from 'react-icons/fi';

const UbicacionesHeader = ({
  totalUbicaciones = 0,
  onNuevaUbicacion,
  onExportarPdf,
  exportandoPdf = false
}) => (
  <div className="kdx-hero">
    <div className="kdx-hero-head">
      <div className="kdx-title-wrap">
        <div className="kdx-title-icon">
          <FiMapPin />
        </div>
        <div>
          <h5 className="mb-0">Ubicaciones</h5>
          <p className="kdx-subtitle mb-0">
            Catalogo de posiciones fisicas para entradas, salidas, transferencias y reservas.
          </p>
        </div>
      </div>

      <div className="ubi-hero-actions">
        <div className="kdx-mini-kpi">
          <span className="kdx-mini-kpi-label">Total</span>
          <strong>{totalUbicaciones}</strong>
        </div>
        <button type="button" className="btn kdx-btn kdx-btn-accent" onClick={onExportarPdf} disabled={exportandoPdf}>
          {exportandoPdf ? <span className="spinner-border spinner-border-sm me-1" /> : <FiDownload className="me-1" />}
          Exportar PDF
        </button>
        <button type="button" className="btn kdx-btn kdx-btn-accent" onClick={onNuevaUbicacion}>
          <FiPlus className="me-1" />
          Nueva ubicacion
        </button>
      </div>
    </div>
  </div>
);

export default UbicacionesHeader;
