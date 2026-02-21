import { FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

// Mapa de badges por estado
const estadoBadge = {
  Activo: { className: 'jyr-badge jyr-badge-success', label: 'Activo' },
  Inactivo: { className: 'jyr-badge jyr-badge-danger', label: 'Inactivo' },
  Descontinuado: { className: 'jyr-badge jyr-badge-warning', label: 'Descontinuado' },
};

const ProductoList = ({ productos = [], onEdit, onDelete, onCambiarEstado }) => {
  const handleDelete = (p) => {
    const ok = window.confirm(
      `¿Eliminar el producto ${p.cod_producto} - ${p.nombre_producto}?`
    );
    if (!ok) return;
    if (onDelete) onDelete({ cod_producto: p.cod_producto });
  };

  const handleEstadoChange = (p, nuevoEstado) => {
    if (nuevoEstado === p.estado_producto) return;

    const mensajes = {
      Inactivo: `¿Inactivar "${p.nombre_producto}"? Ya no estará disponible para venta.`,
      Descontinuado: `¿Marcar "${p.nombre_producto}" como descontinuado? No se podrá vender.`,
      Activo: `¿Reactivar "${p.nombre_producto}"? Volverá a estar disponible para venta.`,
    };

    const ok = window.confirm(mensajes[nuevoEstado] || `¿Cambiar estado a "${nuevoEstado}"?`);
    if (!ok) return;
    if (onCambiarEstado) onCambiarEstado(p.cod_producto, nuevoEstado);
  };

  // Normalizar estado (compatibilidad con boolean legacy)
  const getEstado = (p) => {
    if (typeof p.estado_producto === 'boolean') return p.estado_producto ? 'Activo' : 'Inactivo';
    return p.estado_producto || 'Activo';
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
              productos.map((p) => {
                const estado = getEstado(p);
                const badge = estadoBadge[estado] || estadoBadge.Activo;

                return (
                <tr key={p.cod_producto} style={estado !== 'Activo' ? { opacity: 0.7 } : {}}>
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
                    <select
                      className="jyr-form-control jyr-form-select"
                      value={estado}
                      onChange={(e) => handleEstadoChange(p, e.target.value)}
                      style={{
                        fontSize: 12, padding: '4px 8px', width: 'auto',
                        fontWeight: 600, minWidth: 130,
                        color: estado === 'Activo' ? 'var(--jyr-success, #16a34a)'
                          : estado === 'Descontinuado' ? 'var(--jyr-warning, #d97706)'
                          : 'var(--jyr-danger, #dc2626)',
                        borderColor: estado === 'Activo' ? 'var(--jyr-success, #16a34a)'
                          : estado === 'Descontinuado' ? 'var(--jyr-warning, #d97706)'
                          : 'var(--jyr-danger, #dc2626)'
                      }}
                    >
                      <option value="Activo">✅ Activo</option>
                      <option value="Inactivo">🚫 Inactivo</option>
                      <option value="Descontinuado">⚠️ Descontinuado</option>
                    </select>
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
                );
              })
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