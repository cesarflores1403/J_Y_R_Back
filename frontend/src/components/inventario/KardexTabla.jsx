import React from 'react';

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
  return Number(cantidad);
};

// // Resalta el tipo de movimiento con badge Bootstrap
const obtenerClaseTipo = (tipo) => {
  const tipoNormalizado = String(tipo || '').toUpperCase();
  if (tipoNormalizado === 'ENTRADA') return 'bg-success-subtle text-success border border-success-subtle';
  if (tipoNormalizado === 'SALIDA') return 'bg-danger-subtle text-danger border border-danger-subtle';
  if (tipoNormalizado === 'AJUSTE') return 'bg-warning-subtle text-warning border border-warning-subtle';
  return 'bg-secondary text-white';
};

const KardexTabla = ({ filas, loading }) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Producto</th>
            <th>Ubicacion</th>
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
                No hay movimientos para los filtros seleccionados
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
                  <div>{fila.nombre_producto || '-'}</div>
                  <div className="text-muted small">ID: {fila.cod_producto ?? '-'}</div>
                </td>
                <td>
                  <div>{fila.ubicacion || '-'}</div>
                  <div className="text-muted small">ID: {fila.cod_ubicacion ?? '-'}</div>
                </td>
                <td>{formatearCantidad(fila.cantidad)}</td>
                <td>{fila.referencia_documento || '-'}</td>
                <td>{fila.nombre_usuario || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KardexTabla;
