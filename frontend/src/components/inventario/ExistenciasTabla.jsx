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

// // Devuelve clase Bootstrap para resaltar el estado de stock en la tabla
const obtenerClaseEstado = (estadoStock) => {
  // // Mapeo visual simple para los estados definidos por HU2 reestructurada
  const mapa = {
    NORMAL: 'bg-success-subtle text-success border border-success-subtle',
    BAJO: 'bg-warning-subtle text-warning border border-warning-subtle',
    CRITICO: 'bg-danger-subtle text-danger border border-danger-subtle',
    SIN_EXISTENCIA: 'bg-dark text-light'
  };

  // // Fallback visual en caso de valores no reconocidos
  return mapa[estadoStock] || 'bg-secondary text-white';
};

// // Formatea numeros de stock para no mostrar vacios en la UI
const formatearNumero = (valor) => {
  // // null/undefined se muestran como cero para consistencia de tabla
  if (valor === null || valor === undefined || valor === '') return 0;
  // // Si el valor no es numerico devolvemos el original
  if (Number.isNaN(Number(valor))) return valor;
  return Number(valor);
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
                <th>Ubicacion</th>
                <th>Stock</th>
                <th>Reservado</th>
                <th>Disponible</th>
                <th>Estado</th>
                <th>Minimo</th>
                <th>Maximo</th>
                <th>Fecha ult. mov.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    {/* // Indicador visual de carga */}
                    <div className="spinner-border spinner-border-sm me-2" />
                    Cargando existencias...
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-muted py-4">
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
                    <td>{formatearNumero(fila.stock)}</td>
                    <td>{formatearNumero(fila.stock_reservado)}</td>
                    <td>{formatearNumero(fila.stock_disponible)}</td>
                    <td>
                      <span className={`badge rounded-pill ${obtenerClaseEstado(fila.estado_stock)}`}>
                        {fila.estado_stock || 'N/A'}
                      </span>
                    </td>
                    <td>{formatearNumero(fila.stock_minimo)}</td>
                    <td>{formatearNumero(fila.stock_maximo)}</td>
                    <td>{formatearFecha(fila.fecha_ult_mov)}</td>
                    <td>
                      <button
                        // // Accion para abrir formulario min/max
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(fila)}
                        title="Editar minimo y maximo"
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
