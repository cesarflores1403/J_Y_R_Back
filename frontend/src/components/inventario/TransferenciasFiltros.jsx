import React from 'react';
import { FiCalendar, FiFilter, FiMapPin, FiRefreshCw, FiRepeat, FiTag } from 'react-icons/fi';

const formatearCodigoProducto = (producto) => {
  const codigo = String(producto?.codigo_producto || '').trim().toUpperCase();
  if (codigo) return codigo;
  const id = Number(producto?.cod_producto || 0);
  if (Number.isInteger(id) && id > 0) return `PROD-${String(id).padStart(4, '0')}`;
  return '';
};

const formatearUbicacion = (ubicacion) => {
  const pasillo = String(ubicacion?.pasillo || '').trim();
  const estanteria = String(ubicacion?.estanteria || '').trim();
  const nivel1 = String(ubicacion?.nivel_1 || '').trim();
  const nivel2 = String(ubicacion?.nivel_2 || '').trim();
  const descripcion = String(ubicacion?.descripcion || '').trim();

  const traza = [
    pasillo ? `P:${pasillo}` : null,
    estanteria ? `E:${estanteria}` : null,
    nivel1 ? `N1:${nivel1}` : null,
    nivel2 ? `N2:${nivel2}` : null
  ].filter(Boolean).join(' ');

  return descripcion ? `${traza} - ${descripcion}` : traza;
};

const TransferenciasFiltros = ({
  filtros,
  productos = [],
  ubicaciones = [],
  loading,
  onChange,
  onAplicar,
  onLimpiar
}) => {
  const handleInput = (event) => {
    onChange(event.target.name, event.target.value);
  };

  return (
    <form
      className="kdx-filters-form"
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar();
      }}
    >
      <div className="kdx-filters-topbar mb-3">
        <div className="kdx-filters-topbar-left">
          <span className="kdx-filters-chip">Filtros de busqueda</span>
        </div>
        <div className="kdx-filters-topbar-actions">
          <button
            type="button"
            className="btn kdx-btn kdx-btn-ghost"
            onClick={onLimpiar}
            disabled={loading}
          >
            <FiRefreshCw className="me-1" />
            Limpiar
          </button>
          <button
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
            type="date"
            className="form-control kdx-control"
            name="fecha_hasta"
            value={filtros.fecha_hasta}
            onChange={handleInput}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiTag size={14} />
            Cod. Producto
          </label>
          <select
            className="form-select kdx-control"
            name="cod_producto"
            value={filtros.cod_producto}
            onChange={handleInput}
          >
            <option value="">Todos</option>
            {productos.map((producto) => (
              <option key={producto.cod_producto} value={String(producto.cod_producto)}>
                {formatearCodigoProducto(producto)} - {producto.nombre_producto || 'Sin nombre'}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiMapPin size={14} />
            ID origen
          </label>
          <select
            className="form-select kdx-control"
            name="cod_ubicacion_origen"
            value={filtros.cod_ubicacion_origen}
            onChange={handleInput}
          >
            <option value="">Todas</option>
            {ubicaciones.map((ubicacion) => (
              <option key={`origen-${ubicacion.cod_ubicacion}`} value={String(ubicacion.cod_ubicacion)}>
                {ubicacion.cod_ubicacion} - {formatearUbicacion(ubicacion)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiMapPin size={14} />
            ID destino
          </label>
          <select
            className="form-select kdx-control"
            name="cod_ubicacion_destino"
            value={filtros.cod_ubicacion_destino}
            onChange={handleInput}
          >
            <option value="">Todas</option>
            {ubicaciones.map((ubicacion) => (
              <option key={`destino-${ubicacion.cod_ubicacion}`} value={String(ubicacion.cod_ubicacion)}>
                {ubicacion.cod_ubicacion} - {formatearUbicacion(ubicacion)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1 kdx-label">
            <FiRepeat size={14} />
            Estado
          </label>
          <select
            className="form-select kdx-control"
            name="estado"
            value={filtros.estado || 'TODAS'}
            onChange={handleInput}
          >
            <option value="TODAS">Todas</option>
            <option value="ACTIVAS">Activas</option>
            <option value="ANULADAS">Anuladas</option>
          </select>
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label mb-1 kdx-label">Referencia</label>
          <input
            type="text"
            className="form-control kdx-control"
            name="referencia"
            value={filtros.referencia}
            onChange={handleInput}
            placeholder="TRF-2026-0001"
            maxLength={200}
          />
        </div>
      </div>
    </form>
  );
};

export default TransferenciasFiltros;
