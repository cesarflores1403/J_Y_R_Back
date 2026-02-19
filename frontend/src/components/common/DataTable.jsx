import React from 'react';

const DataTable = ({ columns, data, loading, emptyMessage = 'No hay datos disponibles', emptyIcon = '📋' }) => {
  if (loading) {
    return <div className="jyr-spinner" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="jyr-empty">
        <div className="jyr-empty-icon">{emptyIcon}</div>
        <h4>{emptyMessage}</h4>
      </div>
    );
  }

  return (
    <div className="jyr-table-wrapper">
      <table className="jyr-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={col.style}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row.id || rowIdx}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} style={col.cellStyle}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
