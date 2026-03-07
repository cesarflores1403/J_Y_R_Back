import React, { useState } from 'react';
import { FiRepeat } from 'react-icons/fi';
import TransferenciaForm from './TransferenciaForm.jsx';

const InventarioTransferenciasPage = () => {
  // // Estado local para mostrar resumen de la ultima transferencia registrada
  const [ultimaTransferencia, setUltimaTransferencia] = useState(null);

  // // Callback del formulario para refrescar feedback de origen y destino en esta pagina
  const manejarTransferenciaRegistrada = async (resultado) => {
    setUltimaTransferencia(resultado || null);
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
