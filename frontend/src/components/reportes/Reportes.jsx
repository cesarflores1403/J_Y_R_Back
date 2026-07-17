import React, { useEffect, useMemo, useState } from 'react';
import { reporteService } from '../../services/serviceIndex.js';
import { formatMoney } from '../../utils/helpers.js';
import { toast } from 'react-toastify';
import {
  FiDollarSign,
  FiPackage,
  FiDatabase,
  FiShoppingCart,
  FiBarChart2,
  FiTrendingUp,
  FiSearch,
  FiFilter,
} from 'react-icons/fi';
import SearchInput from '../common/SearchInput.jsx';

const TABS = [
  { key: 'ventas', label: 'Ventas', icon: <FiDollarSign /> },
  { key: 'productos', label: 'Productos Vendidos', icon: <FiPackage /> },
  { key: 'inventario', label: 'Inventario', icon: <FiDatabase /> },
];

const PERIODOS_DISPONIBLES = [
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
];

const REGISTROS_POR_PAGINA = 10;

const getEstadoFactura = (value) => {
  if (value === true || value === 1 || value === '1') {
    return { text: 'Activa', className: 'bg-success-subtle text-success' };
  }

  if (value === false || value === 0 || value === '0') {
    return { text: 'Anulada', className: 'bg-danger-subtle text-danger' };
  }

  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    const esActiva = ['activa', 'activo', 'true', '1', 'si', 'sí'].includes(s);

    return {
      text: esActiva ? 'Activa' : 'Anulada',
      className: esActiva
        ? 'bg-success-subtle text-success'
        : 'bg-danger-subtle text-danger',
    };
  }

  return value
    ? { text: 'Activa', className: 'bg-success-subtle text-success' }
    : { text: 'Anulada', className: 'bg-danger-subtle text-danger' };
};

const getEstadoStock = (stockTotal, stockMinimo) => {
  const stock = parseInt(stockTotal || 0, 10);
  const minimo = parseInt(stockMinimo || 0, 10);

  if (minimo > 0 && stock <= minimo) {
    return { text: 'Bajo', className: 'bg-danger-subtle text-danger' };
  }

  return { text: 'Disponible', className: 'bg-success-subtle text-success' };
};

const StatCard = ({ title, value, icon, valueClassName = '', subtitle = '' }) => (
  <div className="col-md-6 col-xl-3">
    <div className="card border-0 shadow-sm h-100 rounded-4">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div
            className="text-uppercase text-muted fw-semibold"
            style={{ fontSize: 12, letterSpacing: '.04em' }}
          >
            {title}
          </div>

          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 42,
              height: 42,
              background: '#f8f9fa',
              color: '#dc3545',
              fontSize: 18,
            }}
          >
            {icon}
          </div>
        </div>

        <div className={`fw-bold ${valueClassName}`} style={{ fontSize: 30, lineHeight: 1.1 }}>
          {value}
        </div>

        {subtitle ? (
          <div className="text-muted mt-2" style={{ fontSize: 13 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

const TableCard = ({ title, actions, children }) => (
  <div className="card border-0 shadow-sm rounded-4">
    <div className="card-header bg-white border-0 pt-4 pb-3 px-4 rounded-top-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 className="mb-0 fw-bold">{title}</h5>
        {actions}
      </div>
    </div>
    <div className="card-body p-0">{children}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-5 text-muted">
    <FiBarChart2 size={30} className="mb-3" />
    <div>{message}</div>
  </div>
);

const Pagination = ({ paginaActual, totalPaginas, onPageChange }) => {
  return (
    <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
      <button
        type="button"
        className="btn btn-light rounded-3"
        onClick={() => onPageChange(paginaActual - 1)}
        disabled={paginaActual === 1}
      >
        Anterior
      </button>

      <span className="text-muted">
        Página {paginaActual} de {totalPaginas}
      </span>

      <button
        type="button"
        className="btn btn-light rounded-3"
        onClick={() => onPageChange(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
      >
        Siguiente
      </button>
    </div>
  );
};

const Reportes = () => {
  const [tab, setTab] = useState('ventas');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [periodoVentas, setPeriodoVentas] = useState('mensual');
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const [paginaVentas, setPaginaVentas] = useState(1);
  const [paginaProductos, setPaginaProductos] = useState(1);
  const [paginaInventario, setPaginaInventario] = useState(1);

  const cargar = async (tipo, periodo) => {
    setCargando(true);
    setDatos(null);

    try {
      let response;

      if (tipo === 'ventas') {
        response = await reporteService.ventas({ periodo });
      } else if (tipo === 'productos') {
        response = await reporteService.productosVendidos();
      } else if (tipo === 'inventario') {
        response = await reporteService.inventario();
      }

      if (response?.data?.ok) {
        setDatos(response.data.datos);
      } else {
        toast.error('No se pudo cargar el reporte');
      }
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tab === 'ventas') {
      cargar(tab, periodoVentas);
    } else {
      cargar(tab);
    }
  }, [tab, periodoVentas]);

  useEffect(() => {
    setPaginaVentas(1);
  }, [busquedaVentas, periodoVentas, tab]);

  useEffect(() => {
    setPaginaProductos(1);
  }, [busquedaProducto, tab]);

  useEffect(() => {
    setPaginaInventario(1);
  }, [busquedaProducto, soloStockBajo, tab]);

  const detalleVentasFiltrado = useMemo(() => {
    const lista = datos?.detalle || [];
    const q = busquedaVentas.trim().toLowerCase();

    if (!q) return lista;

    return lista.filter((f) =>
      [f.cod_factura, f.cliente, f.nombre_usuario, f.metodo_pago, f.estado]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [datos?.detalle, busquedaVentas]);

  const productosVendidosFiltrados = useMemo(() => {
    const lista = datos?.productos || [];
    const q = busquedaProducto.trim().toLowerCase();

    if (!q) return lista;

    return lista.filter((p) =>
      [p.nombre_producto, p.total_vendido, p.total_ingresos]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [datos?.productos, busquedaProducto]);

  const inventarioFiltrado = useMemo(() => {
    let lista = datos?.productos || [];

    if (soloStockBajo) {
      lista = lista.filter((p) => {
        const stock = parseInt(p.stock_total || 0, 10);
        const minimo = parseInt(p.stock_minimo || 0, 10);
        return minimo > 0 && stock <= minimo;
      });
    }

    const q = busquedaProducto.trim().toLowerCase();

    if (!q) return lista;

    return lista.filter((p) =>
      [p.nombre_producto, p.nombre_categoria, p.stock_total, p.stock_minimo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [datos?.productos, busquedaProducto, soloStockBajo]);

  const resumenInventarioFiltrado = useMemo(() => {
    const productos = inventarioFiltrado || [];

    return {
      totalProductos: productos.length,
      totalUnidades: productos.reduce((s, p) => s + parseInt(p.stock_total || 0, 10), 0),
      valorTotal: productos.reduce((s, p) => s + parseFloat(p.valor_total || 0), 0),
      stockBajo: productos.filter((p) => {
        const stock = parseInt(p.stock_total || 0, 10);
        const minimo = parseInt(p.stock_minimo || 0, 10);
        return minimo > 0 && stock <= minimo;
      }).length
    };
  }, [inventarioFiltrado]);

  const totalPaginasVentas = Math.max(
    1,
    Math.ceil(detalleVentasFiltrado.length / REGISTROS_POR_PAGINA)
  );
  const totalPaginasProductos = Math.max(
    1,
    Math.ceil(productosVendidosFiltrados.length / REGISTROS_POR_PAGINA)
  );
  const totalPaginasInventario = Math.max(
    1,
    Math.ceil(inventarioFiltrado.length / REGISTROS_POR_PAGINA)
  );

  const ventasPaginadas = useMemo(() => {
    const inicio = (paginaVentas - 1) * REGISTROS_POR_PAGINA;
    return detalleVentasFiltrado.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [detalleVentasFiltrado, paginaVentas]);

  const productosPaginados = useMemo(() => {
    const inicio = (paginaProductos - 1) * REGISTROS_POR_PAGINA;
    return productosVendidosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [productosVendidosFiltrados, paginaProductos]);

  const inventarioPaginado = useMemo(() => {
    const inicio = (paginaInventario - 1) * REGISTROS_POR_PAGINA;
    return inventarioFiltrado.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [inventarioFiltrado, paginaInventario]);

  return (
    <div className="reportes-page">
      <div className="container-fluid px-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h2 className="mb-1 fw-bold">Reportes</h2>
            <div className="text-muted">Resumen visual de ventas, productos e inventario.</div>
          </div>

          {tab === 'ventas' && datos?.rango?.fecha_inicio && datos?.rango?.fecha_fin ? (
            <div className="badge rounded-pill text-bg-light px-3 py-2 fw-medium">
              {datos.periodoDescripcion || 'Período'}: {datos.rango.fecha_inicio} a{' '}
              {datos.rango.fecha_fin}
            </div>
          ) : null}
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-2">
            <div className="d-flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`btn d-flex align-items-center gap-2 rounded-3 px-3 py-2 ${
                    tab === t.key ? 'btn-danger' : 'btn-light'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body py-5 text-center">
              <div className="spinner-border text-danger mb-3" />
              <div className="text-muted">Cargando reporte...</div>
            </div>
          </div>
        ) : (
          <>
            {tab === 'ventas' && datos && (
              <>
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-4 col-lg-3">
                        <label className="form-label fw-semibold">Período</label>
                        <select
                          className="form-select rounded-3"
                          value={periodoVentas}
                          onChange={(e) => setPeriodoVentas(e.target.value)}
                        >
                          {PERIODOS_DISPONIBLES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-8 col-lg-5">
                        <label className="form-label fw-semibold">Buscar en facturas</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white">
                            <FiSearch />
                          </span>
                          <SearchInput
                            className="form-control rounded-end-3"
                            placeholder="Cliente, vendedor, método de pago..."
                            value={busquedaVentas}
                            onChange={(val) => setBusquedaVentas(val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <StatCard
                    title="Total facturas"
                    value={datos.resumen?.total_facturas || 0}
                    icon={<FiShoppingCart />}
                    subtitle="Facturas registradas en el período"
                  />
                  <StatCard
                    title="Subtotal"
                    value={formatMoney(datos.resumen?.subtotal)}
                    icon={<FiBarChart2 />}
                    subtitle="Valor antes de impuesto"
                  />
                  <StatCard
                    title="ISV"
                    value={formatMoney(datos.resumen?.isv)}
                    icon={<FiTrendingUp />}
                    subtitle="Impuesto total aplicado"
                  />
                  <StatCard
                    title="Total general"
                    value={formatMoney(datos.resumen?.total)}
                    icon={<FiDollarSign />}
                    valueClassName="text-success"
                    subtitle="Monto final facturado"
                  />
                </div>

                <TableCard
                  title="Detalle de Facturas"
                  actions={
                    <span className="text-muted" style={{ fontSize: 14 }}>
                      {detalleVentasFiltrado.length} registros
                    </span>
                  }
                >
                  {detalleVentasFiltrado.length === 0 ? (
                    <>
                      <EmptyState message="No se encontraron facturas con ese criterio." />
                      <Pagination
                        paginaActual={paginaVentas}
                        totalPaginas={totalPaginasVentas}
                        onPageChange={setPaginaVentas}
                      />
                    </>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Cliente</th>
                              <th>Vendedor</th>
                              <th>Método Pago</th>
                              <th>Subtotal</th>
                              <th>ISV</th>
                              <th>Total</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventasPaginadas.map((f) => {
                              const estado = getEstadoFactura(f.estado);

                              return (
                                <tr key={f.cod_factura}>
                                  <td className="fw-semibold">{f.cod_factura}</td>
                                  <td>{f.cliente}</td>
                                  <td>{f.nombre_usuario}</td>
                                  <td>{f.metodo_pago || '-'}</td>
                                  <td>{formatMoney(f.subtotal)}</td>
                                  <td>{formatMoney(f.isv)}</td>
                                  <td className="fw-bold">{formatMoney(f.total)}</td>
                                  <td>
                                    <span
                                      className={`badge rounded-pill px-3 py-2 ${estado.className}`}
                                    >
                                      {estado.text}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        paginaActual={paginaVentas}
                        totalPaginas={totalPaginasVentas}
                        onPageChange={setPaginaVentas}
                      />
                    </>
                  )}
                </TableCard>
              </>
            )}

            {tab === 'productos' && datos && (
              <>
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-8 col-lg-5">
                        <label className="form-label fw-semibold">Buscar producto</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white">
                            <FiSearch />
                          </span>
                          <SearchInput
                            className="form-control rounded-end-3"
                            placeholder="Nombre del producto..."
                            value={busquedaProducto}
                            onChange={(val) => setBusquedaProducto(val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <TableCard
                  title="Ranking de Productos Más Vendidos"
                  actions={
                    <span className="text-muted" style={{ fontSize: 14 }}>
                      {productosVendidosFiltrados.length} productos
                    </span>
                  }
                >
                  {productosVendidosFiltrados.length === 0 ? (
                    <>
                      <EmptyState message="No hay datos de ventas para mostrar." />
                      <Pagination
                        paginaActual={paginaProductos}
                        totalPaginas={totalPaginasProductos}
                        onPageChange={setPaginaProductos}
                      />
                    </>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Producto</th>
                              <th>Unidades Vendidas</th>
                              <th>Total Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosPaginados.map((p, i) => (
                              <tr
                                key={`${p.nombre_producto}-${
                                  (paginaProductos - 1) * REGISTROS_POR_PAGINA + i
                                }`}
                              >
                                <td>
                                  <span className="badge text-bg-dark rounded-pill px-3 py-2">
                                    {(paginaProductos - 1) * REGISTROS_POR_PAGINA + i + 1}
                                  </span>
                                </td>
                                <td className="fw-semibold">{p.nombre_producto}</td>
                                <td>{parseInt(p.total_vendido || 0, 10).toLocaleString()}</td>
                                <td className="fw-bold">{formatMoney(p.total_ingresos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        paginaActual={paginaProductos}
                        totalPaginas={totalPaginasProductos}
                        onPageChange={setPaginaProductos}
                      />
                    </>
                  )}
                </TableCard>
              </>
            )}

            {tab === 'inventario' && datos && (
              <>
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-8 col-lg-5">
                        <label className="form-label fw-semibold">Buscar producto o categoría</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white">
                            <FiSearch />
                          </span>
                          <SearchInput
                            className="form-control rounded-end-3"
                            placeholder="Ej. filtro, lubricantes..."
                            value={busquedaProducto}
                            onChange={(val) => setBusquedaProducto(val)}
                          />
                        </div>
                      </div>

                      <div className="col-md-4 col-lg-3">
                        <button
                          type="button"
                          className={`btn w-100 rounded-3 ${
                            soloStockBajo ? 'btn-danger' : 'btn-light'
                          }`}
                          onClick={() => setSoloStockBajo((prev) => !prev)}
                        >
                          <FiFilter className="me-2" />
                          {soloStockBajo ? 'Mostrando stock bajo' : 'Filtrar stock bajo'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <StatCard
                    title="Total productos"
                    value={resumenInventarioFiltrado.totalProductos || 0}
                    icon={<FiPackage />}
                    subtitle={busquedaProducto || soloStockBajo ? 'Productos filtrados' : 'Productos distintos registrados'}
                  />
                  <StatCard
                    title="Total unidades"
                    value={(resumenInventarioFiltrado.totalUnidades || 0).toLocaleString()}
                    icon={<FiDatabase />}
                    subtitle={busquedaProducto || soloStockBajo ? 'Suma de existencias filtradas' : 'Suma de existencias actuales'}
                  />
                  <StatCard
                    title="Valor total"
                    value={formatMoney(resumenInventarioFiltrado.valorTotal)}
                    icon={<FiDollarSign />}
                    valueClassName="text-success"
                    subtitle={busquedaProducto || soloStockBajo ? 'Valor estimado filtrado' : 'Valor estimado de venta'}
                  />
                  <StatCard
                    title="Stock bajo"
                    value={resumenInventarioFiltrado.stockBajo || 0}
                    icon={<FiTrendingUp />}
                    subtitle="Productos que requieren atención"
                  />
                </div>

                <TableCard
                  title="Inventario por Producto"
                  actions={
                    <span className="text-muted" style={{ fontSize: 14 }}>
                      {inventarioFiltrado.length} registros
                    </span>
                  }
                >
                  {inventarioFiltrado.length === 0 ? (
                    <>
                      <EmptyState message="No se encontraron productos para mostrar." />
                      <Pagination
                        paginaActual={paginaInventario}
                        totalPaginas={totalPaginasInventario}
                        onPageChange={setPaginaInventario}
                      />
                    </>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Producto</th>
                              <th>Categoría</th>
                              <th>Precio Venta</th>
                              <th>Stock</th>
                              <th>Stock Mín.</th>
                              <th>Valor Total</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventarioPaginado.map((p, i) => {
                              const estado = getEstadoStock(p.stock_total, p.stock_minimo);

                              return (
                                <tr
                                  key={`${p.nombre_producto}-${
                                    (paginaInventario - 1) * REGISTROS_POR_PAGINA + i
                                  }`}
                                >
                                  <td className="fw-semibold">{p.nombre_producto}</td>
                                  <td>{p.nombre_categoria || '-'}</td>
                                  <td>{formatMoney(p.precio_venta)}</td>
                                  <td>{parseInt(p.stock_total || 0, 10)}</td>
                                  <td>{parseInt(p.stock_minimo || 0, 10)}</td>
                                  <td className="fw-bold">{formatMoney(p.valor_total)}</td>
                                  <td>
                                    <span
                                      className={`badge rounded-pill px-3 py-2 ${estado.className}`}
                                    >
                                      {estado.text}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        paginaActual={paginaInventario}
                        totalPaginas={totalPaginasInventario}
                        onPageChange={setPaginaInventario}
                      />
                    </>
                  )}
                </TableCard>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reportes;
