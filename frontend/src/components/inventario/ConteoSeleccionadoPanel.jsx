import React from 'react';

const ConteoSeleccionadoPanel = ({
  conteoActivo = null,
  formatearFecha,
  metaDetalles = { total: 0 },
  resumenDiferencias = { positivos: 0, negativos: 0, sinCambio: 0 },
  conteoAbierto = false,
  resumenCierre = null,
  onCapturarDetalle,
  onCerrarConteo
}) => {
  if (!conteoActivo?.cod_conteo) return null;

  return (
    <div className="jyr-card mt-3">
      <div className="jyr-card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <h6 className="mb-1">
              Conteo seleccionado #{conteoActivo.cod_conteo}
            </h6>
            <p className="text-muted mb-2">
              Estado: <strong>{conteoActivo.estado || '-'}</strong> | Apertura: {formatearFecha(conteoActivo.fecha_apertura)}
            </p>
            <div className="kdx-kpi-grid">
              <div className="kdx-kpi-card">
                <span>Detalles</span>
                <strong>{metaDetalles.total}</strong>
              </div>
              <div className="kdx-kpi-card">
                <span>Diferencias +</span>
                <strong>{resumenDiferencias.positivos}</strong>
              </div>
              <div className="kdx-kpi-card">
                <span>Diferencias -</span>
                <strong>{resumenDiferencias.negativos}</strong>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn kdx-btn kdx-btn-accent"
              onClick={onCapturarDetalle}
              disabled={!conteoAbierto}
            >
              Capturar detalle
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onCerrarConteo}
              disabled={!conteoAbierto || metaDetalles.total === 0}
            >
              Cerrar conteo
            </button>
          </div>
        </div>

        {resumenCierre && (
          <div className="alert alert-light border mt-3 mb-0">
            <div><strong>Total detalles:</strong> {resumenCierre.total_detalles ?? 0}</div>
            <div><strong>Ajustes +:</strong> {resumenCierre.ajustes_positivos ?? 0}</div>
            <div><strong>Ajustes -:</strong> {resumenCierre.ajustes_negativos ?? 0}</div>
            <div><strong>Sin cambio:</strong> {resumenCierre.detalles_sin_cambio ?? 0}</div>
            <div><strong>Movimientos generados:</strong> {resumenCierre.total_movimientos_generados ?? 0}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConteoSeleccionadoPanel;
