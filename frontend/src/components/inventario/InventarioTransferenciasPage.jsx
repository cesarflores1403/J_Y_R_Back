import React, { useCallback, useEffect, useState } from 'react';
import { FiRepeat } from 'react-icons/fi';
import TransferenciaForm from './TransferenciaForm.jsx';
import { inventarioTransferenciasApi } from './inventarioTransferencias.api.js';

const normalizarListado = (payload) => {
  if (Array.isArray(payload?.data) && payload?.meta) {
    return {
      filas: payload.data,
      total: Number(payload.meta.total || 0)
    };
  }

  return {
    filas: Array.isArray(payload?.datos) ? payload.datos : [],
    total: Number(payload?.total || 0)
  };
};

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString();
};

const InventarioTransferenciasPage = () => {
  // // Estado local para mostrar resumen de la ultima transferencia registrada
  const [ultimaTransferencia, setUltimaTransferencia] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [totalTransferencias, setTotalTransferencias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorListado, setErrorListado] = useState('');
  const [filtroReferencia, setFiltroReferencia] = useState('');

  // // Carga historial persistente de transferencias desde backend
  const cargarTransferencias = useCallback(async (referencia = '') => {
    try {
      setLoading(true);
      setErrorListado('');

      const params = {
        page: 1,
        limit: 20
      };
      if (referencia && referencia.trim()) {
        params.referencia = referencia.trim();
      }

      const { data } = await inventarioTransferenciasApi.listar(params);
      if (!data?.ok) {
        setTransferencias([]);
        setTotalTransferencias(0);
        setErrorListado('Respuesta invalida al listar transferencias');
        return;
      }

      const normalizado = normalizarListado(data.data);
      setTransferencias(normalizado.filas);
      setTotalTransferencias(normalizado.total);
    } catch (error) {
      const mensaje = error?.response?.data?.message
        || error?.response?.data?.mensaje
        || 'Error al listar transferencias';
      setTransferencias([]);
      setTotalTransferencias(0);
      setErrorListado(mensaje);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTransferencias();
  }, [cargarTransferencias]);

  // // Callback del formulario para refrescar feedback de origen y destino en esta pagina
  const manejarTransferenciaRegistrada = async (resultado) => {
    setUltimaTransferencia(resultado || null);
    await cargarTransferencias(filtroReferencia);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiRepeat />
          <h3 className="mb-0">Transferencias</h3>
        </div>
      </div>

      <TransferenciaForm
        // // Submodulo dedicado para transferencias entre ubicaciones
        onTransferenciaRegistrada={manejarTransferenciaRegistrada}
      />

      <div className="jyr-card mt-4">
        <div className="jyr-card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 className="mb-0">Historial persistente de transferencias</h5>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Filtrar por referencia"
                value={filtroReferencia}
                onChange={(event) => setFiltroReferencia(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => cargarTransferencias(filtroReferencia)}
                disabled={loading}
              >
                Buscar
              </button>
            </div>
          </div>

          {errorListado && (
            <div className="alert alert-danger py-2" role="alert">
              {errorListado}
            </div>
          )}

          <div className="alert alert-light border py-2">
            <strong>Total:</strong> {totalTransferencias}
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Cantidad</th>
                  <th>Referencia</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {!loading && transferencias.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      No hay transferencias registradas.
                    </td>
                  </tr>
                )}
                {transferencias.map((item) => (
                  <tr key={item.cod_transferencia}>
                    <td>{item.cod_transferencia}</td>
                    <td>{formatearFecha(item.fecha)}</td>
                    <td>{item.nombre_producto || item.cod_producto}</td>
                    <td>{item.ubicacion_origen || item.cod_ubicacion_origen}</td>
                    <td>{item.ubicacion_destino || item.cod_ubicacion_destino}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.referencia || '-'}</td>
                    <td>{item.nombre_usuario || '-'}</td>
                    <td>{item.estado || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {ultimaTransferencia?.origen && ultimaTransferencia?.destino && (
        // // Resumen de existencias impactadas tras una transferencia exitosa
        <div className="jyr-card mt-4">
          <div className="jyr-card-body">
            <h5 className="mb-3">Existencias tras transferencia</h5>
            <div><strong>Referencia:</strong> {ultimaTransferencia.referencia}</div>
            <hr />
            <div><strong>Origen (ubicacion {ultimaTransferencia.origen.cod_ubicacion}):</strong></div>
            <div>Stock actual: {ultimaTransferencia.origen.stock_actual}</div>
            <div>Disponible: {ultimaTransferencia.origen.stock_disponible}</div>
            <hr />
            <div><strong>Destino (ubicacion {ultimaTransferencia.destino.cod_ubicacion}):</strong></div>
            <div>Stock actual: {ultimaTransferencia.destino.stock_actual}</div>
            <div>Disponible: {ultimaTransferencia.destino.stock_disponible}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioTransferenciasPage;
