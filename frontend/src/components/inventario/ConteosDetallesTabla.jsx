import React from 'react';
import { FiInbox } from 'react-icons/fi';

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString();
};

const formatearUbicacion = (ubicacion) => {
  const texto = String(ubicacion || '').trim();
  if (!texto) return '-';

  const partes = texto.split('-').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length !== 4) return texto;

  const [pasillo, estanteria, nivel1, nivel2] = partes;
  return `P:${pasillo} E:${estanteria} N1:${nivel1} N2:${nivel2}`;
};

const claseDiferencia = (diferencia) => {
  const valor = Number(diferencia || 0);
  if (valor > 0) return 'kdx-qty kdx-qty-in';
  if (valor < 0) return 'kdx-qty kdx-qty-out';
  return 'kdx-qty kdx-qty-neutral';
};

const ConteosDetallesTabla = ({ filas = [], loading = false }) => (
  <div className="table-responsive kdx-table-wrapper">
    <table className="table table-hover mb-0 kdx-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Ubicacion</th>
          <th>Stock sistema</th>
          <th>Stock fisico</th>
          <th>Diferencia</th>
          <th>Fecha registro</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan="7" className="text-center py-4">
              <div className="spinner-border spinner-border-sm me-2" />
              Cargando detalle del conteo...
            </td>
          </tr>
        ) : filas.length === 0 ? (
          <tr>
            <td colSpan="7" className="text-center text-muted py-4">
              <div className="kdx-empty-state">
                <FiInbox size={18} />
                <span>Sin detalles para este conteo</span>
              </div>
            </td>
          </tr>
        ) : (
          filas.map((fila, index) => (
            <tr key={fila?.cod_conteo_detalle || `detalle-${index}`}>
              <td>
                <div className="kdx-cell-main">{fila?.nombre_producto || '-'}</div>
                <div className="kdx-cell-sub">ID: {fila?.cod_producto ?? '-'}</div>
              </td>
              <td>
                <div className="kdx-cell-main">{formatearUbicacion(fila?.ubicacion)}</div>
                <div className="kdx-cell-sub">ID: {fila?.cod_ubicacion ?? '-'}</div>
              </td>
              <td>{Number(fila?.stock_sistema || 0)}</td>
              <td>{Number(fila?.stock_fisico || 0)}</td>
              <td>
                <span className={claseDiferencia(fila?.diferencia)}>
                  {Number(fila?.diferencia || 0)}
                </span>
              </td>
              <td>{formatearFecha(fila?.fecha_registro)}</td>
              <td>{String(fila?.observaciones || '-')}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default ConteosDetallesTabla;
