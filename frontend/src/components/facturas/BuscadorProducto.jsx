import React, { useState, useEffect, useRef, useCallback } from 'react';
import { facturaService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FiSearch, FiPackage, FiAlertTriangle, FiX, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { confirmDialog } from '../../utils/notifications.js';
import SearchInput from '../common/SearchInput.jsx';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * BuscadorProducto — HU-FAC-02
 * Campo de búsqueda por código o nombre con lista/autocompletado.
 * Muestra precio, stock actual, ISV.
 * Bloquea selección si stock = 0 (salvo permiso Administrador).
 */
const BuscadorProducto = ({ onAgregar, itemsActuales = [] }) => {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'Administrador';

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda con debounce.
  // Endurecida contra entradas extremas: exige un mínimo, acota la respuesta a
  // un número seguro de resultados (evita renders masivos) y nunca deja que una
  // excepción rompa la UI.
  const MAX_RESULTADOS = 50;
  const buscar = useCallback(async (texto) => {
    if (!texto || texto.length < 1) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    setCargando(true);
    try {
      const { data } = await facturaService.productosDisponibles({ buscar: texto });
      // Defensa: la respuesta podría no traer un arreglo; nunca renderizamos más
      // de MAX_RESULTADOS para no congelar el navegador con listas enormes.
      const lista = data?.ok && Array.isArray(data.datos) ? data.datos.slice(0, MAX_RESULTADOS) : [];
      setResultados(lista);
      setAbierto(true);
      setIndiceActivo(-1);
    } catch {
      setResultados([]);
      setAbierto(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscar(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query, buscar]);

  const handleSeleccionar = async (producto) => {
    // Verificar si ya está en la factura
    const yaExiste = itemsActuales.some(i => i.cod_producto === producto.cod_producto);
    if (yaExiste) {
      toast.warning(`"${producto.nombre_producto}" ya está en la factura`);
      return;
    }

    // Bloquear si el producto no está activo
    if (producto.estado_producto && producto.estado_producto !== 'Activo') {
      toast.error(`"${producto.nombre_producto}" no está disponible para venta (Estado: ${producto.estado_producto})`);
      return;
    }

    // Bloquear si stock = 0 y no es admin
    if (producto.stock <= 0 && !esAdmin) {
      toast.error(`Sin stock disponible para "${producto.nombre_producto}"`);
      return;
    }

    // Si stock = 0 pero es admin, pedir confirmación
    if (producto.stock <= 0 && esAdmin) {
      const ok = await confirmDialog({
        variant: 'stock',
        title: 'Producto sin stock',
        text: `"${producto.nombre_producto}" tiene stock 0. ¿Agregar de todas formas? (Permiso de Administrador)`,
        confirmText: 'Sí, agregar'
      });
      if (!ok) {
        return;
      }
    }

    onAgregar({
      cod_producto: producto.cod_producto,
      nombre_producto: producto.nombre_producto,
      unidad_medida: producto.unidad_medida,
      precio_venta: parseFloat(producto.precio_venta),
      isv_pct: parseFloat(producto.isv) || 0,
      isv_descripcion: producto.isv_descripcion || '',
      stock: producto.stock,
      cantidad: 1
    });

    setQuery('');
    setResultados([]);
    setAbierto(false);
    inputRef.current?.focus();
  };

  // Navegación por teclado
  const handleKeyDown = (e) => {
    if (!abierto || resultados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((prev) => (prev < resultados.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((prev) => (prev > 0 ? prev - 1 : resultados.length - 1));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      handleSeleccionar(resultados[indiceActivo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setIndiceActivo(-1);
    }
  };

  const limpiar = () => {
    setQuery('');
    setResultados([]);
    setAbierto(false);
    inputRef.current?.focus();
  };

  return (
    <div className="prod-search" ref={wrapperRef}>
      <label className="prod-search-label">
        <FiPackage className="me-1" />
        Buscar Producto <span className="text-muted">(código o nombre)</span>
      </label>

      {/* Campo de búsqueda */}
      <div className="prod-search-input-wrapper">
        <FiSearch className="prod-search-icon" />
        <SearchInput
          ref={inputRef}
          className="prod-search-input"
          placeholder="Ej: 101 ó Filtro de aceite..."
          value={query}
          onChange={(val) => setQuery(val)}
          onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="prod-search-clear" onClick={limpiar} type="button">
            <FiX />
          </button>
        )}
        {cargando && <div className="prod-search-spinner" />}
      </div>

      {/* Dropdown de resultados */}
      {abierto && (
        <div className="prod-search-dropdown">
          {resultados.length === 0 && !cargando ? (
            <div className="prod-search-empty">
              <FiSearch className="me-2" />
              No se encontraron productos para "<strong>{query}</strong>"
            </div>
          ) : (
            resultados.map((p, idx) => {
              const sinStock = p.stock <= 0;
              const yaEnFactura = itemsActuales.some(i => i.cod_producto === p.cod_producto);
              const bloqueado = (sinStock && !esAdmin) || yaEnFactura;

              return (
                <div
                  key={p.cod_producto}
                  className={`prod-search-item ${idx === indiceActivo ? 'active' : ''} ${bloqueado ? 'disabled' : ''}`}
                  onClick={() => !bloqueado && handleSeleccionar(p)}
                  onMouseEnter={() => setIndiceActivo(idx)}
                >
                  {/* Código */}
                  <div className="prod-search-item-code">
                    #{p.cod_producto}
                  </div>

                  {/* Info principal */}
                  <div className="prod-search-item-info">
                    <div className="prod-search-item-name">
                      {p.nombre_producto}
                      {yaEnFactura && <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>Ya agregado</span>}
                    </div>
                    <div className="prod-search-item-meta">
                      <span>{p.unidad_medida || 'UND'}</span>
                      {p.isv > 0 && <span className="ms-2">ISV: {p.isv}%</span>}
                    </div>
                  </div>

                  {/* Precio */}
                  <div className="prod-search-item-price">
                    {formatMoney(p.precio_venta)}
                  </div>

                  {/* Stock badge */}
                  <div className={`prod-search-item-stock ${sinStock ? 'out' : p.stock <= 5 ? 'low' : 'ok'}`}>
                    {sinStock ? (
                      <><FiAlertTriangle className="me-1" />Sin Stock</>
                    ) : (
                      <>Stock: {p.stock}</>
                    )}
                  </div>

                  {/* Botón agregar */}
                  {!bloqueado && (
                    <div className="prod-search-item-add">
                      <FiPlus />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Ayuda al pie */}
          <div className="prod-search-help">
            <span>↑↓ navegar</span>
            <span>↵ seleccionar</span>
            <span>Esc cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuscadorProducto;
