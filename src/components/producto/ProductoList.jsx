const ProductoList = ({ productos = [], onEdit, onDelete }) => {
  const handleDelete = (p) => {
    // // Confirmación PRO (evita borrados accidentales)
    const ok = window.confirm(
      `¿Eliminar el producto ${p.cod_producto} - ${p.nombre_producto}?`
    );
    if (!ok) return;

    // // Sincronizado con BE: DELETE /api/producto con body { cod_producto }
    if (onDelete) onDelete({ cod_producto: p.cod_producto });
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>Listado de Productos</span>
        <span className="badge bg-secondary">{productos.length} registros</span>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>cod_producto</th>
              <th>cod_categoria</th>
              <th>nombre</th>
              <th>unidad</th>
              <th>precio</th>
              <th>isv</th>
              <th>estado</th>
              <th className="text-center">acciones</th>
            </tr>
          </thead>

          <tbody>
            {productos.length > 0 ? (
              productos.map((p) => (
                <tr key={p.cod_producto}>
                  <td>{p.cod_producto}</td>
                  <td>{p.cod_categoria}</td>
                  <td>{p.nombre_producto}</td>
                  <td>{p.unidad_medida}</td>
                  <td>L. {p.precio_venta}</td>
                  <td>{p.isv}</td>
                  <td>
                    {p.estado_producto ? (
                      <span className="badge bg-success">Activo</span>
                    ) : (
                      <span className="badge bg-danger">Inactivo</span>
                    )}
                  </td>

                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => onEdit && onEdit(p)}
                    >
                      Editar
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(p)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
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

export default ProductoList; // ✅ MUY IMPORTANTE