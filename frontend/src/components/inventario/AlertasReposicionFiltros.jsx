import React from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';

const AlertasReposicionFiltros = ({
  filtros,
  loading,
  onChange,
  onAplicar,
  onLimpiar
}) => {
  // // Handler unificado para los inputs de filtros
  const handleInput = (event) => {
    onChange(event.target.name, event.target.value);
  };

  return (
    <div className="jyr-card mb-3">
      <div className="jyr-card-body">
        <form
          // // Aplicamos filtros al enviar formulario
          onSubmit={(event) => {
            event.preventDefault();
            onAplicar();
          }}
        >
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Cod. Producto</label>
              <input
                // // Filtro exacto por identificador de producto
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
                // // Filtro por nombre o codigo de producto
                type="text"
                className="form-control"
                name="producto"
                value={filtros.producto}
                onChange={handleInput}
                placeholder="Nombre o codigo"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Cod. Ubicacion</label>
              <input
                // // Filtro exacto por identificador de ubicacion
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
              <label className="form-label mb-1">Ubicacion</label>
              <input
                // // Filtro textual por qr/pasillo/nivel
                type="text"
                className="form-control"
                name="ubicacion"
                value={filtros.ubicacion}
                onChange={handleInput}
                placeholder="Codigo producto, pasillo, nivel"
              />
            </div>
          </div>

          <div className="row g-2 mt-2">
            <div className="col-12 col-md-2">
              <label className="form-label mb-1">Pagina</label>
              <input
                // // Numero de pagina solicitado
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
                // // Tamano de pagina para consulta backend
                type="number"
                min="1"
                max="100"
                className="form-control"
                name="limite"
                value={filtros.limite}
                onChange={handleInput}
              />
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end gap-3">
              <div className="form-check form-switch">
                <input
                  // // Permite incluir productos inactivos en alertas
                  className="form-check-input"
                  type="checkbox"
                  id="alertasIncludeInactive"
                  checked={Boolean(filtros.includeInactive)}
                  onChange={(event) => onChange('includeInactive', event.target.checked)}
                />
                <label className="form-check-label" htmlFor="alertasIncludeInactive">
                  Incluir inactivos
                </label>
              </div>
              <div className="form-check form-switch">
                <input
                  // // Filtra solo alertas criticas (sin stock disponible)
                  className="form-check-input"
                  type="checkbox"
                  id="alertasSoloCriticos"
                  checked={Boolean(filtros.solo_criticos)}
                  onChange={(event) => onChange('solo_criticos', event.target.checked)}
                />
                <label className="form-check-label" htmlFor="alertasSoloCriticos">
                  Solo criticos
                </label>
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex justify-content-md-end align-items-end gap-2">
              <button
                // // Limpia filtros y vuelve al estado base
                type="button"
                className="btn btn-outline-secondary"
                onClick={onLimpiar}
                disabled={loading}
              >
                <FiRefreshCw className="me-1" />
                Limpiar
              </button>
              <button
                // // Ejecuta consulta de alertas con filtros activos
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

export default AlertasReposicionFiltros;
