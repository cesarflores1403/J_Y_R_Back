import { useState } from 'react'; // // Estado local
import Alert from '../components/common/Alert.jsx'; // // Alert
import ProductoForm from '../components/producto/ProductoForm.jsx'; // // Form
import ProductoList from '../components/producto/ProductoList.jsx'; // // Tabla
import { useProducto } from '../hooks/useProducto.js'; // // Hook
import { FiPackage } from 'react-icons/fi';

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

  const [selected, setSelected] = useState(null);

  const handleEdit = (p) => setSelected(p);
  const handleCancelEdit = () => setSelected(null);

  const handleSubmit = async (payload) => {
    if (selected) {
      await actualizar(payload);
      setSelected(null);
    } else {
      await crear(payload);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'var(--jyr-red)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-red)'
        }}>
          <FiPackage size={24} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700 }}>Productos</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--jyr-gray-500)' }}>
            Gestión del catálogo de productos e ISV
          </p>
        </div>
      </div>

      <Alert type="success" message={success} onClose={() => setSuccess('')} />
      <Alert type="danger" message={error} onClose={() => setError('')} />

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <ProductoForm
            saving={saving}
            onSubmit={handleSubmit}
            selected={selected}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        <div className="col-12 col-lg-7">
          {loading ? (
            <div className="jyr-card">
              <div className="jyr-card-body text-center py-5">
                <div className="jyr-spinner" />
                <p style={{ marginTop: 12, color: 'var(--jyr-gray-500)' }}>Cargando productos...</p>
              </div>
            </div>
          ) : (
            <ProductoList
              productos={producto}
              onEdit={handleEdit}
              onDelete={eliminar}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductoPage;
