import { FiX, FiEdit2, FiPackage, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

// =====================================================
// HU-09: Ficha completa del producto (modal)
// Muestra imagen + datos clave del producto
// =====================================================

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

const ProductoFicha = ({ producto, onClose, onEdit, categoriasMap = {} }) => {
  if (!producto) return null;

  const codigo = producto.codigo_producto || `PROD-${String(producto.cod_producto).padStart(4, '0')}`;
  const estado = typeof producto.estado_producto === 'boolean'
    ? (producto.estado_producto ? 'Activo' : 'Inactivo')
    : (producto.estado_producto || 'Activo');

  const estadoColor = estado === 'Activo' ? 'var(--jyr-success, #16a34a)'
    : estado === 'Descontinuado' ? 'var(--jyr-warning, #d97706)'
    : 'var(--jyr-danger, #dc2626)';

  const EstadoIcono = estado === 'Activo'
    ? FiCheckCircle
    : estado === 'Descontinuado'
      ? FiAlertTriangle
      : FiXCircle;

  const categoria = categoriasMap[producto.cod_categoria] || `Categoría ${producto.cod_categoria}`;

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 600,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'var(--jyr-red)', color: '#fff',
          padding: '16px 20px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiPackage size={20} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Ficha del Producto</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: '#fff', borderRadius: '50%',
              width: 32, height: 32, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Imagen */}
          <div style={{
            flex: '0 0 auto', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 8
          }}>
            {producto.imagen_url ? (
              <img
                src={`${API_URL}${producto.imagen_url}`}
                alt={producto.nombre_producto}
                style={{
                  width: 180, height: 180, objectFit: 'contain',
                  borderRadius: 8, border: '2px solid var(--jyr-gray-200)',
                  background: '#fafafa'
                }}
              />
            ) : (
              <div style={{
                width: 180, height: 180, borderRadius: 8,
                border: '2px dashed var(--jyr-gray-300)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--jyr-gray-400)', background: '#fafafa'
              }}>
                <FiPackage size={40} />
                <span style={{ fontSize: 12, marginTop: 6 }}>Sin imagen</span>
              </div>
            )}
            {/* Código debajo de la imagen */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700,
              fontSize: 15, color: 'var(--jyr-red)',
              background: 'var(--jyr-red-light, #fef2f2)',
              padding: '4px 12px', borderRadius: 6
            }}>
              {codigo}
            </span>
          </div>

          {/* Datos */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--jyr-gray-800)' }}>
              {producto.nombre_producto}
            </h4>

            <div style={{
              marginTop: 16, display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: '12px 20px'
            }}>
              {/* Categoría */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Categoría
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--jyr-gray-700)' }}>
                  {categoria}
                </p>
              </div>

              {/* Unidad */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Unidad de medida
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--jyr-gray-700)' }}>
                  {producto.unidad_medida}
                </p>
              </div>

              {/* Precio */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Precio de venta
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--jyr-gray-800)' }}>
                  L. {Number(producto.precio_venta).toFixed(2)}
                </p>
              </div>

              {/* ISV */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  ISV
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--jyr-warning, #d97706)' }}>
                  {producto.isv_descripcion || 'Sin ISV'} ({producto.isv_porcentaje ?? 0}%)
                </p>
              </div>

              {/* Estado */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Estado
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: estadoColor }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <EstadoIcono size={14} /> {estado}
                  </span>
                </p>
              </div>

              {/* Código interno */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Código interno
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--jyr-gray-700)' }}>
                  {producto.cod_producto}
                </p>
              </div>

              {/* HU-10: Ubicación en bodega */}
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                  Ubicación en bodega
                </span>
                {producto.cod_ubicacion ? (
                  <div style={{ margin: '4px 0 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--jyr-info-bg, #eff6ff)', color: 'var(--jyr-info, #2563eb)',
                      padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600
                    }}>
                      Pasillo {producto.ubi_pasillo}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#f0fdf4', color: '#16a34a',
                      padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600
                    }}>
                      Estantería {producto.ubi_estanteria}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#fefce8', color: '#ca8a04',
                      padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600
                    }}>
                      Nivel {producto.ubi_nivel_1}
                    </span>
                    {producto.ubi_nivel_2 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#fdf2f8', color: '#db2777',
                        padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600
                      }}>
                        Nivel 2: {producto.ubi_nivel_2}
                      </span>
                    )}
                    {producto.ubi_codigo_qr && (
                      <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)', alignSelf: 'center' }}>
                        QR: {producto.ubi_codigo_qr}
                      </span>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--jyr-gray-400)', fontStyle: 'italic' }}>
                    Sin ubicación asignada
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--jyr-gray-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          background: 'var(--jyr-gray-50, #f9fafb)'
        }}>
          {onEdit && (
            <button
              className="jyr-btn jyr-btn-sm jyr-btn-primary"
              onClick={() => { onEdit(producto); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiEdit2 size={14} /> Editar producto
            </button>
          )}
          <button
            className="jyr-btn jyr-btn-sm jyr-btn-outline"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductoFicha;
