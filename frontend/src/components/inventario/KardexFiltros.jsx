import React from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';

const KardexFiltros = ({
  filtros,
  productos = [],
  loading,
  onChange,
  onAplicar,
  onLimpiar
}) => {
  // // Handler generico para inputs de texto/numero/date del formulario
  const handleInput = (event) => {
    onChange(event.target.name, event.target.value);
  };

  return (
    <form
      // // Aplicamos filtros solo al enviar el formulario para evitar requests en cada cambio
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar();
      }}
    >
      <div className="row g-2">
        <div className="col-12 col-md-3">
          <label className="form-label mb-1">Fecha desde</label>
          <input
            // // Inicio de rango de fechas para kardex
            type="date"
            className="form-control"
            name="fecha_desde"
            value={filtros.fecha_desde}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1">Fecha hasta</label>
          <input
            // // Fin de rango de fechas para kardex
            type="date"
            className="form-control"
            name="fecha_hasta"
            value={filtros.fecha_hasta}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1">Cod. Producto</label>
          <input
            // // Filtro por codigo enlazado a catalogo real de productos
            type="text"
            className="form-control"
            name="cod_producto"
            value={filtros.cod_producto}
            onChange={handleInput}
            list="kardex-productos-list"
            inputMode="numeric"
            placeholder="Ej: 23 o PROD-0023"
          />
          <datalist id="kardex-productos-list">
            {productos.map((producto) => (
              <option
                key={producto.cod_producto}
                value={String(producto.cod_producto)}
                label={`${producto.codigo_producto || `PROD-${String(producto.cod_producto).padStart(4, '0')}`} - ${producto.nombre_producto || ''}`}
              />
            ))}
          </datalist>
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1">Cod. Ubicacion</label>
          <input
            // // Filtro exacto por ubicacion
            type="number"
            min="1"
            className="form-control"
            name="cod_ubicacion"
            value={filtros.cod_ubicacion}
            onChange={handleInput}
            placeholder="Ej: 1"
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1">Tipo</label>
          <select
            // // Tipo de movimiento para kardex (HU3)
            className="form-select"
            name="tipo"
            value={filtros.tipo}
            onChange={handleInput}
          >
            <option value="">Todos</option>
            <option value="ENTRADA">ENTRADA</option>
            <option value="SALIDA">SALIDA</option>
            <option value="BAJA">BAJA</option>
            <option value="AJUSTE">AJUSTE</option>
            <option value="DEVOLUCION">DEVOLUCION</option>
            <option value="COMPRA">COMPRA</option>
          </select>
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-12 col-md-2">
          <label className="form-label mb-1">Pagina</label>
          <input
            // // Pagina solicitada para el kardex
            type="number"
            min="1"
            className="form-control"
            name="pagina"
            value={filtros.pagina}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1">Limite</label>
          <input
            // // Tamano de pagina para el kardex
            type="number"
            min="1"
            max="100"
            className="form-control"
            name="limite"
            value={filtros.limite}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-8 d-flex justify-content-md-end align-items-end gap-2">
          <button
            // // Restablece filtros del kardex
            type="button"
            className="btn btn-outline-secondary"
            onClick={onLimpiar}
            disabled={loading}
          >
            <FiRefreshCw className="me-1" />
            Limpiar
          </button>

          <button
            // // Ejecuta consulta de kardex con los filtros actuales
            type="submit"
            className="btn jyr-btn-primary"
            disabled={loading}
          >
            <FiFilter className="me-1" />
            Filtrar
          </button>
        </div>
      </div>
    </form>
  );
};

export default KardexFiltros;
