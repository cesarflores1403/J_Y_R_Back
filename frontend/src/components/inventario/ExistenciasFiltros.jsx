import React from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';

const ExistenciasFiltros = ({
  filtros,
  loading,
  onChange,
  onAplicar,
  onLimpiar
}) => {
  // // Handler unico para inputs del filtro
  const handleInput = (event) => {
    // // Notificamos al contenedor el campo y su nuevo valor
    onChange(event.target.name, event.target.value);
  };

  return (
    <div className="jyr-card mb-3">
      <div className="jyr-card-body">
        <form
          // // Aplicar filtros al enviar formulario
          onSubmit={(event) => {
            event.preventDefault();
            onAplicar();
          }}
        >
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Cod. Producto</label>
              <input
                // // Filtro exacto por id de producto
                type="number"
                min="1"
                className="form-control"
                name="cod_producto"
                value={filtros.cod_producto}
                onChange={handleInput}
                placeholder="Ej: 23"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Producto</label>
              <input
                // // Filtro por nombre/codigo textual de producto
                type="text"
                className="form-control"
                name="producto"
                value={filtros.producto}
                onChange={handleInput}
                placeholder="Nombre o código"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Cod. Ubicación</label>
              <input
                // // Filtro exacto por id de ubicacion
                type="number"
                min="1"
                className="form-control"
                name="cod_ubicacion"
                value={filtros.cod_ubicacion}
                onChange={handleInput}
                placeholder="Ej: 1"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Ubicación</label>
              <input
                // // Filtro por qr o detalle de ubicacion
                type="text"
                className="form-control"
                name="ubicacion"
                value={filtros.ubicacion}
                onChange={handleInput}
                placeholder="QR, pasillo, nivel"
              />
            </div>
          </div>

          <div className="row g-2 mt-2">
            <div className="col-12 col-md-2">
              <label className="form-label mb-1">Página</label>
              <input
                // // Pagina solicitada
                type="number"
                min="1"
                className="form-control"
                name="pagina"
                value={filtros.pagina}
                onChange={handleInput}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label mb-1">Límite</label>
              <input
                // // Tamaño de pagina para paginacion backend
                type="number"
                min="1"
                max="100"
                className="form-control"
                name="limite"
                value={filtros.limite}
                onChange={handleInput}
              />
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end">
              <div className="form-check form-switch">
                <input
                  // // Permite incluir inactivos cuando se requiera
                  className="form-check-input"
                  type="checkbox"
                  id="includeInactive"
                  checked={Boolean(filtros.includeInactive)}
                  onChange={(event) => onChange('includeInactive', event.target.checked)}
                />
                <label className="form-check-label" htmlFor="includeInactive">
                  Incluir inactivos
                </label>
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex justify-content-md-end align-items-end gap-2">
              <button
                // // Boton para limpiar todos los filtros
                type="button"
                className="btn btn-outline-secondary"
                onClick={onLimpiar}
                disabled={loading}
              >
                <FiRefreshCw className="me-1" />
                Limpiar
              </button>
              <button
                // // Boton de aplicar filtros al listado
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
      </div>
    </div>
  );
};

export default ExistenciasFiltros;
