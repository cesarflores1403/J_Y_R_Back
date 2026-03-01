import { useState, useMemo } from 'react';
import { FiEdit2, FiTrash2, FiSearch, FiChevronUp, FiChevronDown, FiFilter } from 'react-icons/fi';
import Pagination from '../common/Pagination.jsx';
import { useCategorias } from '../../hooks/useCategorias.js'; // // HU-07: Categorías dinámicas

// =====================================================
// HU-06: Listado con búsqueda, filtros, paginación y ordenamiento
// =====================================================

const ITEMS_PER_PAGE = 8;

// Mapa de badges por estado
const estadoBadge = {
  Activo: { className: 'jyr-badge jyr-badge-success', label: 'Activo' },
  Inactivo: { className: 'jyr-badge jyr-badge-danger', label: 'Inactivo' },
  Descontinuado: { className: 'jyr-badge jyr-badge-warning', label: 'Descontinuado' },
};

const ProductoList = ({ productos = [], onEdit, onDelete, onCambiarEstado }) => {
  // HU-07: Categorías dinámicas desde BD
  const { categorias } = useCategorias();

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

      {/* TABLA CON CABECERAS ORDENABLES */}
      <div className="jyr-table-wrapper">
        <table className="jyr-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('cod_producto')}>
                Código <SortIcon campo="cod_producto" />
              </th>
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