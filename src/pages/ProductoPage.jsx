import { useState } from 'react'; // // Estado local
import Alert from '../components/common/Alert.jsx'; // // Alert
import ProductoForm from '../components/producto/ProductoForm.jsx'; // // Form
import ProductoList from '../components/producto/ProductoList.jsx'; // // Tabla
import { useProducto } from '../hooks/useProducto.js'; // // Hook

const ProductoPage = () => {
  const {
    producto,
    loading,
    saving,
    error,
    success,
    setError,
    setSuccess,
    crear,
    actualizar,
    eliminar,
  } = useProducto();

  const [selected, setSelected] = useState(null); // // Producto seleccionado para editar

  const handleEdit = (p) => {
    setSelected(p); // // Carga en el form
  };

  const handleCancelEdit = () => {
    setSelected(null); // // Limpia selección
  };

  const handleSubmit = async (payload) => {
    // // Si hay seleccionado => update, si no => create
    if (selected) {
      await actualizar(payload); // // PUT (sincronizado con BE)
      setSelected(null); // // Limpia
    } else {
      await crear(payload); // // POST
    }
  };

  return (
    <div className="container py-3">
      <h2 className="mb-3">Productos</h2>

      <Alert type="success" message={success} onClose={() => setSuccess('')} />
      <Alert type="danger" message={error} onClose={() => setError('')} />

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <ProductoForm
            saving={saving} // // Loading submit
            onSubmit={handleSubmit} // // Create/Update centralizado
            selected={selected} // // Para precargar form
            onCancelEdit={handleCancelEdit} // // Cancelar edición
          />
        </div>

        <div className="col-12 col-lg-7">
          {loading ? (
            <div className="alert alert-info">Cargando lista...</div>
          ) : (
            <ProductoList
              productos={producto} // // Data
              onEdit={handleEdit} // // Editar
              onDelete={eliminar} // // Eliminar (sincronizado: { cod_producto })
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductoPage;
