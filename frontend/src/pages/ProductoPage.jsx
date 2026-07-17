import { useState } from 'react'; // // Estado local
import ProductoForm from '../components/producto/ProductoForm.jsx'; // // Form
import ProductoList from '../components/producto/ProductoList.jsx'; // // Tabla
import ProductoFicha from '../components/producto/ProductoFicha.jsx'; // // HU-09: Ficha modal
import { useProducto } from '../hooks/useProducto.js'; // // Hook
import { useAuth } from '../contexts/AuthContext.jsx'; // // HU-09: Permisos
import { useCategorias } from '../hooks/useCategorias.js'; // // HU-09: Mapa categorías
import { FiDownload, FiPackage, FiPlus } from 'react-icons/fi';

const ProductoPage = () => {
  const { usuario } = useAuth(); // // HU-09: rol del usuario
  const { categorias } = useCategorias(); // // HU-09: categorías para la ficha
  const {
    producto,
    loading,
    saving,
    exportandoPdf,
    buscar,
    setBuscar,
    crear,
    actualizar,
    eliminar,
    cambiarEstado,
    cambiarEstadoMasivo,
    subirImagen,
    eliminarImagenProducto,
    exportarPdf,
  } = useProducto();

  const [selected, setSelected] = useState(null);
  const [fichaProducto, setFichaProducto] = useState(null); // // HU-09: producto para ficha
  const [duplicateSource, setDuplicateSource] = useState(null); // // HU-14: producto base a duplicar
  const [vista, setVista] = useState('listado'); // // listado | formulario

  // HU-09: Mapa de categorías para la ficha
  const categoriasMap = {};
  categorias.forEach(c => { categoriasMap[c.cod_categoria] = c.nombre_categoria; });

  // HU-09: Determinar si el usuario puede editar
  const puedeEditar = ['Administrador', 'Bodeguero', 'Cajero'].includes(usuario?.rol);
  const puedeVerAuditoriaProducto = ['Administrador', 'Super Administrador'].includes(usuario?.rol);
  const puedeVerPrecioCosto = usuario?.rol !== 'Cajero';
  const puedeVerMargen = usuario?.rol === 'Administrador';

  const handleEdit = (p) => {
    setSelected(p);
    setDuplicateSource(null);
    setVista('formulario');
  };

  const handleDuplicate = (p) => {
    setSelected(null);
    setDuplicateSource(p);
    setVista('formulario');
  };

  const handleCancelEdit = () => {
    setSelected(null);
    setDuplicateSource(null);
    setVista('listado');
  };

  const handleSubmit = async (payload) => {
    if (selected) {
      await actualizar(payload);
      setSelected(null);
      setDuplicateSource(null);
      setVista('listado');
    } else {
      const productoCreado = await crear(payload); // // HU-08: retorna producto creado para subir imagen
      setDuplicateSource(null);
      setVista('listado');
      return productoCreado;
    }
  };

  return (
    <div>
      {vista === 'listado' ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
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

            <div className="d-flex gap-2">
              <button
                type="button"
                className="jyr-btn jyr-btn-primary"
                onClick={() => exportarPdf({ buscar })}
                disabled={exportandoPdf || loading}
              >
                {exportandoPdf ? <span className="spinner-border spinner-border-sm me-2" /> : <FiDownload className="me-2" />}
                Exportar PDF
              </button>

              {puedeEditar && (
                <button
                  type="button"
                  className="jyr-btn jyr-btn-primary"
                  onClick={() => { setSelected(null); setDuplicateSource(null); setVista('formulario'); }}
                >
                  <FiPlus className="me-2" />Nuevo Producto
                </button>
              )}
            </div>
          </div>

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
              busqueda={buscar}
              onBusquedaChange={setBuscar}
              onEdit={handleEdit}
              onDelete={eliminar}
              onCambiarEstado={cambiarEstado}
              onCambiarEstadoMasivo={cambiarEstadoMasivo}
              onSubirImagen={subirImagen}
              onEliminarImagen={eliminarImagenProducto}
              onDuplicate={handleDuplicate}
              onVerFicha={(p) => setFichaProducto(p)}
              mostrarMargen={puedeVerMargen}
            />
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="jyr-btn jyr-btn-primary mb-3"
            onClick={handleCancelEdit}
          >
            Volver
          </button>

          <h3 className="mb-4">
            {selected ? 'Editar Producto' : duplicateSource ? 'Duplicar Producto' : 'Nuevo Producto'}
          </h3>

          <ProductoForm
            saving={saving}
            onSubmit={handleSubmit}
            selected={selected}
            duplicateFrom={duplicateSource}
            onCancelEdit={handleCancelEdit}
            onSubirImagen={subirImagen}
            mostrarPrecioCosto={puedeVerPrecioCosto}
            mostrarMargen={puedeVerMargen}
          />
        </>
      )}

      {/* HU-09: Modal Ficha de Producto */}
      {vista === 'listado' && fichaProducto && (
        <ProductoFicha
          producto={fichaProducto}
          onClose={() => setFichaProducto(null)}
          onEdit={puedeEditar ? (p) => { setFichaProducto(null); handleEdit(p); } : undefined}
          mostrarAuditoria={puedeVerAuditoriaProducto}
          categoriasMap={categoriasMap}
          mostrarMargen={puedeVerMargen}
        />
      )}
    </div>
  );
};

export default ProductoPage;
