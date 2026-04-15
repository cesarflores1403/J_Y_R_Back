import React from 'react';
import {
  FiDatabase,
  FiEdit2,
  FiRotateCw,
  FiToggleRight,
  FiTrash2
} from 'react-icons/fi';

const UbicacionesTablaCard = ({
  inicioMostrado = 0,
  finMostrado = 0,
  totalUbicaciones = 0,
  loading = false,
  ubicaciones = [],
  onEditar,
  onToggleEstado,
  onEliminar
}) => (
  <div className="jyr-card mt-3 kdx-table-card">
    <div className="kdx-table-topbar">
      <div className="kdx-table-topbar-left">
        <FiDatabase />
        <span>Ubicaciones registradas</span>
      </div>
      <div className="kdx-table-topbar-right">
        Mostrando {inicioMostrado}-{finMostrado} de {totalUbicaciones}
      </div>
    </div>

    <div className="jyr-card-body p-0">
      <div className="table-responsive kdx-table-wrapper">
        <table className="table table-hover mb-0 kdx-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Codigo de producto</th>
              <th>Pasillo</th>
              <th>Estanteria</th>
              <th>Nivel 1</th>
              <th>Nivel 2</th>
              <th>Descripcion</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4">
                  <div className="spinner-border spinner-border-sm me-2" />
                  Cargando ubicaciones...
                </td>
              </tr>
            ) : totalUbicaciones === 0 ? (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  No hay ubicaciones registradas
                </td>
              </tr>
            ) : (
              ubicaciones.map((item) => (
                <tr key={item.cod_ubicacion}>
                  <td>{item.cod_ubicacion}</td>
                  <td>{item.codigo_producto || '-'}</td>
                  <td>{item.pasillo || '-'}</td>
                  <td>{item.estanteria || '-'}</td>
                  <td>{item.nivel_1 || '-'}</td>
                  <td>{item.nivel_2 || '-'}</td>
                  <td>{item.descripcion || '-'}</td>
                  <td>
                    <span className={`badge rounded-pill ${item.estado_ubi === 'ACTIVA' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'}`}>
                      {item.estado_ubi}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => onEditar(item)}
                      title="Editar"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning me-1"
                      onClick={() => onToggleEstado(item)}
                      title={item.estado_ubi === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}
                    >
                      {item.estado_ubi === 'ACTIVA' ? <FiToggleRight /> : <FiRotateCw />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onEliminar(item.cod_ubicacion)}
                      title="Eliminar"
                    >
                      <FiTrash2 />
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

export default UbicacionesTablaCard;
