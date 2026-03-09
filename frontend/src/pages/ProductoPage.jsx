import { useState } from 'react'; // // Estado local
import Alert from '../components/common/Alert.jsx'; // // Alert
import ProductoForm from '../components/producto/ProductoForm.jsx'; // // Form
import ProductoList from '../components/producto/ProductoList.jsx'; // // Tabla
import ProductoFicha from '../components/producto/ProductoFicha.jsx'; // // HU-09: Ficha modal
import ImportarProductos from '../components/producto/ImportarProductos.jsx'; // // HU-12: Importar
import { useProducto } from '../hooks/useProducto.js'; // // Hook
import { useAuth } from '../contexts/AuthContext.jsx'; // // HU-09: Permisos
import { useCategorias } from '../hooks/useCategorias.js'; // // HU-09: Mapa categorías
import { FiPackage } from 'react-icons/fi';

const ProductoPage = () => {
  const { usuario } = useAuth(); // // HU-09: rol del usuario
  const { categorias } = useCategorias(); // // HU-09: categorías para la ficha
  const {
    producto,
    loading,
    saving,
    error,
    success,
    setError,
    setSuccess,
    cargar,
    crear,
    actualizar,
    eliminar,
    cambiarEstado,
    subirImagen,
    eliminarImagenProducto,
  } = useProducto();

  const [selected, setSelected] = useState(null);
  const [fichaProducto, setFichaProducto] = useState(null); // // HU-09: producto para ficha

  // HU-09: Mapa de categorías para la ficha
  const categoriasMap = {};
  categorias.forEach(c => { categoriasMap[c.cod_categoria] = c.nombre_categoria; });

  // HU-09: Determinar si el usuario puede editar
  const puedeEditar = ['Administrador', 'Bodeguero', 'Cajero'].includes(usuario?.rol);

  const handleEdit = (p) => setSelected(p);
  const handleCancelEdit = () => setSelected(null);

  const handleSubmit = async (payload) => {
    if (selected) {
      await actualizar(payload);
      setSelected(null);
    } else {
      return await crear(payload); // // HU-08: retorna producto creado para subir imagen
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
        <div className="col-12">
          <ProductoForm
            saving={saving}
            onSubmit={handleSubmit}
            selected={selected}
            onCancelEdit={handleCancelEdit}
            onSubirImagen={subirImagen}
          />
        </div>

        {/* HU-12: Importar productos (solo Administrador) */}
        {usuario?.rol === 'Administrador' && (
          <div className="col-12">
            <ImportarProductos onImportSuccess={cargar} />
          </div>
        )}

        <div className="col-12">
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
              onCambiarEstado={cambiarEstado}
              onSubirImagen={subirImagen}
              onEliminarImagen={eliminarImagenProducto}
              onVerFicha={(p) => setFichaProducto(p)}
            />
          )}
        </div>
      </div>

      {/* HU-09: Modal Ficha de Producto */}
      {fichaProducto && (
        <ProductoFicha
          producto={fichaProducto}
          onClose={() => setFichaProducto(null)}
          onEdit={puedeEditar ? (p) => { setFichaProducto(null); handleEdit(p); } : undefined}
          categoriasMap={categoriasMap}
        />
      )}
    </div>
  );
};

export default ProductoPage;
