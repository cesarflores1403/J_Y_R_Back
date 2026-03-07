import React, { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import BajaForm from './BajaForm.jsx';

const InventarioBajasPage = () => {
  // // Estado local opcional para mostrar confirmacion adicional de la ultima baja registrada
  const [ultimaBaja, setUltimaBaja] = useState(null);

  // // Captura el resultado de HU bajas para feedback visual en la pagina independiente
  const manejarBajaRegistrada = async (resultado) => {
    setUltimaBaja(resultado || null);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiAlertTriangle />
          <h3 className="mb-0">Bajas</h3>
        </div>
      </div>

      <BajaForm
        // // Submodulo dedicado para bajas de inventario
        onBajaRegistrada={manejarBajaRegistrada}
      />

      {ultimaBaja?.inventario && (
        // // Resumen de la existencia impactada para feedback post-registro de baja
        <div className="jyr-card mt-4">
          <div className="jyr-card-body">
            <h5 className="mb-3">Existencia tras baja</h5>
            <div><strong>Producto:</strong> {ultimaBaja.inventario.nombre_producto}</div>
            <div><strong>Ubicacion:</strong> {ultimaBaja.inventario.ubicacion}</div>
            <div><strong>Stock:</strong> {ultimaBaja.inventario.stock}</div>
            <div><strong>Reservado:</strong> {ultimaBaja.inventario.stock_reservado}</div>
            <div><strong>Disponible:</strong> {ultimaBaja.inventario.stock_disponible}</div>
            <div><strong>Estado:</strong> {ultimaBaja.inventario.estado_stock}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioBajasPage;
