import React from 'react';
import { FiCalendar, FiFilter, FiLayers, FiMapPin, FiPackage, FiRefreshCw } from 'react-icons/fi';
import { sanitizarFiltro } from '../../utils/filtroSanitizar.js';

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
    onChange(event.target.name, sanitizarFiltro(event.target.value));
  };

  return (
    <form
      className="kdx-filters-form"
      // // Aplicamos filtros solo al enviar el formulario para evitar requests en cada cambio
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar();
      }}
    >
      <div className="kdx-filters-topbar mb-3">
        <div className="kdx-filters-topbar-left">
          <span className="kdx-filters-chip">Filtros de búsqueda</span>
        </div>
        <div className="kdx-filters-topbar-actions">
          <button
            // // Restablece filtros del kardex
            type="button"
            className="btn kdx-btn kdx-btn-ghost"
            onClick={onLimpiar}
            disabled={loading}
          >
            <FiRefreshCw className="me-1" />
            Limpiar
          </button>

          <button
            // // Ejecuta consulta de kardex con los filtros actuales
            type="submit"
            className="btn kdx-btn kdx-btn-accent"
            disabled={loading}
          >
            <FiFilter className="me-1" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiCalendar size={14} />
            Fecha desde
          </label>
          <input
            // // Inicio de rango de fechas para kardex
            type="date"
            className="form-control kdx-control"
            name="fecha_desde"
            value={filtros.fecha_desde}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiCalendar size={14} />
            Fecha hasta
          </label>
          <input
            // // Fin de rango de fechas para kardex
            type="date"
            className="form-control kdx-control"
            name="fecha_hasta"
            value={filtros.fecha_hasta}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1 kdx-label">
            <FiPackage size={14} />
            Cod. Producto
          </label>
          <input
            // // Filtro por codigo enlazado a catalogo real de productos
            type="text"
            className="form-control kdx-control"
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
          <label className="form-label mb-1 kdx-label">
            <FiMapPin size={14} />
            Cod. Ubicación
          </label>
          <input
            // // Filtro exacto por ubicacion
            type="number"
            min="1"
            className="form-control kdx-control"
            name="cod_ubicacion"
            value={filtros.cod_ubicacion}
            onChange={handleInput}
            placeholder="Ej: 1"
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1 kdx-label">
            <FiLayers size={14} />
            Tipo
          </label>
          <select
            // // Tipo de movimiento para kardex (HU3)
            className="form-select kdx-control"
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
    </form>
  );
};

export default KardexFiltros;
