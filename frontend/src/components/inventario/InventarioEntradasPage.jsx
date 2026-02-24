import React, { useState } from 'react';
import { FiPlusCircle } from 'react-icons/fi';
import EntradaForm from './EntradaForm.jsx';

const InventarioEntradasPage = () => {
  // // Estado local opcional para mostrar una confirmacion adicional de la ultima entrada registrada
  const [ultimaEntrada, setUltimaEntrada] = useState(null);

  // // Captura el resultado de HU4 sin depender de la vista de existencias
  const manejarEntradaRegistrada = async (resultado) => {
    setUltimaEntrada(resultado || null);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiPlusCircle />
          <h3 className="mb-0">Entradas</h3>
        </div>
      </div>

      <EntradaForm
        // // HU4 como submodulo independiente del sidebar
        onEntradaRegistrada={manejarEntradaRegistrada}
      />

      {ultimaEntrada?.inventario && (
        // // Resumen de la existencia impactada para feedback post-registro en la pagina de entradas
        <div className="jyr-card mt-4">
          <div className="jyr-card-body">
            <h5 className="mb-3">Existencia actualizada</h5>
            <div><strong>Producto:</strong> {ultimaEntrada.inventario.nombre_producto}</div>
            <div><strong>Ubicacion:</strong> {ultimaEntrada.inventario.ubicacion}</div>
            <div><strong>Stock:</strong> {ultimaEntrada.inventario.stock}</div>
            <div><strong>Reservado:</strong> {ultimaEntrada.inventario.stock_reservado}</div>
            <div><strong>Disponible:</strong> {ultimaEntrada.inventario.stock_disponible}</div>
            <div><strong>Estado:</strong> {ultimaEntrada.inventario.estado_stock}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioEntradasPage;
