import React from 'react';
import { FiInbox } from 'react-icons/fi';

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  return parsed.toLocaleString();
};

const formatearCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined || cantidad === '') return 0;
  if (Number.isNaN(Number(cantidad))) return cantidad;
  return Number(cantidad).toLocaleString();
};

const formatearUbicacionLegible = (ubicacion) => {
  const texto = String(ubicacion || '').trim();
  if (!texto) return '-';

  const partes = texto.split('-').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length !== 4) return texto;

  const [pasillo, estanteria, nivel1, nivel2] = partes;
  return `P:${pasillo} E:${estanteria} N1:${nivel1} N2:${nivel2}`;
};

const TransferenciasTabla = ({
  filas = [],
  loading = false,
  anulandoId = null,
  onAnular
}) => (
  <div className="table-responsive kdx-table-wrapper">
    <table className="table table-hover mb-0 kdx-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>Origen</th>
          <th>Destino</th>
          <th>Cantidad</th>
          <th>Referencia</th>
          <th>Usuario</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan="9" className="text-center py-4">
              <div className="spinner-border spinner-border-sm me-2" />
              Cargando transferencias...
            </td>
          </tr>
        ) : filas.length === 0 ? (
          <tr>
            <td colSpan="9" className="text-center text-muted py-4">
              <div className="kdx-empty-state">
                <FiInbox size={18} />
                <span>No hay transferencias para los filtros seleccionados</span>
              </div>
            </td>
          </tr>
        ) : (
          filas.map((fila, index) => {
            const codTransferencia = Number(fila?.cod_transferencia || 0);
            const anulada = String(fila?.estado || '').trim().toUpperCase() === 'ANULADA';
            return (
              <tr key={codTransferencia || `${fila?.fecha}-${index}`}>
                <td>{formatearFecha(fila?.fecha)}</td>
                <td>
                  <div className="kdx-cell-main">{fila?.nombre_producto || '-'}</div>
                  <div className="kdx-cell-sub">ID: {fila?.cod_producto ?? '-'}</div>
                </td>
                <td>
                  <div className="kdx-cell-main">{formatearUbicacionLegible(fila?.ubicacion_origen)}</div>
                  <div className="kdx-cell-sub">ID: {fila?.cod_ubicacion_origen ?? '-'}</div>
                </td>
                <td>
                  <div className="kdx-cell-main">{formatearUbicacionLegible(fila?.ubicacion_destino)}</div>
                  <div className="kdx-cell-sub">ID: {fila?.cod_ubicacion_destino ?? '-'}</div>
                </td>
                <td>
                  <span className="kdx-qty kdx-qty-in">
                    {formatearCantidad(fila?.cantidad)}
                  </span>
                </td>
                <td className="kdx-reference">{fila?.referencia || '-'}</td>
                <td className="kdx-user">{fila?.nombre_usuario || '-'}</td>
                <td>
                  {anulada ? (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                      ANULADA
                    </span>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      ACTIVA
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm kdx-btn kdx-btn-ghost"
                    disabled={anulada || anulandoId === codTransferencia}
                    onClick={() => onAnular?.(fila)}
                  >
                    {anulada ? 'Anulada' : (anulandoId === codTransferencia ? 'Anulando...' : 'Anular')}
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default TransferenciasTabla;
