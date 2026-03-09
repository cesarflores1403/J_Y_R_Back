import { useState, useMemo, useRef } from 'react';
import { FiEdit2, FiTrash2, FiSearch, FiChevronUp, FiChevronDown, FiFilter, FiCamera, FiX, FiEye } from 'react-icons/fi';
import Pagination from '../common/Pagination.jsx';
import { useCategorias } from '../../hooks/useCategorias.js'; // // HU-07: Categorías dinámicas

// =====================================================
// HU-06: Listado con búsqueda, filtros, paginación y ordenamiento
// =====================================================

const ITEMS_PER_PAGE = 6;

// Mapa de badges por estado
const estadoBadge = {
  Activo: { className: 'jyr-badge jyr-badge-success', label: 'Activo' },
  Inactivo: { className: 'jyr-badge jyr-badge-danger', label: 'Inactivo' },
  Descontinuado: { className: 'jyr-badge jyr-badge-warning', label: 'Descontinuado' },
};

const ProductoList = ({ productos = [], onEdit, onDelete, onCambiarEstado, onSubirImagen, onEliminarImagen, onVerFicha }) => {
  // HU-07: Categorías dinámicas desde BD
  const { categorias } = useCategorias();
  const fileInputRef = useRef(null); // // HU-08: ref para input file oculto
  const [uploadTarget, setUploadTarget] = useState(null); // // HU-08: producto al que se le sube imagen
  const [hoverImg, setHoverImg] = useState(null); // // HU-08: hover preview { src, x, y }

  // Mapa de categorías para lookup rápido
  const categoriasMap = useMemo(() => {
    const map = {};
    categorias.forEach(c => { map[c.cod_categoria] = c.nombre_categoria; });
    return map;
  }, [categorias]);

  // =====================================================
  // ESTADOS: búsqueda, filtros, ordenamiento, paginación
  // =====================================================
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('cod_producto');
  const [ordenDir, setOrdenDir] = useState('asc');
  const [pagina, setPagina] = useState(1);

  // Normalizar estado (compatibilidad con boolean legacy)
  const getEstado = (p) => {
    if (typeof p.estado_producto === 'boolean') return p.estado_producto ? 'Activo' : 'Inactivo';
    return p.estado_producto || 'Activo';
  };

  // =====================================================
  // 1. FILTRAR: búsqueda + categoría + estado
  // =====================================================
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return productos.filter((p) => {
      // Búsqueda por código o nombre
      if (q) {
        const codigo = (p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`).toLowerCase();
        const nombre = (p.nombre_producto || '').toLowerCase();
        const codNum = String(p.cod_producto);
        if (!codigo.includes(q) && !nombre.includes(q) && !codNum.includes(q)) {
          return false;
        }
      }

      // Filtro por categoría
      if (filtroCategoria && Number(p.cod_categoria) !== Number(filtroCategoria)) {
        return false;
      }

      // Filtro por estado
      if (filtroEstado && getEstado(p) !== filtroEstado) {
        return false;
      }

      return true;
    });
  }, [productos, busqueda, filtroCategoria, filtroEstado]);

  // =====================================================
  // 2. ORDENAR
  // =====================================================
  const productosOrdenados = useMemo(() => {
    const sorted = [...productosFiltrados].sort((a, b) => {
      let valA, valB;

      switch (ordenarPor) {
        case 'cod_producto':
          valA = Number(a.cod_producto);
          valB = Number(b.cod_producto);
          break;
        case 'nombre_producto':
          valA = (a.nombre_producto || '').toLowerCase();
          valB = (b.nombre_producto || '').toLowerCase();
          return ordenDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'precio_venta':
          valA = Number(a.precio_venta);
          valB = Number(b.precio_venta);
          break;
        case 'estado_producto':
          valA = getEstado(a);
          valB = getEstado(b);
          return ordenDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default:
          valA = Number(a.cod_producto);
          valB = Number(b.cod_producto);
      }

      return ordenDir === 'asc' ? valA - valB : valB - valA;
    });

    return sorted;
  }, [productosFiltrados, ordenarPor, ordenDir]);

  // =====================================================
  // 3. PAGINAR
  // =====================================================
  const totalPaginas = Math.ceil(productosOrdenados.length / ITEMS_PER_PAGE);
  const productosPagina = useMemo(() => {
    const start = (pagina - 1) * ITEMS_PER_PAGE;
    return productosOrdenados.slice(start, start + ITEMS_PER_PAGE);
  }, [productosOrdenados, pagina]);

  // Reset página al cambiar filtros/búsqueda
  const handleBusqueda = (val) => {
    setBusqueda(val);
    setPagina(1);
  };
  const handleFiltroCategoria = (val) => {
    setFiltroCategoria(val);
    setPagina(1);
  };
  const handleFiltroEstado = (val) => {
    setFiltroEstado(val);
    setPagina(1);
  };

  // =====================================================
  // ORDENAMIENTO: clic en cabecera de columna
  // =====================================================
  const handleSort = (campo) => {
    if (ordenarPor === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setOrdenDir('asc');
    }
    setPagina(1);
  };

  const SortIcon = ({ campo }) => {
    if (ordenarPor !== campo) return null;
    return ordenDir === 'asc'
      ? <FiChevronUp size={12} style={{ marginLeft: 4 }} />
      : <FiChevronDown size={12} style={{ marginLeft: 4 }} />;
  };

  // Limpiar filtros
  const hayFiltros = busqueda || filtroCategoria || filtroEstado;
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('');
    setFiltroEstado('');
    setPagina(1);
  };

  const handleDelete = (p) => {
    const codigo = p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`;
    const ok = window.confirm(`¿Eliminar el producto ${codigo} - ${p.nombre_producto}?`);
    if (!ok) return;
    if (onDelete) onDelete({ cod_producto: p.cod_producto });
  };

  const handleEstadoChange = (p, nuevoEstado) => {
    if (nuevoEstado === getEstado(p)) return;
    const mensajes = {
      Inactivo: `¿Inactivar "${p.nombre_producto}"? Ya no estará disponible para venta.`,
      Descontinuado: `¿Marcar "${p.nombre_producto}" como descontinuado? No se podrá vender.`,
      Activo: `¿Reactivar "${p.nombre_producto}"? Volverá a estar disponible para venta.`,
    };
    const ok = window.confirm(mensajes[nuevoEstado] || `¿Cambiar estado a "${nuevoEstado}"?`);
    if (!ok) return;
    if (onCambiarEstado) onCambiarEstado(p.cod_producto, nuevoEstado);
  };

  // =====================================================
  // HU-08: Handlers de imagen
  // =====================================================
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

  const handleImageClick = (p) => {
    setUploadTarget(p);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
      window.alert('Solo se permiten imágenes JPG o PNG.');
      e.target.value = '';
      return;
    }

    // Validar tamaño (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      window.alert('La imagen no puede exceder 2 MB.');
      e.target.value = '';
      return;
    }

    if (onSubirImagen) onSubirImagen(uploadTarget.cod_producto, file);
    e.target.value = '';
    setUploadTarget(null);
  };

  const handleEliminarImagen = (p) => {
    const codigo = p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`;
    const ok = window.confirm(`¿Eliminar la imagen del producto ${codigo}?`);
    if (!ok) return;
    if (onEliminarImagen) onEliminarImagen(p.cod_producto);
  };

  return (
    <div className="jyr-card">
      {/* HEADER: título + contadores */}
      <div className="jyr-card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h3>📦 Listado de Productos</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="jyr-badge jyr-badge-dark">{productos.length} total</span>
          {hayFiltros && (
            <span className="jyr-badge jyr-badge-info">{productosFiltrados.length} encontrados</span>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--jyr-gray-200)',
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center'
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <FiSearch size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--jyr-gray-400)'
          }} />
          <input
            className="jyr-form-control"
            placeholder="Buscar por código o nombre..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        {/* Filtro categoría */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <FiFilter size={13} style={{ color: 'var(--jyr-gray-400)' }} />
          <select
            className="jyr-form-control jyr-form-select"
            value={filtroCategoria}
            onChange={(e) => handleFiltroCategoria(e.target.value)}
            style={{ fontSize: 12, padding: '6px 10px', width: 'auto', minWidth: 140 }}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.cod_categoria} value={cat.cod_categoria}>{cat.nombre_categoria}</option>
            ))}
          </select>
        </div>

        {/* Filtro estado */}
        <select
          className="jyr-form-control jyr-form-select"
          value={filtroEstado}
          onChange={(e) => handleFiltroEstado(e.target.value)}
          style={{ fontSize: 12, padding: '6px 10px', width: 'auto', minWidth: 130, flex: '0 0 auto' }}
        >
          <option value="">Todos los estados</option>
          <option value="Activo">✅ Activo</option>
          <option value="Inactivo">🚫 Inactivo</option>
          <option value="Descontinuado">⚠️ Descontinuado</option>
        </select>

        {/* Limpiar filtros */}
        {hayFiltros && (
          <button
            className="jyr-btn jyr-btn-sm jyr-btn-outline"
            onClick={limpiarFiltros}
            style={{ fontSize: 12 }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* HU-08: Input oculto para seleccionar imagen */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* HU-08: Hover preview flotante con detalle */}
      {hoverImg && (
        <div style={{
          position: 'fixed', left: hoverImg.x, top: hoverImg.y,
          zIndex: 9999, pointerEvents: 'none',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          border: '1px solid var(--jyr-gray-200)',
          padding: 12, display: 'flex', gap: 14, alignItems: 'flex-start',
          maxWidth: 420
        }}>
          <img
            src={hoverImg.src}
            alt={hoverImg.name}
            style={{ width: 140, height: 140, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--jyr-gray-100)', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--jyr-red)', fontWeight: 700 }}>
              {hoverImg.codigo}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--jyr-gray-800)', lineHeight: 1.3 }}>
              {hoverImg.name}
            </p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
                <strong>Categoría:</strong> {hoverImg.categoria}
              </span>
              <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
                <strong>Precio:</strong> L. {hoverImg.precio}
              </span>
              <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
                <strong>Unidad:</strong> {hoverImg.unidad}
              </span>
              {hoverImg.ubicacion && (
                <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
                  <strong>Ubicación:</strong> {hoverImg.ubicacion}
                </span>
              )}
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: hoverImg.estado === 'Activo' ? 'var(--jyr-success, #16a34a)'
                  : hoverImg.estado === 'Descontinuado' ? 'var(--jyr-warning, #d97706)'
                  : 'var(--jyr-danger, #dc2626)'
              }}>
                {hoverImg.estado}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TABLA CON CABECERAS ORDENABLES */}
      <div className="jyr-table-wrapper">
        <table className="jyr-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('cod_producto')}>
                Código <SortIcon campo="cod_producto" />
              </th>
              <th>Imagen</th>
              <th>Categoría</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('nombre_producto')}>
                Nombre <SortIcon campo="nombre_producto" />
              </th>
              <th>Unidad</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('precio_venta')}>
                Precio <SortIcon campo="precio_venta" />
              </th>
              <th>ISV</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('estado_producto')}>
                Estado <SortIcon campo="estado_producto" />
              </th>
              <th>Ubicación</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productosPagina.length > 0 ? (
              productosPagina.map((p) => {
                const estado = getEstado(p);

                return (
                  <tr key={p.cod_producto} style={estado !== 'Activo' ? { opacity: 0.7 } : {}}>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--jyr-red)' }}>
                        {p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.imagen_url ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                              src={`${API_URL}${p.imagen_url}`}
                              alt={p.nombre_producto}
                              style={{
                                width: 40, height: 40, objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--jyr-gray-200)',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleImageClick(p)}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverImg({
                                  src: `${API_URL}${p.imagen_url}`,
                                  name: p.nombre_producto,
                                  codigo: p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`,
                                  categoria: categoriasMap[p.cod_categoria] || `Cat-${p.cod_categoria}`,
                                  precio: Number(p.precio_venta).toFixed(2),
                                  unidad: p.unidad_medida,
                                  estado: getEstado(p),
                                  ubicacion: p.cod_ubicacion
                                    ? `P${p.ubi_pasillo} E${p.ubi_estanteria} N${p.ubi_nivel_1}${p.ubi_nivel_2 ? ` N2:${p.ubi_nivel_2}` : ''}`
                                    : null,
                                  x: rect.right + 12,
                                  y: rect.top - 40
                                });
                              }}
                              onMouseLeave={() => setHoverImg(null)}
                            />
                            <button
                              onClick={() => handleEliminarImagen(p)}
                              title="Eliminar imagen"
                              style={{
                                position: 'absolute', top: -6, right: -6,
                                background: 'var(--jyr-danger, #dc2626)', color: '#fff',
                                border: 'none', borderRadius: '50%',
                                width: 16, height: 16, fontSize: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', padding: 0, lineHeight: 1
                              }}
                            >
                              <FiX size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="jyr-btn jyr-btn-sm jyr-btn-outline"
                            onClick={() => handleImageClick(p)}
                            title="Subir imagen"
                            style={{ padding: '4px 8px' }}
                          >
                            <FiCamera size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="jyr-badge jyr-badge-info">
                        {categoriasMap[p.cod_categoria] || `Cat-${p.cod_categoria}`}
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
                    <td>
                      {p.cod_ubicacion ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, lineHeight: 1.3 }}>
                          <span><strong style={{ color: 'var(--jyr-gray-500)' }}>P:</strong> {p.ubi_pasillo} &nbsp;<strong style={{ color: 'var(--jyr-gray-500)' }}>E:</strong> {p.ubi_estanteria}</span>
                          <span><strong style={{ color: 'var(--jyr-gray-500)' }}>N1:</strong> {p.ubi_nivel_1}{p.ubi_nivel_2 ? <> &nbsp;<strong style={{ color: 'var(--jyr-gray-500)' }}>N2:</strong> {p.ubi_nivel_2}</> : ''}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--jyr-gray-400)', fontStyle: 'italic' }}>Sin ubicación</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          className="jyr-btn jyr-btn-sm jyr-btn-outline"
                          onClick={() => onVerFicha && onVerFicha(p)}
                          title="Ver ficha"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          className="jyr-btn jyr-btn-sm jyr-btn-outline"
                          onClick={() => onEdit && onEdit(p)}
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="jyr-btn jyr-btn-sm jyr-btn-outline-red"
                          onClick={() => handleDelete(p)}
                          title="Eliminar"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: 'var(--jyr-gray-400)' }}>
                  {hayFiltros
                    ? 'No se encontraron productos con los filtros aplicados.'
                    : 'No hay productos registrados.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN + INFO */}
      {productosFiltrados.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--jyr-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8
        }}>
          <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
            Mostrando {((pagina - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(pagina * ITEMS_PER_PAGE, productosFiltrados.length)} de {productosFiltrados.length}
          </span>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            onChange={setPagina}
          />
        </div>
      )}
    </div>
  );
};

export default ProductoList;