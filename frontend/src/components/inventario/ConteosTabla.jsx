import React from 'react';
import { FiInbox } from 'react-icons/fi';

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString();
};

const badgeEstado = (estado) => {
  const normalizado = String(estado || '').trim().toUpperCase();
  if (normalizado === 'ABIERTO') {
    return <span className="badge bg-warning-subtle text-warning border border-warning-subtle">ABIERTO</span>;
  }
  if (normalizado === 'CERRADO') {
    return <span className="badge bg-info-subtle text-info border border-info-subtle">CERRADO</span>;
  }
  if (normalizado === 'ANULADO') {
    return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">ANULADO</span>;
  }
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{normalizado || '-'}</span>;
};

const ConteosTabla = ({ filas = [], loading = false, conteoActivoId = 0, onSeleccionar }) => (
  <div className="table-responsive kdx-table-wrapper">
    <table className="table table-hover mb-0 kdx-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Estado</th>
          <th>Apertura</th>
          <th>Cierre</th>
          <th>Usuario apertura</th>
          <th>Usuario cierre</th>
          <th>Detalle</th>
          <th>Dif +</th>
          <th>Dif -</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan="10" className="text-center py-4">
              <div className="spinner-border spinner-border-sm me-2" />
              Cargando conteos...
            </td>
          </tr>
        ) : filas.length === 0 ? (
          <tr>
            <td colSpan="10" className="text-center text-muted py-4">
              <div className="kdx-empty-state">
                <FiInbox size={18} />
                <span>No hay conteos para los filtros seleccionados</span>
              </div>
            </td>
          </tr>
        ) : (
          filas.map((fila, index) => {
            const codConteo = Number(fila?.cod_conteo || 0);
            const activo = codConteo > 0 && codConteo === Number(conteoActivoId || 0);

            return (
              <tr key={codConteo || `conteo-${index}`} className={activo ? 'table-active' : ''}>
                <td>{codConteo || '-'}</td>
                <td>{badgeEstado(fila?.estado)}</td>
                <td>{formatearFecha(fila?.fecha_apertura)}</td>
                <td>{formatearFecha(fila?.fecha_cierre)}</td>
                <td>{fila?.usuario_apertura || '-'}</td>
                <td>{fila?.usuario_cierre || '-'}</td>
                <td>{Number(fila?.total_detalles || 0)}</td>
                <td>{Number(fila?.total_diferencias_positivas || 0)}</td>
                <td>{Number(fila?.total_diferencias_negativas || 0)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm kdx-btn kdx-btn-ghost"
                    onClick={() => onSeleccionar?.(fila)}
                  >
                    Gestionar
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

export default ConteosTabla;
