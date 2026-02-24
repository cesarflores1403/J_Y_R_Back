import React from 'react';
import { FiList } from 'react-icons/fi';
import Kardex from './Kardex.jsx';

const InventarioKardexPage = () => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiList />
          <h3 className="mb-0">Kardex</h3>
        </div>
      </div>

      <Kardex />
    </div>
  );
};

export default InventarioKardexPage;
