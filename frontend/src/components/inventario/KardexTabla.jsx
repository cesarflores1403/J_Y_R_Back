import React from 'react';
import { FiInbox } from 'react-icons/fi';

// // Formatea fecha de kardex en formato local legible
const formatearFecha = (fecha) => {
  // // Si no hay valor se muestra placeholder
  if (!fecha) return '-';
  const parsed = new Date(fecha);
  // // Si no es fecha valida devolvemos el valor original
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  return parsed.toLocaleString();
};

// // Formatea cantidad del movimiento para tabla del kardex
const formatearCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined || cantidad === '') return 0;
  if (Number.isNaN(Number(cantidad))) return cantidad;
  return Number(cantidad).toLocaleString();
};

// // Resalta el tipo de movimiento con badge Bootstrap
const obtenerClaseTipo = (tipo) => {
  const tipoNormalizado = String(tipo || '').toUpperCase();
  if (tipoNormalizado === 'ENTRADA') return 'bg-success-subtle text-success border border-success-subtle';
  if (tipoNormalizado === 'SALIDA') return 'bg-danger-subtle text-danger border border-danger-subtle';
  if (tipoNormalizado === 'AJUSTE') return 'bg-warning-subtle text-warning border border-warning-subtle';
  if (tipoNormalizado === 'BAJA') return 'bg-dark text-white';
  if (tipoNormalizado === 'DEVOLUCION') return 'bg-info-subtle text-info-emphasis border border-info-subtle';
  if (tipoNormalizado === 'COMPRA') return 'bg-primary-subtle text-primary border border-primary-subtle';
  return 'bg-secondary text-white';
};

// // Estilo de cantidad segun el tipo de movimiento del kardex
const obtenerClaseCantidad = (tipo) => {
  const tipoNormalizado = String(tipo || '').toUpperCase();
  if (tipoNormalizado === 'ENTRADA' || tipoNormalizado === 'DEVOLUCION' || tipoNormalizado === 'COMPRA') {
    return 'kdx-qty kdx-qty-in';
  }
  if (tipoNormalizado === 'SALIDA' || tipoNormalizado === 'BAJA') {
    return 'kdx-qty kdx-qty-out';
  }
  return 'kdx-qty kdx-qty-neutral';
};

const KardexTabla = ({ filas, loading }) => {
  return (
    <div className="table-responsive kdx-table-wrapper">
      <table className="table table-hover mb-0 kdx-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Producto</th>
            <th>Ubicación</th>
            <th>Cantidad</th>
            <th>Referencia</th>
            <th>Usuario</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="text-center py-4">
                {/* // Estado de carga del kardex */}
                <div className="spinner-border spinner-border-sm me-2" />
                Cargando movimientos...
              </td>
            </tr>
          ) : filas.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center text-muted py-4">
                <div className="kdx-empty-state">
                  <FiInbox size={18} />
                  <span>No hay movimientos para los filtros seleccionados</span>
                </div>
              </td>
            </tr>
          ) : (
            filas.map((fila, index) => (
              <tr key={fila.cod_movimiento || `${fila.fecha_movimiento}-${index}`}>
                <td>{formatearFecha(fila.fecha_movimiento)}</td>
                <td>
                  <span className={`badge rounded-pill ${obtenerClaseTipo(fila.tipo)}`}>
                    {fila.tipo || 'N/A'}
                  </span>
                </td>
                <td>
                  <div className="kdx-cell-main">{fila.nombre_producto || '-'}</div>
                  <div className="kdx-cell-sub">ID: {fila.cod_producto ?? '-'}</div>
                </td>
                <td>
                  <div className="kdx-cell-main">{fila.ubicacion || '-'}</div>
                  <div className="kdx-cell-sub">ID: {fila.cod_ubicacion ?? '-'}</div>
                </td>
                <td>
                  <span className={obtenerClaseCantidad(fila.tipo)}>
                    {formatearCantidad(fila.cantidad)}
                  </span>
                </td>
                <td className="kdx-reference">{fila.referencia_documento || '-'}</td>
                <td className="kdx-user">{fila.nombre_usuario || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KardexTabla;
