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

const BajasTabla = ({ filas, loading, onAnular, anulandoId = null }) => (
  <div className="table-responsive kdx-table-wrapper">
    <table className="table table-hover mb-0 kdx-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>Ubicacion</th>
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
            <td colSpan="8" className="text-center py-4">
              <div className="spinner-border spinner-border-sm me-2" />
              Cargando bajas...
            </td>
          </tr>
        ) : filas.length === 0 ? (
          <tr>
            <td colSpan="8" className="text-center text-muted py-4">
              <div className="kdx-empty-state">
                <FiInbox size={18} />
                <span>No hay bajas para los filtros seleccionados</span>
              </div>
            </td>
          </tr>
        ) : (
          filas.map((fila, index) => (
            <tr key={fila.cod_movimiento || `${fila.fecha_movimiento}-${index}`}>
              <td>{formatearFecha(fila.fecha_movimiento)}</td>
              <td>
                <div className="kdx-cell-main">{fila.nombre_producto || '-'}</div>
                <div className="kdx-cell-sub">ID: {fila.cod_producto ?? '-'}</div>
              </td>
              <td>
                <div className="kdx-cell-main">{formatearUbicacionLegible(fila.ubicacion)}</div>
                <div className="kdx-cell-sub">ID: {fila.cod_ubicacion ?? '-'}</div>
              </td>
              <td>
                <span className="kdx-qty kdx-qty-out">
                  {formatearCantidad(fila.cantidad)}
                </span>
              </td>
              <td className="kdx-reference">{fila.referencia_documento || '-'}</td>
              <td className="kdx-user">{fila.nombre_usuario || '-'}</td>
              <td>
                {fila.anulado ? (
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
                  disabled={anulandoId === fila.cod_movimiento || Boolean(fila.anulado)}
                  onClick={() => onAnular?.(fila)}
                >
                  {fila.anulado ? 'Anulada' : (anulandoId === fila.cod_movimiento ? 'Anulando...' : 'Anular')}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default BajasTabla;
