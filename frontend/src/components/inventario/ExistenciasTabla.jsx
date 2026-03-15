import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  return parsed.toLocaleString();
};

const obtenerClaseEstado = (estadoStock) => {
  const mapa = {
    NORMAL: 'bg-success-subtle text-success border border-success-subtle',
    BAJO: 'bg-warning-subtle text-warning border border-warning-subtle',
    CRITICO: 'bg-danger-subtle text-danger border border-danger-subtle',
    SIN_EXISTENCIA: 'bg-dark text-light'
  };
  return mapa[estadoStock] || 'bg-secondary text-white';
};

const formatearNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (Number.isNaN(Number(valor))) return valor;
  return Number(valor);
};

const formatearCodigoProducto = (fila) => {
  if (fila?.codigo_producto && String(fila.codigo_producto).trim().length > 0) {
    return String(fila.codigo_producto).trim();
  }
  const cod = Number(fila?.cod_producto);
  if (Number.isNaN(cod) || cod <= 0) return '-';
  return `PROD-${String(cod).padStart(4, '0')}`;
};

const obtenerFilaKey = (fila) => {
  if (fila?.cod_inventario) return `inv-${fila.cod_inventario}`;
  const codProducto = fila?.cod_producto ?? 'na';
  const codUbicacion = fila?.cod_ubicacion ?? 'na';
  return `prod-${codProducto}-ubi-${codUbicacion}`;
};

const aNumero = (valor) => {
  const parsed = Number(valor);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const calcularDisponible = (fila) => (
  aNumero(fila?.stock) - aNumero(fila?.stock_reservado)
);

const ExistenciasTabla = ({ filas, loading, onEditar }) => {
  return (
    <div className="table-responsive kdx-table-wrapper">
      <table className="table table-hover mb-0 kdx-table">
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
              <tr key={obtenerFilaKey(fila)}>
                <td>
                  <div className="kdx-cell-main">{fila.nombre_producto}</div>
                  <div className="kdx-cell-sub">Codigo: {formatearCodigoProducto(fila)}</div>
                </td>
                <td>
                  <div className="kdx-cell-main">{fila.ubicacion}</div>
                  <div className="kdx-cell-sub">ID: {fila.cod_ubicacion ?? '-'}</div>
                </td>
                <td>{formatearNumero(fila.stock)}</td>
                <td>{formatearNumero(fila.stock_reservado)}</td>
                <td>
                  <span className={`kdx-qty ${calcularDisponible(fila) > 0 ? 'kdx-qty-in' : (calcularDisponible(fila) < 0 ? 'kdx-qty-out' : 'kdx-qty-neutral')}`}>
                    {formatearNumero(calcularDisponible(fila))}
                  </span>
                </td>
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
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onEditar(fila)}
                    disabled={!fila.cod_inventario}
                    title={fila.cod_inventario ? 'Editar minimo y maximo' : 'Sin registro de inventario para editar'}
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
  );
};

export default ExistenciasTabla;
