import React from 'react';

// // Formatea fecha a string local legible para la tabla de alertas
const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  return parsed.toLocaleString();
};

// // Formatea numeros de inventario con fallback a cero
const formatearNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (Number.isNaN(Number(valor))) return valor;
  return Number(valor);
};

// // Mapea estado_stock a clase visual consistente con el modulo
const obtenerClaseEstado = (estadoStock) => {
  const mapa = {
    NORMAL: 'bg-success-subtle text-success border border-success-subtle',
    BAJO: 'bg-warning-subtle text-warning border border-warning-subtle',
    CRITICO: 'bg-danger-subtle text-danger border border-danger-subtle',
    SIN_EXISTENCIA: 'bg-dark text-light'
  };
  return mapa[estadoStock] || 'bg-secondary text-white';
};

// // Mapea nivel_alerta a badge para priorizacion visual
const obtenerClaseNivel = (nivelAlerta) => {
  const mapa = {
    CRITICA: 'bg-danger text-white',
    STOCK_BAJO: 'bg-warning text-dark',
    PREVENTIVA: 'bg-info text-dark',
    INFORMATIVA: 'bg-secondary text-white'
  };
  return mapa[nivelAlerta] || 'bg-secondary text-white';
};

const AlertasReposicionTabla = ({ filas, loading }) => {
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
                <th>Minimo</th>
                <th>Maximo</th>
                <th>Estado</th>
                <th>Nivel alerta</th>
                <th>Fecha ult. mov.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    {/* // Indicador de carga de alertas */}
                    <div className="spinner-border spinner-border-sm me-2" />
                    Cargando alertas de reposicion...
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-muted py-4">
                    No hay alertas de reposicion con los filtros aplicados
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
                    <td>{formatearNumero(fila.stock_minimo)}</td>
                    <td>{formatearNumero(fila.stock_maximo)}</td>
                    <td>
                      <span className={`badge rounded-pill ${obtenerClaseEstado(fila.estado_stock)}`}>
                        {fila.estado_stock || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge rounded-pill ${obtenerClaseNivel(fila.nivel_alerta)}`}>
                        {fila.nivel_alerta || 'N/A'}
                      </span>
                    </td>
                    <td>{formatearFecha(fila.fecha_ult_mov)}</td>
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

export default AlertasReposicionTabla;
