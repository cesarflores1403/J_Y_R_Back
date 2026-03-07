import React, { useState } from 'react';
import { FiMinusCircle } from 'react-icons/fi';
import SalidaForm from './SalidaForm.jsx';

const InventarioSalidasPage = () => {
  // // Estado local opcional para mostrar una confirmacion adicional de la ultima salida registrada
  const [ultimaSalida, setUltimaSalida] = useState(null);

  // // Captura el resultado de HU5 sin depender de la vista de existencias
  const manejarSalidaRegistrada = async (resultado) => {
    setUltimaSalida(resultado || null);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiMinusCircle />
          <h3 className="mb-0">Salidas</h3>
        </div>
      </div>

      <SalidaForm
        // // HU5 como submodulo independiente del sidebar
        onSalidaRegistrada={manejarSalidaRegistrada}
      />

      {ultimaSalida?.inventario && (
        // // Resumen de la existencia impactada para feedback post-registro en la pagina de salidas
        <div className="jyr-card mt-4">
          <div className="jyr-card-body">
            <h5 className="mb-3">Existencia actualizada</h5>
            <div><strong>Producto:</strong> {ultimaSalida.inventario.nombre_producto}</div>
            <div><strong>Ubicacion:</strong> {ultimaSalida.inventario.ubicacion}</div>
            <div><strong>Stock:</strong> {ultimaSalida.inventario.stock}</div>
            <div><strong>Reservado:</strong> {ultimaSalida.inventario.stock_reservado}</div>
            <div><strong>Disponible:</strong> {ultimaSalida.inventario.stock_disponible}</div>
            <div><strong>Estado:</strong> {ultimaSalida.inventario.estado_stock}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioSalidasPage;
