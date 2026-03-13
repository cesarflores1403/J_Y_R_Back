import React from 'react';
import { FiFilter, FiRefreshCw, FiSliders } from 'react-icons/fi';

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

  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.2
  };

  const controlStyle = {
    minHeight: 44,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)'
  };

  return (
    <div className="jyr-card mb-3">
      <div className="jyr-card-body p-3 p-md-4">
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FiSliders size={14} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Filtros de existencias</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Busca por producto, ubicacion y estado.</div>
          </div>
        </div>

        <form
          // // Aplicar filtros al enviar formulario
          onSubmit={(event) => {
            event.preventDefault();
            onAplicar();
          }}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 14,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label" style={labelStyle}>Codigo Producto</label>
              <input
                // // Filtro por codigo visual (PROD-0001) o id numerico (1)
                type="text"
                className="form-control"
                style={controlStyle}
                name="cod_producto"
                value={filtros.cod_producto}
                onChange={handleInput}
                placeholder="Ej: PROD-0023 o 23"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" style={labelStyle}>Producto</label>
              <input
                // // Filtro por nombre/codigo textual de producto
                type="text"
                className="form-control"
                style={controlStyle}
                name="producto"
                value={filtros.producto}
                onChange={handleInput}
                placeholder="Nombre o codigo"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" style={labelStyle}>Cod. Ubicacion</label>
              <input
                // // Filtro exacto por id de ubicacion
                type="number"
                min="1"
                className="form-control"
                style={controlStyle}
                name="cod_ubicacion"
                value={filtros.cod_ubicacion}
                onChange={handleInput}
                placeholder="Ej: 1"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" style={labelStyle}>Ubicacion</label>
              <input
                // // Filtro por qr o detalle de ubicacion
                type="text"
                className="form-control"
                style={controlStyle}
                name="ubicacion"
                value={filtros.ubicacion}
                onChange={handleInput}
                placeholder="QR, pasillo, nivel"
              />
            </div>
          </div>

          <div className="row g-3 mt-1 align-items-end">
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label" style={labelStyle}>Pagina</label>
              <input
                // // Pagina solicitada
                type="number"
                min="1"
                className="form-control"
                style={controlStyle}
                name="pagina"
                value={filtros.pagina}
                onChange={handleInput}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label" style={labelStyle}>Limite (de 10 en 10)</label>
              <select
                // // Tamano de pagina en bloques de 10 para mantener consistencia visual
                className="form-select"
                style={controlStyle}
                name="limite"
                value={String(filtros.limite)}
                onChange={handleInput}
              >
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end">
              <div
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <input
                  // // Permite incluir inactivos cuando se requiera
                  className="form-check-input"
                  type="checkbox"
                  id="includeInactive"
                  checked={Boolean(filtros.includeInactive)}
                  onChange={(event) => onChange('includeInactive', event.target.checked)}
                  style={{ margin: 0, width: '2.2em', height: '1.2em' }}
                />
                <label className="form-check-label mb-0" htmlFor="includeInactive" style={{ fontWeight: 600, color: '#334155' }}>
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
                style={{
                  minHeight: 44,
                  minWidth: 118,
                  borderRadius: 12,
                  borderColor: '#94a3b8',
                  color: '#475569',
                  fontWeight: 700
                }}
              >
                <FiRefreshCw className="me-1" />
                Limpiar
              </button>
              <button
                // // Boton de aplicar filtros al listado
                type="submit"
                className="btn jyr-btn-primary"
                disabled={loading}
                style={{
                  minHeight: 44,
                  minWidth: 118,
                  borderRadius: 12,
                  fontWeight: 700
                }}
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
