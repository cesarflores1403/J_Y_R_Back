import React from 'react';

const BootstrapPagination = ({
  pagina = 1,
  totalPaginas = 1,
  onChange,
  loading = false,
  className = 'mt-3'
}) => {
  const paginaActual = Number(pagina || 1);
  const total = Math.max(1, Number(totalPaginas || 1));

  if (total <= 1) return null;

  const irPagina = (nuevaPagina) => {
    if (loading) return;
    if (nuevaPagina < 1 || nuevaPagina > total) return;
    if (nuevaPagina === paginaActual) return;
    onChange?.(nuevaPagina);
  };

  return (
    <div className={`d-flex justify-content-center align-items-center gap-3 ${className}`}>
      <nav aria-label="Paginacion">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${loading || paginaActual <= 1 ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              disabled={loading || paginaActual <= 1}
              onClick={() => irPagina(paginaActual - 1)}
            >
              Anterior
            </button>
          </li>

          {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
            <li key={item} className={`page-item ${paginaActual === item ? 'active' : ''}`}>
              <button
                type="button"
                className="page-link"
                disabled={loading}
                onClick={() => irPagina(item)}
              >
                {item}
              </button>
            </li>
          ))}

          <li className={`page-item ${loading || paginaActual >= total ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              disabled={loading || paginaActual >= total}
              onClick={() => irPagina(paginaActual + 1)}
            >
              Siguiente
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default BootstrapPagination;
