import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

const formatearFecha = (fecha) => {
  // // Si no hay fecha registrada mostramos placeholder
  if (!fecha) return '-';
  // // Convertimos a objeto Date para formateo local
  const parsed = new Date(fecha);
  // // Si es invalida devolvemos valor sin transformar
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  // // Formato amigable para UI
  return parsed.toLocaleString();
};

const ExistenciasTabla = ({ filas, loading, onEditar }) => {
  return (
    <div className="jyr-card">
      <div className="jyr-card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Ubicación</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Fecha ult. mov.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    {/* // Indicador visual de carga */}
                    <div className="spinner-border spinner-border-sm me-2" />
                    Cargando existencias...
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    No se encontraron existencias con los filtros aplicados
                  </td>
                </tr>
              ) : (
                filas.map((fila) => (
                  <tr key={fila.cod_inventario}>
                    <td>
                      <strong>{fila.nombre_producto}</strong>
                      <div className="text-muted small">ID: {fila.cod_producto}</div>
                    </td>
                    <td>
                      {fila.ubicacion}
                      <div className="text-muted small">ID: {fila.cod_ubicacion}</div>
                    </td>
                    <td>{fila.stock}</td>
                    <td>{fila.stock_minimo}</td>
                    <td>{fila.stock_maximo}</td>
                    <td>{formatearFecha(fila.fecha_ult_mov)}</td>
                    <td>
                      <button
                        // // Accion para abrir formulario min/max
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(fila)}
                        title="Editar mínimo y máximo"
                      >
                        <FiEdit2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExistenciasTabla;
