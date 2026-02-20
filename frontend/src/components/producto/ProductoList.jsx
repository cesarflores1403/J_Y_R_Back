import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const ProductoList = ({ productos = [], onEdit, onDelete }) => {
  const handleDelete = (p) => {
    const ok = window.confirm(
      `¿Eliminar el producto ${p.cod_producto} - ${p.nombre_producto}?`
    );
    if (!ok) return;
    if (onDelete) onDelete({ cod_producto: p.cod_producto });
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-header">
        <h3>📦 Listado de Productos</h3>
        <span className="jyr-badge jyr-badge-dark">{productos.length} registros</span>
      </div>

      <div className="jyr-table-wrapper">
        <table className="jyr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Categoría</th>
              <th>Nombre</th>
              <th>Unidad</th>
              <th>Precio</th>
              <th>ISV</th>
              <th>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productos.length > 0 ? (
              productos.map((p) => (
                <tr key={p.cod_producto}>
                  <td><strong>{p.cod_producto}</strong></td>
                  <td>
                    <span className="jyr-badge jyr-badge-info">
                      {Number(p.cod_categoria) === 1 ? 'Lubricantes' : 'Repuestos'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.nombre_producto}</td>
                  <td>{p.unidad_medida}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    L. {Number(p.precio_venta).toFixed(2)}
                  </td>
                  <td>
                    <span className="jyr-badge jyr-badge-warning">
                      {p.isv_descripcion} ({p.isv_porcentaje}%)
                    </span>
                  </td>
                  <td>
                    {p.estado_producto ? (
                      <span className="jyr-badge jyr-badge-success">Activo</span>
                    ) : (
                      <span className="jyr-badge jyr-badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="jyr-btn jyr-btn-sm jyr-btn-outline"
                      style={{ marginRight: 6 }}
                      onClick={() => onEdit && onEdit(p)}
                      title="Editar"
                    >
                      <FiEdit2 size={14} /> Editar
                    </button>
                    <button
                      className="jyr-btn jyr-btn-sm jyr-btn-outline-red"
                      onClick={() => handleDelete(p)}
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} /> Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--jyr-gray-400)' }}>
                  No hay productos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductoList;