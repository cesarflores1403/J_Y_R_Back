import React from 'react';
import { FiInbox } from 'react-icons/fi';

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString();
};

const formatearCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined || cantidad === '') return '0';
  const numero = Number(cantidad);
  if (Number.isNaN(numero)) return String(cantidad);
  return numero.toLocaleString();
};

const formatearUbicacionLegible = (ubicacion) => {
  const texto = String(ubicacion || '').trim();
  if (!texto) return '-';
  if (texto.includes('P:') || texto.includes('E:')) return texto;

  const partes = texto.split('-').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length !== 4 || partes.some((parte) => !/^\d+$/.test(parte))) {
    return texto;
  }

  const [pasillo, estanteria, nivel1, nivel2] = partes;
  return `P:${pasillo} E:${estanteria} N1:${nivel1} N2:${nivel2}`;
};

const renderEstado = (estadoRaw) => {
  const estado = String(estadoRaw || '').toUpperCase();

  if (estado === 'ACTIVA') {
    return <span className="badge bg-success-subtle text-success border border-success-subtle">ACTIVA</span>;
  }
  if (estado === 'LIBERADA') {
    return <span className="badge bg-warning-subtle text-warning border border-warning-subtle">LIBERADA</span>;
  }
  if (estado === 'CONSUMIDA') {
    return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">CONSUMIDA</span>;
  }
  if (estado === 'ANULADA') {
    return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">ANULADA</span>;
  }
  return <span className="badge bg-light text-dark border">{estado || '-'}</span>;
};

const ReservasTabla = ({
  filas = [],
  loading = false,
  procesandoId = null,
  onLiberar,
  onConsumir
}) => {
  return (
    <div className="table-responsive kdx-table-wrapper">
      <table className="table table-hover mb-0 kdx-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Ubicacion</th>
            <th>Cantidad</th>
            <th>Estado</th>
            <th>Referencia</th>
            <th>Usuario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="8" className="text-center py-4">
                <div className="spinner-border spinner-border-sm me-2" />
                Cargando reservas...
              </td>
            </tr>
          ) : filas.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center text-muted py-4">
                <div className="kdx-empty-state">
                  <FiInbox size={18} />
                  <span>No hay reservas para los filtros seleccionados</span>
                </div>
              </td>
            </tr>
          ) : (
            filas.map((fila) => {
              const estado = String(fila.estado || '').toUpperCase();
              const activa = estado === 'ACTIVA';
              const bloqueada = procesandoId === fila.cod_reserva;

              return (
                <tr key={fila.cod_reserva}>
                  <td>{formatearFecha(fila.fecha_creacion)}</td>
                  <td>
                    <div className="kdx-cell-main">{fila.nombre_producto || '-'}</div>
                    <div className="kdx-cell-sub">ID: {fila.cod_producto ?? '-'}</div>
                  </td>
                  <td>
                    <div className="kdx-cell-main">{formatearUbicacionLegible(fila.ubicacion)}</div>
                    <div className="kdx-cell-sub">ID: {fila.cod_ubicacion ?? '-'}</div>
                  </td>
                  <td>
                    <span className="kdx-qty kdx-qty-in">{formatearCantidad(fila.cantidad)}</span>
                  </td>
                  <td>{renderEstado(estado)}</td>
                  <td className="kdx-reference">{fila.referencia || '-'}</td>
                  <td className="kdx-user">{fila.usuario_creacion || '-'}</td>
                  <td className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm kdx-btn kdx-btn-ghost"
                      disabled={!activa || bloqueada}
                      onClick={() => onLiberar?.(fila)}
                    >
                      {activa ? 'Liberar' : 'Liberada'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm kdx-btn kdx-btn-accent"
                      disabled={!activa || bloqueada}
                      onClick={() => onConsumir?.(fila)}
                    >
                      {bloqueada ? 'Procesando...' : 'Consumir'}
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
};

export default ReservasTabla;
