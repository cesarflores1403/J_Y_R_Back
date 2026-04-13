import { useState, useMemo, useRef, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiSearch, FiChevronUp, FiChevronDown, FiFilter, FiCamera, FiX, FiEye, FiCopy, FiPackage } from 'react-icons/fi';
import Pagination from '../common/Pagination.jsx';
import { useCategorias } from '../../hooks/useCategorias.js'; // // HU-07: Categorias dinamicas
import { alertDialog, confirmDialog } from '../../utils/notifications.js';

// =====================================================
// HU-06: Listado con busqueda, filtros, paginacion y ordenamiento
// =====================================================
import { resolveApiBase } from '../../utils/runtimeApi.js';

const ITEMS_PER_PAGE = 10;

// Mapa de badges por estado
const estadoBadge = {
  Activo: { className: 'jyr-badge jyr-badge-success', label: 'Activo' },
  Inactivo: { className: 'jyr-badge jyr-badge-danger', label: 'Inactivo' },
  Descontinuado: { className: 'jyr-badge jyr-badge-warning', label: 'Descontinuado' },
};

const ProductoList = ({ productos = [], onEdit, onDelete, onCambiarEstado, onCambiarEstadoMasivo, onSubirImagen, onEliminarImagen, onVerFicha, onDuplicate, mostrarMargen = false }) => {
  // HU-07: Categorias dinamicas desde BD
  const { categorias } = useCategorias();
  const fileInputRef = useRef(null); // // HU-08: ref para input file oculto
  const [uploadTarget, setUploadTarget] = useState(null); // // HU-08: producto al que se le sube imagen
  const [hoverImg, setHoverImg] = useState(null); // // HU-08: hover preview { src, x, y }

  // Mapa de categorias para lookup rapido
  const categoriasMap = useMemo(() => {
    const map = {};
    categorias.forEach(c => { map[c.cod_categoria] = c.nombre_categoria; });
    return map;
  }, [categorias]);

  // =====================================================
  // ESTADOS: busqueda, filtros, ordenamiento, paginacion
  // =====================================================
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBajoStock, setFiltroBajoStock] = useState(false);
  const [mostrarColumnaMargen, setMostrarColumnaMargen] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('cod_producto');
  const [ordenDir, setOrdenDir] = useState('asc');
  const [pagina, setPagina] = useState(1);
  const [seleccionados, setSeleccionados] = useState([]); // HU-15: seleccion multiple
  const [estadoMasivo, setEstadoMasivo] = useState(''); // HU-15: nuevo estado masivo
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    action: null,
  });

  // Normalizar estado (compatibilidad con boolean legacy)
  const getEstado = (p) => {
    if (typeof p.estado_producto === 'boolean') return p.estado_producto ? 'Activo' : 'Inactivo';
    return p.estado_producto || 'Activo';
  };

  const esBajoStock = (p) => {
    const stockTotal = Number(p.stock_total ?? 0);
    const stockMinimo = Number(p.stock_minimo ?? 0);
    const puntoReorden = Number(p.punto_reorden ?? 0);

    if (stockMinimo > 0) return stockTotal < stockMinimo;
    if (puntoReorden > 0) return stockTotal < puntoReorden;

    // Si no hay umbral definido, considerar bajo stock cuando está en cero.
    return stockTotal <= 0;
  };

  const calcularMargen = (p) => {
    if (Number.isFinite(Number(p.margen_ganancia))) return Number(p.margen_ganancia);

    const venta = Number(p.precio_venta);
    const costo = Number(p.precio_costo);
    if (!Number.isFinite(venta) || venta <= 0) return null;
    if (!Number.isFinite(costo) || costo < 0) return null;
    return Number((((venta - costo) / venta) * 100).toFixed(2));
  };

  // =====================================================
  // 1. FILTRAR: busqueda + categoria + estado
  // =====================================================
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return productos.filter((p) => {
      // Busqueda por codigo, nombre o descripcion
      if (q) {
        const codigo = (p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`).toLowerCase();
        const nombre = (p.nombre_producto || '').toLowerCase();
        const descripcion = (p.descripcion || '').toLowerCase();
        const codNum = String(p.cod_producto);
        if (!codigo.includes(q) && !nombre.includes(q) && !descripcion.includes(q) && !codNum.includes(q)) {
          return false;
        }
      }

      // Filtro por categoria
      if (filtroCategoria && Number(p.cod_categoria) !== Number(filtroCategoria)) {
        return false;
      }

      // Filtro por estado
      if (filtroEstado && getEstado(p) !== filtroEstado) {
        return false;
      }

      if (filtroBajoStock && !esBajoStock(p)) {
        return false;
      }

      return true;
    });
  }, [productos, busqueda, filtroCategoria, filtroEstado, filtroBajoStock]);

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
        case 'stock_total':
          valA = Number(a.stock_total ?? 0);
          valB = Number(b.stock_total ?? 0);
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

  const productosPaginaElegibles = useMemo(() => {
    if (!estadoMasivo) return productosPagina;
    return productosPagina.filter((p) => getEstado(p) !== estadoMasivo);
  }, [productosPagina, estadoMasivo]);

  // Si ya se eligio un estado masivo, quitar de la seleccion los que ya estan en ese estado
  useEffect(() => {
    if (!estadoMasivo) return;

    setSeleccionados((prev) => prev.filter((id) => {
      const prod = productos.find((p) => p.cod_producto === id);
      if (!prod) return false;
      return getEstado(prod) !== estadoMasivo;
    }));
  }, [estadoMasivo, productos]);

  // Limpiar seleccionados que ya no existen en la lista actual
  useEffect(() => {
    setSeleccionados((prev) => prev.filter((id) => productos.some((p) => p.cod_producto === id)));
  }, [productos]);

  const elegiblesPaginaIds = useMemo(
    () => productosPaginaElegibles.map((p) => p.cod_producto),
    [productosPaginaElegibles]
  );

  const sinElegiblesEnPagina = elegiblesPaginaIds.length === 0;
  const todosSeleccionadosPagina =
    elegiblesPaginaIds.length > 0 && elegiblesPaginaIds.every((id) => seleccionados.includes(id));

  const toggleSeleccion = (codProducto) => {
    setSeleccionados((prev) => (
      prev.includes(codProducto)
        ? prev.filter((id) => id !== codProducto)
        : [...prev, codProducto]
    ));
  };

  const toggleSeleccionPagina = () => {
    if (sinElegiblesEnPagina) return;

    setSeleccionados((prev) => {
      if (todosSeleccionadosPagina) {
        return prev.filter((id) => !elegiblesPaginaIds.includes(id));
      }

      const merged = new Set(prev);
      elegiblesPaginaIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const cerrarConfirmModal = () => {
    setConfirmModal({
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirmar',
      action: null,
    });
  };

  const confirmarAccion = async () => {
    if (typeof confirmModal.action === 'function') {
      await confirmModal.action();
    }
    cerrarConfirmModal();
  };

  const ejecutarCambioMasivo = () => {
    if (!estadoMasivo || seleccionados.length === 0 || !onCambiarEstadoMasivo) return;

    setConfirmModal({
      open: true,
      title: 'Confirmar cambio masivo',
      message: `Se actualizará el estado de ${seleccionados.length} producto(s) a "${estadoMasivo}".`,
      confirmText: 'Sí, actualizar',
      action: async () => {
        const resultado = await onCambiarEstadoMasivo(seleccionados, estadoMasivo);
        if (resultado) {
          setSeleccionados([]);
          setEstadoMasivo('');
        }
      },
    });
  };

  // Reset pagina al cambiar filtros/busqueda
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
  const handleFiltroBajoStock = (val) => {
    setFiltroBajoStock(val);
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
  const hayFiltros = busqueda || filtroCategoria || filtroEstado || filtroBajoStock;
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('');
    setFiltroEstado('');
    setFiltroBajoStock(false);
    setPagina(1);
  };

  const handleDelete = async (p) => {
    const codigo = p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`;
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar producto',
      text: `¿Eliminar el producto ${codigo} - ${p.nombre_producto}?`,
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;
    if (onDelete) onDelete({ cod_producto: p.cod_producto });
  };

  const handleEstadoChange = async (p, nuevoEstado) => {
    if (nuevoEstado === getEstado(p)) return;
    const mensajes = {
      Inactivo: `¿Está seguro de inactivar "${p.nombre_producto}"? Ya no estará disponible para venta.`,
      Descontinuado: `¿Está seguro de marcar "${p.nombre_producto}" como descontinuado? No se podrá vender.`,
      Activo: `¿Está seguro de reactivar "${p.nombre_producto}"? Volverá a estar disponible para venta.`,
    };
    const ok = await confirmDialog({
      variant: nuevoEstado === 'Activo' ? 'restore' : 'deactivate',
      title: 'Cambiar estado',
      text: mensajes[nuevoEstado] || `¿Cambiar estado a "${nuevoEstado}"?`,
      confirmText: 'Sí, cambiar'
    });
    if (!ok) return;
    if (onCambiarEstado) onCambiarEstado(p.cod_producto, nuevoEstado);
  };

  // =====================================================
  // HU-08: Handlers de imagen
  // =====================================================
  const API_URL = resolveApiBase();

  const handleImageClick = (p) => {
    setUploadTarget(p);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
      await alertDialog({
        title: 'Formato no permitido',
        text: 'Solo se permiten imágenes JPG o PNG.',
        icon: 'error'
      });
      e.target.value = '';
      return;
    }

    // Validar tamano (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      await alertDialog({
        title: 'Archivo demasiado grande',
        text: 'La imagen no puede exceder 2 MB.',
        icon: 'warning'
      });
      e.target.value = '';
      return;
    }

    if (onSubirImagen) onSubirImagen(uploadTarget.cod_producto, file);
    e.target.value = '';
    setUploadTarget(null);
  };

  const handleEliminarImagen = async (p) => {
    const codigo = p.codigo_producto || `PROD-${String(p.cod_producto).padStart(4, '0')}`;
    const ok = await confirmDialog({
      variant: 'delete',
      title: 'Eliminar imagen',
      text: `¿Eliminar la imagen del producto ${codigo}?`,
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;
    if (onEliminarImagen) onEliminarImagen(p.cod_producto);
  };

  return (
    <div className="jyr-card">
      {/* HEADER: titulo + contadores */}
      <div className="jyr-card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiPackage size={16} /> Listado de Productos</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="jyr-badge jyr-badge-dark">{productos.length} total</span>
          {hayFiltros && (
            <span className="jyr-badge jyr-badge-info">{productosFiltrados.length} encontrados</span>
          )}
        </div>
      </div>

      {/* BARRA DE BUSQUEDA Y FILTROS */}
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
            placeholder="Buscar por código, nombre o descripción..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        {/* Filtro categoria */}
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
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Descontinuado">Descontinuado</option>
        </select>

        <button
          type="button"
          className={`jyr-btn jyr-btn-sm ${filtroBajoStock ? 'jyr-btn-danger' : 'jyr-btn-outline'}`}
          onClick={() => handleFiltroBajoStock(!filtroBajoStock)}
          style={{ fontSize: 12 }}
          title="Mostrar solo productos con bajo stock"
        >
          Bajo stock
        </button>

        {mostrarMargen && (
          <button
            type="button"
            className={`jyr-btn jyr-btn-sm ${mostrarColumnaMargen ? 'jyr-btn-primary' : 'jyr-btn-outline'}`}
            onClick={() => setMostrarColumnaMargen((prev) => !prev)}
            style={{ fontSize: 12 }}
            title="Mostrar u ocultar columna de margen"
          >
            {mostrarColumnaMargen ? 'Ocultar margen' : 'Mostrar margen'}
          </button>
        )}

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

      {seleccionados.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--jyr-gray-200)',
          background: 'var(--jyr-info-bg, #eff6ff)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jyr-info, #2563eb)' }}>
            {seleccionados.length} producto(s) seleccionado(s)
          </span>

          <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
            Los que ya están en el estado elegido no se pueden seleccionar.
          </span>

          <select
            className="jyr-form-control jyr-form-select"
            value={estadoMasivo}
            onChange={(e) => setEstadoMasivo(e.target.value)}
            style={{ fontSize: 12, padding: '6px 10px', width: 'auto', minWidth: 170 }}
          >
            <option value="">Selecciona nuevo estado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Descontinuado">Descontinuado</option>
          </select>

          <button
            className="jyr-btn jyr-btn-sm jyr-btn-primary"
            onClick={ejecutarCambioMasivo}
            disabled={!estadoMasivo}
          >
            Cambiar estado
          </button>

          <button
            className="jyr-btn jyr-btn-sm jyr-btn-outline"
            onClick={() => { setSeleccionados([]); setEstadoMasivo(''); }}
          >
            Cancelar
          </button>
        </div>
      )}

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
              <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
                <strong>Stock:</strong> {hoverImg.stock}
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
              <th style={{ width: 44, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={todosSeleccionadosPagina}
                  onChange={toggleSeleccionPagina}
                  disabled={sinElegiblesEnPagina}
                  title="Seleccionar todos en la página"
                />
              </th>
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
              {mostrarMargen && mostrarColumnaMargen && <th>Margen</th>}
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('stock_total')}>
                Stock <SortIcon campo="stock_total" />
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
                const bajoStock = esBajoStock(p);
                const stockActual = Number(p.stock_total ?? 0);
                const stockMinimo = Number(p.stock_minimo ?? 0);
                const puntoReorden = Number(p.punto_reorden ?? 0);
                const umbral = stockMinimo > 0 ? stockMinimo : (puntoReorden > 0 ? puntoReorden : 1);

                return (
                  <tr key={p.cod_producto} style={estado !== 'Activo' ? { opacity: 0.7 } : {}}>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        const disabled = Boolean(estadoMasivo && getEstado(p) === estadoMasivo);
                        return (
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(p.cod_producto)}
                        onChange={() => toggleSeleccion(p.cod_producto)}
                        disabled={disabled}
                        title={disabled
                          ? `${p.nombre_producto} ya está en estado ${estadoMasivo}`
                          : `Seleccionar ${p.nombre_producto}`}
                      />
                        );
                      })()}
                    </td>
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
                                  stock: Number(p.stock_total ?? 0),
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
                    {mostrarMargen && mostrarColumnaMargen && (
                      <td>
                        {(() => {
                          const margen = calcularMargen(p);
                          if (margen === null) {
                            return <span style={{ fontSize: 12, color: 'var(--jyr-gray-400)' }}>N/D</span>;
                          }

                          return (
                            <span
                              className={`jyr-badge ${margen >= 0 ? 'jyr-badge-success' : 'jyr-badge-danger'}`}
                              title="((precio_venta - precio_costo) / precio_venta) × 100"
                            >
                              {margen.toFixed(2)}%
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td>
                      <span
                        className={`jyr-badge ${bajoStock ? 'jyr-badge-danger' : (stockActual > 0 ? 'jyr-badge-success' : 'jyr-badge-danger')}`}
                        title={bajoStock ? `Bajo stock: actual ${stockActual}, maximo ${umbral}` : 'Stock actual'}
                      >
                        {stockActual}{bajoStock ? ` / maximo ${umbral}` : ''}
                      </span>
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
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="Descontinuado">Descontinuado</option>
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
                          className="jyr-btn jyr-btn-sm jyr-btn-outline"
                          onClick={() => onDuplicate && onDuplicate(p)}
                          title="Duplicar"
                        >
                          <FiCopy size={14} />
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
                <td colSpan={mostrarMargen && mostrarColumnaMargen ? 13 : 12} style={{ textAlign: 'center', padding: 40, color: 'var(--jyr-gray-400)' }}>
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

      {/* PAGINACION + INFO */}
      {productosFiltrados.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--jyr-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8
        }}>
          <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
            Mostrando {((pagina - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(pagina * ITEMS_PER_PAGE, productosFiltrados.length)} de {productosFiltrados.length}
          </span>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            onChange={setPagina}
          />
        </div>
      )}

      {confirmModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
          }}
          onClick={cerrarConfirmModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520,
              background: '#fff', borderRadius: 12,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--jyr-gray-200)' }}>
              <h5 style={{ margin: 0, fontWeight: 700 }}>{confirmModal.title}</h5>
            </div>

            <div style={{ padding: '16px 18px', color: 'var(--jyr-gray-700)', lineHeight: 1.5 }}>
              {confirmModal.message}
            </div>

            <div style={{
              padding: '12px 18px', borderTop: '1px solid var(--jyr-gray-200)',
              display: 'flex', justifyContent: 'flex-end', gap: 8
            }}>
              <button className="jyr-btn jyr-btn-sm jyr-btn-outline" onClick={cerrarConfirmModal}>
                Cancelar
              </button>
              <button className="jyr-btn jyr-btn-sm jyr-btn-primary" onClick={confirmarAccion}>
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductoList;
