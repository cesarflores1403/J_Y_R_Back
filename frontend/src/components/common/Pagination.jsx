import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = ({ pagina, totalPaginas, onChange }) => {
  if (totalPaginas <= 1) return null;

  const pages = [];
  const start = Math.max(1, pagina - 2);
  const end = Math.min(totalPaginas, pagina + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="jyr-pagination">
      <button disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        <FiChevronLeft />
      </button>
      {start > 1 && <button onClick={() => onChange(1)}>1</button>}
      {start > 2 && <button disabled>...</button>}
      {pages.map(p => (
        <button key={p} className={p === pagina ? 'active' : ''} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      {end < totalPaginas - 1 && <button disabled>...</button>}
      {end < totalPaginas && <button onClick={() => onChange(totalPaginas)}>{totalPaginas}</button>}
      <button disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        <FiChevronRight />
      </button>
    </div>
  );
};

export default Pagination;
