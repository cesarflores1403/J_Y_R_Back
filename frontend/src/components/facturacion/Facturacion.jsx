import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { facturaService, pagoService } from '../../services/serviceIndex.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useConfirm } from '../../contexts/ConfirmDialogContext.jsx';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiTrash2, FiFileText,
  FiShoppingCart, FiEye, FiXCircle, FiPercent, FiDollarSign,
  FiCreditCard, FiCheckCircle, FiPrinter
} from 'react-icons/fi';
import ComprobanteFactura from './ComprobanteFactura.jsx';
import { confirmDialog } from '../../utils/notifications.js';

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return 'L ' + n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const limpiarSoloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');
const limpiarNumeroDecimal = (valor) => {
  const raw = String(valor ?? '').replace(/,/g, '.');
  let resultado = '';
  let tienePunto = false;
  for (const ch of raw) {
    if (/\d/.test(ch)) {
      resultado += ch;
      continue;
    }
    if (ch === '.' && !tienePunto) {
      resultado += ch;
      tienePunto = true;
    }
  }
  return resultado;
};

const MOTIVOS_ANULACION_GENERICOS = new Set([
  'anular',
  'anulacion',
  'anulacion factura',
  'cancelar',
  'cancelacion',
  'cancelacion factura',
  'motivo',
  'justificacion',
  'error',
  'prueba',
  'test',
  'n/a',
  'na',
  'ninguno',
  'sin motivo',
  'no aplica'
]);

const validarMotivoAnulacionFactura = (motivo = '') => {
  const texto = String(motivo || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const textoPlano = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const letras = textoPlano.replace(/[^a-z0-9]/g, '');
  const palabrasConSentido = textoPlano.split(/\s+/).filter((p) => p.length >= 3);

  if (!texto) return 'El motivo de anulacion es obligatorio';
  if (texto.length < 15) return 'Debe tener al menos 15 caracteres';
  if (palabrasConSentido.length < 3) return 'Explique la causa con al menos 3 palabras';
  if (/^\d+$/.test(letras)) return 'No puede contener solo numeros';
  if (/(.)\1{4,}/i.test(letras) || new Set(letras).size < 5) return 'No parece una justificacion valida';
  if (MOTIVOS_ANULACION_GENERICOS.has(textoPlano)) return 'El motivo es demasiado generico';
  return '';
};

const Facturacion = () => {
  const { usuario } = useAuth();
  const confirm = useConfirm();

  // ========== LISTA FACTURAS ==========
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // ========== MODAL NUEVA FACTURA ==========
  const [modalNueva, setModalNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cliente seleccionado
  const [clientes, setClientes] = useState([]);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClientes, setShowClientes] = useState(false);

  // Productos disponibles
  const [productos, setProductos] = useState([]);
  const [buscarProducto, setBuscarProducto] = useState('');
  const [showProductos, setShowProductos] = useState(false);

  // Items de la factura
  const [items, setItems] = useState([]);

  // Método de pago
  const [metodoPago, setMetodoPago] = useState('');
  const [refPago, setRefPago] = useState('');

  // Descuento global (HU-FAC-04)
  const [descuentoGlobal, setDescuentoGlobal] = useState('');
  const [tipoDescuentoGlobal, setTipoDescuentoGlobal] = useState('PORCENTAJE');

  // ========== MODAL VER DETALLE ==========
  const [modalDetalle, setModalDetalle] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState(null);

  // ========== MODAL PAGOS (HU-FAC-05) ==========
  const [modalPagos, setModalPagos] = useState(false);
  const [pagoFactura, setPagoFactura] = useState(null); // info resumen factura
  const [pagosLista, setPagosLista] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({ monto: '', metodo_pago: '', ref_pago: '', observacion: '' });
  const [guardandoPago, setGuardandoPago] = useState(false);

  // ========== COMPROBANTE IMPRESIÓN (HU-FAC-06) ==========
  const [comprobanteFactura, setComprobanteFactura] = useState(null);
  const comprobanteRef = useRef(null);

  const clienteRef = useRef(null);
  const productoRef = useRef(null);

  // ========== CARGAR FACTURAS ==========
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await facturaService.listar({ pagina, limite: 15, buscar });
      if (data.ok) {
        setFacturas(data.datos);
        setTotalPaginas(data.totalPaginas);
      }
    } catch {
      toast.error('Error al cargar facturas');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  // ========== BUSCAR CLIENTES ==========
  useEffect(() => {
    if (!modalNueva) return;
    const timeout = setTimeout(async () => {
      try {
        const { data } = await facturaService.clientesDisponibles({ buscar: buscarCliente });
        if (data.ok) setClientes(data.datos);
      } catch { /* silencio */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscarCliente, modalNueva]);

  // ========== BUSCAR PRODUCTOS ==========
  useEffect(() => {
    if (!modalNueva) return;
    const timeout = setTimeout(async () => {
      try {
        const { data } = await facturaService.productosDisponibles({ buscar: buscarProducto });
        if (data.ok) setProductos(data.datos);
      } catch { /* silencio */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscarProducto, modalNueva]);

  // ========== SELECCIONAR CLIENTE ==========
  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setBuscarCliente(`${c.nombre} ${c.apellido || ''} ${c.dni ? '- ' + c.dni : ''}`);
    setShowClientes(false);
  };

  // ========== AGREGAR PRODUCTO A ITEMS ==========
  const agregarProducto = (p) => {
    const existe = items.find(i => i.cod_producto === p.cod_producto);
    if (existe) {
      if (existe.cantidad + 1 > p.stock) {
        toast.warn(`Stock insuficiente para "${p.nombre_producto}". Disponible: ${p.stock}`);
        return;
      }
      setItems(items.map(i =>
        i.cod_producto === p.cod_producto ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      if (p.stock < 1) {
        toast.warn(`"${p.nombre_producto}" sin stock`);
        return;
      }
      setItems([...items, {
        cod_producto: p.cod_producto,
        nombre_producto: p.nombre_producto,
        unidad_medida: p.unidad_medida,
        precio_venta: parseFloat(p.precio_venta),
        isv_pct: parseFloat(p.isv) || 0,
        stock: p.stock,
        cantidad: 1,
        descuento: 0,
        tipo_descuento: 'PORCENTAJE'
      }]);
    }
    setBuscarProducto('');
    setShowProductos(false);
  };

  // ========== CAMBIAR CANTIDAD ==========
  const cambiarCantidad = (codProd, nuevaCant) => {
    const limpio = limpiarSoloDigitos(nuevaCant);
    setItems(items.map(i => {
      if (i.cod_producto !== codProd) return i;
      if (limpio === '') return { ...i, cantidad: '' };
      const cant = parseInt(limpio, 10);
      if (cant > i.stock) {
        toast.warn(`Stock máx: ${i.stock}`);
        return { ...i, cantidad: i.stock };
      }
      return { ...i, cantidad: cant < 1 ? 1 : cant };
    }));
  };

  // ========== ELIMINAR ITEM ==========
  const eliminarItem = (codProd) => {
    setItems(items.filter(i => i.cod_producto !== codProd));
  };

  // ========== CAMBIAR DESCUENTO POR LÍNEA (HU-FAC-04) ==========
  const cambiarDescuentoLinea = (codProd, valor) => {
    const limpio = limpiarNumeroDecimal(valor);
    setItems(items.map(i => {
      if (i.cod_producto !== codProd) return i;
      if (limpio === '' || limpio === '.') return { ...i, descuento: '' };
      const v = parseFloat(limpio) || 0;
      // Validar límites
      if (v < 0) return { ...i, descuento: 0 };
      if (i.tipo_descuento === 'PORCENTAJE' && v > 100) {
        toast.warn('El descuento en % no puede ser mayor a 100');
        return { ...i, descuento: 100 };
      }
      const subtotalBruto = i.precio_venta * i.cantidad;
      if (i.tipo_descuento === 'MONTO' && v > subtotalBruto) {
        toast.warn(`El descuento no puede ser mayor al subtotal (${formatMoney(subtotalBruto)})`);
        return { ...i, descuento: subtotalBruto };
      }
      return { ...i, descuento: v };
    }));
  };

  const cambiarTipoDescuentoLinea = (codProd, tipo) => {
    setItems(items.map(i => {
      if (i.cod_producto !== codProd) return i;
      return { ...i, tipo_descuento: tipo, descuento: 0 };
    }));
  };

  // ========== CALCULAR TOTALES (HU-FAC-04: con descuentos) ==========
  const calcularTotales = () => {
    let subtotalBruto = 0;
    let descuentoLineas = 0;
    let subtotal = 0;
    let isv = 0;

    items.forEach(i => {
      const bruto = i.precio_venta * i.cantidad;
      let montoDesc = 0;
      if (i.tipo_descuento === 'PORCENTAJE') {
        montoDesc = (i.descuento / 100) * bruto;
      } else {
        montoDesc = Math.min(i.descuento, bruto);
      }
      const subItem = bruto - montoDesc;
      const isvItem = (i.isv_pct / 100) * subItem;
      subtotalBruto += bruto;
      descuentoLineas += montoDesc;
      subtotal += subItem;
      isv += isvItem;
    });

    // Descuento global
    const descGlobal = parseFloat(descuentoGlobal) || 0;
    let montoDescGlobal = 0;
    if (descGlobal > 0) {
      if (tipoDescuentoGlobal === 'PORCENTAJE') {
        montoDescGlobal = (descGlobal / 100) * subtotal;
      } else {
        montoDescGlobal = Math.min(descGlobal, subtotal);
      }
      // Recalcular ISV proporcionalmente
      if (subtotal > 0) {
        const factor = (subtotal - montoDescGlobal) / subtotal;
        isv = isv * factor;
      }
      subtotal = subtotal - montoDescGlobal;
    }

    const descuentoTotal = descuentoLineas + montoDescGlobal;
    const total = subtotal + isv;

    return {
      subtotalBruto: Math.round(subtotalBruto * 100) / 100,
      descuentoLineas: Math.round(descuentoLineas * 100) / 100,
      montoDescGlobal: Math.round(montoDescGlobal * 100) / 100,
      descuentoTotal: Math.round(descuentoTotal * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      isv: Math.round(isv * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  const totales = calcularTotales();

  // ========== ABRIR MODAL NUEVA FACTURA ==========
  const abrirNuevaFactura = () => {
    setClienteSeleccionado(null);
    setBuscarCliente('');
    setItems([]);
    setMetodoPago('');
    setRefPago('');
    setDescuentoGlobal('');
    setTipoDescuentoGlobal('PORCENTAJE');
    setModalNueva(true);
  };

  // ========== GUARDAR FACTURA ==========
  const guardarFactura = async () => {
    if (!clienteSeleccionado) { toast.warn('Selecciona un cliente'); return; }
    if (items.length === 0) { toast.warn('Agrega al menos 1 producto'); return; }

    setGuardando(true);
    try {
      const payload = {
        cod_cliente: clienteSeleccionado.cod_cliente,
        metodo_pago: metodoPago ? parseInt(metodoPago) : null,
        ref_pago: refPago || null,
        descuento_global: parseFloat(descuentoGlobal) || 0,
        tipo_descuento_global: (parseFloat(descuentoGlobal) || 0) > 0 ? tipoDescuentoGlobal : null,
        items: items.map(i => ({
          cod_producto: i.cod_producto,
          cantidad: i.cantidad,
          descuento: i.descuento || 0,
          tipo_descuento: i.tipo_descuento || 'PORCENTAJE'
        }))
      };

      const { data } = await facturaService.crear(payload);
      if (data.ok) {
        toast.success(`Factura #${data.datos.cod_factura} creada exitosamente`);
        setModalNueva(false);
        cargar();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear factura');
    } finally {
      setGuardando(false);
    }
  };

  // ========== VER DETALLE ==========
  const verDetalle = async (id) => {
    try {
      const { data } = await facturaService.obtener(id);
      if (data.ok) {
        setFacturaDetalle(data.datos);
        setModalDetalle(true);
      }
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  // ========== ANULAR FACTURA ==========
  const anularFactura = async (id) => {
    const motivo = window.prompt(
      'Motivo de anulacion (minimo 15 caracteres y 3 palabras):',
      ''
    );
    if (motivo === null) return;

    const errorMotivo = validarMotivoAnulacionFactura(motivo);
    if (errorMotivo) {
      toast.warn(errorMotivo);
      return;
    }

    const ok = await confirmDialog({
      variant: 'cancel',
      title: 'Anular factura',
      text: '¿Está seguro de anular esta factura? Se restaurará el inventario.',
      confirmText: 'Sí, anular'
    });
    if (!ok) return;
    try {
      const { data } = await facturaService.anular(id, motivo.trim());
      if (data.ok) {
        toast.success('Factura anulada');
        cargar();
        if (modalDetalle) setModalDetalle(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular');
    }
  };

  // ========== MODAL PAGOS (HU-FAC-05) ==========
  const abrirModalPagos = async (codFactura) => {
    try {
      const { data } = await pagoService.listarPorFactura(codFactura);
      if (data.ok) {
        setPagoFactura(data.factura);
        setPagosLista(data.pagos);
        setNuevoPago({ monto: '', metodo_pago: '', ref_pago: '', observacion: '' });
        setModalPagos(true);
      }
    } catch {
      toast.error('Error al cargar pagos');
    }
  };

  const registrarPago = async () => {
    if (!nuevoPago.monto || parseFloat(nuevoPago.monto) <= 0) {
      toast.warn('Ingresa un monto válido'); return;
    }
    if (!nuevoPago.metodo_pago) {
      toast.warn('Selecciona un método de pago'); return;
    }

    setGuardandoPago(true);
    try {
      const payload = {
        cod_factura: pagoFactura.cod_factura,
        monto: parseFloat(nuevoPago.monto),
        metodo_pago: parseInt(nuevoPago.metodo_pago),
        ref_pago: nuevoPago.ref_pago || null,
        observacion: nuevoPago.observacion || null
      };
      const { data } = await pagoService.registrar(payload);
      if (data.ok) {
        toast.success(data.mensaje || 'Pago registrado');
        // Recargar pagos
        await abrirModalPagos(pagoFactura.cod_factura);
        cargar(); // recargar lista de facturas
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al registrar pago');
    } finally {
      setGuardandoPago(false);
    }
  };

  const anularPago = async (codPago) => {
    const ok = await confirmDialog({
      variant: 'cancel',
      title: 'Anular pago',
      text: '¿Está seguro de anular este pago?',
      confirmText: 'Sí, anular'
    });
    if (!ok) return;
    try {
      const { data } = await pagoService.anular(codPago);
      if (data.ok) {
        toast.success(data.mensaje || 'Pago anulado');
        await abrirModalPagos(pagoFactura.cod_factura);
        cargar();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al anular pago');
    }
  };

  const metodosPago = { 1: 'Efectivo', 2: 'Tarjeta', 3: 'Transferencia' };

  // ========== IMPRIMIR / PDF COMPROBANTE (HU-FAC-06) ==========
  const handlePrint = useReactToPrint({
    content: () => comprobanteRef.current,
    documentTitle: comprobanteFactura ? `Factura_FAC-${String((comprobanteFactura.factura || comprobanteFactura).cod_factura).padStart(4, '0')}` : 'Comprobante',
    onAfterPrint: () => toast.info('Comprobante generado'),
    pageStyle: `
      @page { size: letter; margin: 10mm 8mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `
  });

  const imprimirComprobante = async (codFactura) => {
    try {
      const { data } = await facturaService.obtener(codFactura);
      if (data.ok) {
        setComprobanteFactura(data.datos);
        toast.info('Comprobante cargado. Generando impresión...');
        // Esperar a que se renderice el comprobante antes de imprimir (hasta 3s)
        const waitForRenderAndPrint = async () => {
          const start = Date.now();
          while (Date.now() - start < 3000) {
            if (comprobanteRef.current && comprobanteRef.current.innerText && comprobanteRef.current.innerText.trim().length > 20) {
              handlePrint();
              return;
            }
            await new Promise(r => setTimeout(r, 100));
          }
          // Fallback: imprimir de todos modos
          handlePrint();
        };
        waitForRenderAndPrint();
      }
    } catch {
      toast.error('Error al cargar datos para el comprobante');
    }
  };

  const badgeEstadoPago = (estado) => {
    switch (estado) {
      case 'PAGADA': return <span className="badge bg-success">Pagada</span>;
      case 'PARCIAL': return <span className="badge bg-warning text-dark">Parcial</span>;
      default: return <span className="badge bg-secondary">Pendiente</span>;
    }
  };

  // ========== CERRAR DROPDOWNS AL CLICK FUERA ==========
  useEffect(() => {
    const handler = (e) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) setShowClientes(false);
      if (productoRef.current && !productoRef.current.contains(e.target)) setShowProductos(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      {/* ========== HEADER ========== */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0"><FiFileText className="me-2" />Facturación</h3>
        {(usuario?.rol === 'Administrador' || usuario?.rol === 'Cajero') && (
          <button className="btn jyr-btn-primary" onClick={abrirNuevaFactura}>
            <FiPlus className="me-2" />Nueva Factura
          </button>
        )}
      </div>

      {/* ========== BUSCADOR ========== */}
      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="input-group">
            <span className="input-group-text"><FiSearch /></span>
            <input type="text" className="form-control" placeholder="Buscar por cliente, DNI..."
              value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
            {buscar && <button className="btn btn-outline-secondary" onClick={() => { setBuscar(''); setPagina(1); }}><FiX /></button>}
          </div>
        </div>
      </div>

      {/* ========== TABLA FACTURAS ========== */}
      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="8" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
                ) : facturas.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No se encontraron facturas</td></tr>
                ) : facturas.map((f) => (
                  <tr key={f.cod_factura} className={!f.estado ? 'text-decoration-line-through opacity-50' : ''}>
                    <td><strong>FAC-{String(f.cod_factura).padStart(4, '0')}</strong></td>
                    <td>{f.cliente?.nombre} {f.cliente?.apellido || ''}</td>
                    <td><strong>{formatMoney(f.total)}</strong></td>
                    <td>{formatMoney(f.total_pagado || 0)}</td>
                    <td>
                      {parseFloat(f.saldo || f.total) > 0
                        ? <span className="text-danger fw-bold">{formatMoney(f.saldo || f.total)}</span>
                        : <span className="text-success">L 0.00</span>}
                    </td>
                    <td>{badgeEstadoPago(f.estado_pago)}</td>
                    <td>
                      <span className={`badge ${f.estado ? 'bg-success' : 'bg-danger'}`}>
                        {f.estado ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => verDetalle(f.cod_factura)} title="Ver detalle">
                        <FiEye />
                      </button>
                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => imprimirComprobante(f.cod_factura)} title="Imprimir comprobante">
                        <FiPrinter />
                      </button>
                      {f.estado && f.estado_pago !== 'PAGADA' && (usuario?.rol === 'Administrador' || usuario?.rol === 'Cajero') && (
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => abrirModalPagos(f.cod_factura)} title="Registrar pago">
                          <FiCreditCard />
                        </button>
                      )}
                      {f.estado && f.estado_pago === 'PAGADA' && (
                        <button className="btn btn-sm btn-success me-1" onClick={() => abrirModalPagos(f.cod_factura)} title="Ver pagos" disabled={false}>
                          <FiCheckCircle />
                        </button>
                      )}
                      {f.estado && usuario?.rol === 'Administrador' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => anularFactura(f.cod_factura)} title="Anular">
                          <FiXCircle />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== PAGINACIÓN ========== */}
      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav><ul className="pagination pagination-sm">
            <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPagina(p => p - 1)}>Anterior</button>
            </li>
            {[...Array(totalPaginas)].map((_, i) => (
              <li key={i} className={`page-item ${pagina === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPagina(i + 1)}>{i + 1}</button>
              </li>
            ))}
            <li className={`page-item ${pagina >= totalPaginas ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPagina(p => p + 1)}>Siguiente</button>
            </li>
          </ul></nav>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: NUEVA FACTURA                                             */}
      {/* ================================================================ */}
      {modalNueva && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><FiShoppingCart className="me-2" />Nueva Factura</h5>
                <button className="btn-close" onClick={() => setModalNueva(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">

                  {/* ---------- SELECTOR CLIENTE ---------- */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Cliente *</label>
                    <div ref={clienteRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><FiSearch /></span>
                        <input type="text" className="form-control" placeholder="Buscar cliente..."
                          value={buscarCliente}
                          onChange={(e) => { setBuscarCliente(e.target.value); setClienteSeleccionado(null); setShowClientes(true); }}
                          onFocus={() => setShowClientes(true)} />
                        {clienteSeleccionado && (
                          <button className="btn btn-outline-secondary" onClick={() => { setClienteSeleccionado(null); setBuscarCliente(''); }}>
                            <FiX />
                          </button>
                        )}
                      </div>
                      {showClientes && !clienteSeleccionado && (
                        <div className="list-group" style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          {clientes.length === 0 ? (
                            <div className="list-group-item text-muted">No se encontraron clientes</div>
                          ) : clientes.map(c => (
                            <button key={c.cod_cliente} type="button" className="list-group-item list-group-item-action"
                              onClick={() => seleccionarCliente(c)}>
                              <strong>{c.nombre} {c.apellido || ''}</strong>
                              {c.dni && <small className="text-muted ms-2">DNI: {c.dni}</small>}
                              {c.empresa && <small className="text-muted ms-2">({c.empresa})</small>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---------- MÉTODO PAGO ---------- */}
                  <div className="col-md-3">
                    <label className="form-label fw-bold">Método de Pago</label>
                    <select className="form-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                      <option value="">-- Seleccionar --</option>
                      <option value="1">Efectivo</option>
                      <option value="2">Tarjeta</option>
                      <option value="3">Transferencia</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Ref. Pago</label>
                    <input type="text" className="form-control" placeholder="Nro. referencia"
                      value={refPago} onChange={(e) => setRefPago(e.target.value)} />
                  </div>

                  {/* ---------- AGREGAR PRODUCTOS ---------- */}
                  <div className="col-12">
                    <label className="form-label fw-bold">Agregar Productos</label>
                    <div ref={productoRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><FiSearch /></span>
                        <input type="text" className="form-control" placeholder="Buscar producto por nombre..."
                          value={buscarProducto}
                          onChange={(e) => { setBuscarProducto(e.target.value); setShowProductos(true); }}
                          onFocus={() => setShowProductos(true)} />
                      </div>
                      {showProductos && (
                        <div className="list-group" style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: 250, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          {productos.length === 0 ? (
                            <div className="list-group-item text-muted">No se encontraron productos</div>
                          ) : productos.map(p => (
                            <button key={p.cod_producto} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                              onClick={() => agregarProducto(p)}>
                              <div>
                                <strong>{p.nombre_producto}</strong>
                                <small className="text-muted ms-2">{p.unidad_medida || ''}</small>
                              </div>
                              <div className="text-end">
                                <span className="me-3">{formatMoney(p.precio_venta)}</span>
                                <span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>Stock: {p.stock}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---------- TABLA ITEMS ---------- */}
                  <div className="col-12">
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Producto</th>
                            <th style={{ width: 90 }}>Cantidad</th>
                            <th>P. Unitario</th>
                            <th style={{ width: 180 }}>Descuento</th>
                            <th>ISV %</th>
                            <th>Subtotal</th>
                            <th>ISV</th>
                            <th>Total</th>
                            <th style={{ width: 50 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan="9" className="text-center text-muted py-3">Agrega productos a la factura</td></tr>
                          ) : items.map((item) => {
                            const bruto = item.precio_venta * item.cantidad;
                            let montoDesc = 0;
                            if (item.tipo_descuento === 'PORCENTAJE') {
                              montoDesc = (item.descuento / 100) * bruto;
                            } else {
                              montoDesc = Math.min(item.descuento, bruto);
                            }
                            const sub = bruto - montoDesc;
                            const isvItem = (item.isv_pct / 100) * sub;
                            const totalItem = sub + isvItem;
                            return (
                              <tr key={item.cod_producto}>
                                <td>{item.nombre_producto} <small className="text-muted">({item.unidad_medida || '-'})</small></td>
                                <td>
                                  <input type="text" className="form-control form-control-sm text-center"
                                    inputMode="numeric" pattern="[0-9]*" value={item.cantidad}
                                    onChange={(e) => cambiarCantidad(item.cod_producto, e.target.value)} />
                                </td>
                                <td>{formatMoney(item.precio_venta)}</td>
                                <td>
                                  <div className="input-group input-group-sm">
                                    <button
                                      className={`btn btn-sm ${item.tipo_descuento === 'PORCENTAJE' ? 'btn-warning' : 'btn-outline-warning'}`}
                                      type="button" title="Porcentaje"
                                      onClick={() => cambiarTipoDescuentoLinea(item.cod_producto, 'PORCENTAJE')}>
                                      <FiPercent size={12} />
                                    </button>
                                    <button
                                      className={`btn btn-sm ${item.tipo_descuento === 'MONTO' ? 'btn-info' : 'btn-outline-info'}`}
                                      type="button" title="Monto fijo"
                                      onClick={() => cambiarTipoDescuentoLinea(item.cod_producto, 'MONTO')}>
                                      L
                                    </button>
                                    <input type="text" className="form-control form-control-sm text-center" style={{ maxWidth: 70 }}
                                      inputMode="decimal"
                                      value={item.descuento ?? ''}
                                      placeholder="0"
                                      onChange={(e) => cambiarDescuentoLinea(item.cod_producto, e.target.value)} />
                                  </div>
                                  {montoDesc > 0 && (
                                    <small className="text-danger">-{formatMoney(montoDesc)}</small>
                                  )}
                                </td>
                                <td>{item.isv_pct}%</td>
                                <td>{formatMoney(sub)}</td>
                                <td>{formatMoney(isvItem)}</td>
                                <td><strong>{formatMoney(totalItem)}</strong></td>
                                <td>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarItem(item.cod_producto)}>
                                    <FiTrash2 />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ---------- DESCUENTO GLOBAL Y RESUMEN TOTALES (HU-FAC-04) ---------- */}
                  {items.length > 0 && (
                    <div className="col-12">
                      <div className="row">
                        {/* Descuento global */}
                        <div className="col-md-6">
                          <div className="card border-warning">
                            <div className="card-body py-2">
                              <label className="form-label fw-bold mb-1">
                                <FiPercent className="me-1" />Descuento Global (factura)
                              </label>
                              <div className="input-group input-group-sm">
                                <select className="form-select" style={{ maxWidth: 130 }}
                                  value={tipoDescuentoGlobal}
                                  onChange={(e) => { setTipoDescuentoGlobal(e.target.value); setDescuentoGlobal(''); }}>
                                  <option value="PORCENTAJE">% Porcentaje</option>
                                  <option value="MONTO">L Monto fijo</option>
                                </select>
                                <input type="number" className="form-control" min="0" step="0.01"
                                  max={tipoDescuentoGlobal === 'PORCENTAJE' ? 100 : undefined}
                                  placeholder={tipoDescuentoGlobal === 'PORCENTAJE' ? 'Ej: 10' : 'Ej: 500.00'}
                                  value={descuentoGlobal}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value) || 0;
                                    if (v < 0) return;
                                    if (tipoDescuentoGlobal === 'PORCENTAJE' && v > 100) {
                                      toast.warn('El descuento global en % no puede ser mayor a 100');
                                      setDescuentoGlobal('100');
                                      return;
                                    }
                                    setDescuentoGlobal(e.target.value);
                                  }} />
                              </div>
                              {totales.montoDescGlobal > 0 && (
                                <small className="text-danger mt-1 d-block">
                                  Descuento global: -{formatMoney(totales.montoDescGlobal)}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Resumen totales */}
                        <div className="col-md-6">
                          <div style={{ minWidth: 280 }}>
                            <div className="d-flex justify-content-between py-1">
                              <span>Subtotal bruto:</span> <span>{formatMoney(totales.subtotalBruto)}</span>
                            </div>
                            {totales.descuentoLineas > 0 && (
                              <div className="d-flex justify-content-between py-1 text-danger">
                                <span>Desc. líneas:</span> <span>-{formatMoney(totales.descuentoLineas)}</span>
                              </div>
                            )}
                            {totales.montoDescGlobal > 0 && (
                              <div className="d-flex justify-content-between py-1 text-danger">
                                <span>Desc. global:</span> <span>-{formatMoney(totales.montoDescGlobal)}</span>
                              </div>
                            )}
                            {totales.descuentoTotal > 0 && (
                              <div className="d-flex justify-content-between py-1 text-danger fw-bold">
                                <span>Total descuentos:</span> <span>-{formatMoney(totales.descuentoTotal)}</span>
                              </div>
                            )}
                            <div className="d-flex justify-content-between py-1">
                              <span>Subtotal:</span> <strong>{formatMoney(totales.subtotal)}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-1">
                              <span>ISV:</span> <strong>{formatMoney(totales.isv)}</strong>
                            </div>
                            <hr className="my-1" />
                            <div className="d-flex justify-content-between py-1" style={{ fontSize: '1.2em' }}>
                              <span>TOTAL:</span> <strong className="text-success">{formatMoney(totales.total)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalNueva(false)}>Cancelar</button>
                <button type="button" className="btn jyr-btn-primary" disabled={guardando || items.length === 0 || !clienteSeleccionado}
                  onClick={guardarFactura}>
                  {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : <FiFileText className="me-2" />}
                  Emitir Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: DETALLE FACTURA                                           */}
      {/* ================================================================ */}
      {modalDetalle && facturaDetalle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Factura FAC-{String(facturaDetalle.cod_factura).padStart(4, '0')}
                  {!facturaDetalle.estado && <span className="badge bg-danger ms-2">Anulada</span>}
                </h5>
                <button className="btn-close" onClick={() => setModalDetalle(false)} />
              </div>
              <div className="modal-body">
                {/* Info general */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Cliente:</strong> {facturaDetalle.cliente?.nombre} {facturaDetalle.cliente?.apellido || ''}</p>
                    {facturaDetalle.cliente?.dni && <p className="mb-1"><strong>DNI:</strong> {facturaDetalle.cliente.dni}</p>}
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Cajero:</strong> {facturaDetalle.usuario?.nombre}</p>
                    <p className="mb-1"><strong>Código:</strong> FAC-{String(facturaDetalle.cod_factura).padStart(4, '0')}</p>
                    {facturaDetalle.descuento_aplicado_por && (
                      <p className="mb-1"><small className="text-warning"><strong>Descuento aplicado por usuario #{facturaDetalle.descuento_aplicado_por}</strong></small></p>
                    )}
                  </div>
                </div>

                {/* Tabla detalles */}
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>P. Unit.</th>
                        <th>Descuento</th>
                        <th>ISV</th>
                        <th>Subtotal</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaDetalle.detalles?.map((d, i) => (
                        <tr key={i}>
                          <td>{d.producto?.nombre_producto || `Prod. ${d.cod_producto}`}</td>
                          <td className="text-center">{d.cantidad}</td>
                          <td>{formatMoney(d.precio_unitario)}</td>
                          <td>
                            {parseFloat(d.monto_descuento || 0) > 0 ? (
                              <span className="text-danger">
                                -{formatMoney(d.monto_descuento)}
                                <small className="ms-1">({d.tipo_descuento === 'PORCENTAJE' ? `${d.descuento}%` : `L ${d.descuento}`})</small>
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{formatMoney(d.isv)}</td>
                          <td>{formatMoney(d.subtotal)}</td>
                          <td><strong>{formatMoney(d.total)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="d-flex justify-content-end mt-2">
                  <div style={{ minWidth: 280 }}>
                    <div className="d-flex justify-content-between py-1">
                      <span>Subtotal:</span> <strong>{formatMoney(facturaDetalle.subtotal)}</strong>
                    </div>
                    {parseFloat(facturaDetalle.descuento || 0) > 0 && (
                      <div className="d-flex justify-content-between py-1 text-danger">
                        <span>Descuento total:</span> <strong>-{formatMoney(facturaDetalle.descuento)}</strong>
                      </div>
                    )}
                    {parseFloat(facturaDetalle.monto_descuento_global || 0) > 0 && (
                      <div className="d-flex justify-content-between py-1 text-danger">
                        <span>
                          Desc. global
                          <small className="ms-1">
                            ({facturaDetalle.tipo_descuento_global === 'PORCENTAJE' ? `${facturaDetalle.descuento_global}%` : `L ${facturaDetalle.descuento_global}`})
                          </small>
                        :</span>
                        <strong>-{formatMoney(facturaDetalle.monto_descuento_global)}</strong>
                      </div>
                    )}
                    <div className="d-flex justify-content-between py-1">
                      <span>ISV:</span> <strong>{formatMoney(facturaDetalle.isv)}</strong>
                    </div>
                    <hr className="my-1" />
                    <div className="d-flex justify-content-between py-1" style={{ fontSize: '1.15em' }}>
                      <span>TOTAL:</span> <strong className="text-success">{formatMoney(facturaDetalle.total)}</strong>
                    </div>
                    {/* Info de pagos en detalle */}
                    {facturaDetalle.estado && (
                      <>
                        <hr className="my-1" />
                        <div className="d-flex justify-content-between py-1">
                          <span>Pagado:</span> <strong className="text-success">{formatMoney(facturaDetalle.total_pagado || 0)}</strong>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <span>Saldo:</span>
                          <strong className={parseFloat(facturaDetalle.saldo || facturaDetalle.total) > 0 ? 'text-danger' : 'text-success'}>
                            {formatMoney(facturaDetalle.saldo || facturaDetalle.total)}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <span>Estado pago:</span> {badgeEstadoPago(facturaDetalle.estado_pago)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-dark me-auto" onClick={() => imprimirComprobante(facturaDetalle.cod_factura)}>
                  <FiPrinter className="me-2" />Imprimir / PDF
                </button>
                {facturaDetalle.estado && facturaDetalle.estado_pago !== 'PAGADA' && (usuario?.rol === 'Administrador' || usuario?.rol === 'Cajero') && (
                  <button className="btn btn-success" onClick={() => { setModalDetalle(false); abrirModalPagos(facturaDetalle.cod_factura); }}>
                    <FiCreditCard className="me-2" />Registrar Pago
                  </button>
                )}
                {facturaDetalle.estado && usuario?.rol === 'Administrador' && (
                  <button className="btn btn-danger" onClick={() => anularFactura(facturaDetalle.cod_factura)}>
                    <FiXCircle className="me-2" />Anular Factura
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setModalDetalle(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================================================================ */}
      {/* MODAL: PAGOS (HU-FAC-05)                                         */}
      {/* ================================================================ */}
      {modalPagos && pagoFactura && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FiCreditCard className="me-2" />
                  Pagos — FAC-{String(pagoFactura.cod_factura).padStart(4, '0')}
                  <span className="ms-2">{badgeEstadoPago(pagoFactura.estado_pago)}</span>
                </h5>
                <button className="btn-close" onClick={() => setModalPagos(false)} />
              </div>
              <div className="modal-body">

                {/* Resumen de saldo */}
                <div className="row mb-3">
                  <div className="col-md-4 text-center">
                    <div className="border rounded p-2">
                      <small className="text-muted d-block">Total Factura</small>
                      <strong className="fs-5">{formatMoney(pagoFactura.total)}</strong>
                    </div>
                  </div>
                  <div className="col-md-4 text-center">
                    <div className="border rounded p-2 border-success">
                      <small className="text-muted d-block">Total Pagado</small>
                      <strong className="fs-5 text-success">{formatMoney(pagoFactura.total_pagado)}</strong>
                    </div>
                  </div>
                  <div className="col-md-4 text-center">
                    <div className="border rounded p-2 border-danger">
                      <small className="text-muted d-block">Saldo Pendiente</small>
                      <strong className="fs-5 text-danger">{formatMoney(pagoFactura.saldo)}</strong>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="progress mb-3" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${pagoFactura.estado_pago === 'PAGADA' ? 'bg-success' : 'bg-warning'}`}
                    style={{ width: `${pagoFactura.total > 0 ? Math.min((pagoFactura.total_pagado / pagoFactura.total) * 100, 100) : 0}%` }}
                  />
                </div>

                {/* Formulario nuevo pago */}
                {pagoFactura.estado_pago !== 'PAGADA' && pagoFactura.estado && (usuario?.rol === 'Administrador' || usuario?.rol === 'Cajero') && (
                  <div className="card border-success mb-3">
                    <div className="card-header bg-success bg-opacity-10 py-2">
                      <strong><FiPlus className="me-1" />Registrar Nuevo Pago</strong>
                    </div>
                    <div className="card-body py-2">
                      <div className="row g-2 align-items-end">
                        <div className="col-md-3">
                          <label className="form-label form-label-sm mb-1">Monto *</label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">L</span>
                            <input type="number" className="form-control" min="0.01" step="0.01"
                              max={pagoFactura.saldo}
                              placeholder={`Máx: ${pagoFactura.saldo}`}
                              value={nuevoPago.monto}
                              onChange={(e) => setNuevoPago({ ...nuevoPago, monto: e.target.value })} />
                          </div>
                          <div className="mt-1">
                            <button type="button" className="btn btn-outline-success btn-sm py-0 px-1 me-1"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => setNuevoPago({ ...nuevoPago, monto: pagoFactura.saldo.toString() })}>
                              Pagar todo
                            </button>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label form-label-sm mb-1">Método *</label>
                          <select className="form-select form-select-sm" value={nuevoPago.metodo_pago}
                            onChange={(e) => setNuevoPago({ ...nuevoPago, metodo_pago: e.target.value })}>
                            <option value="">-- Seleccionar --</option>
                            <option value="1">Efectivo</option>
                            <option value="2">Tarjeta</option>
                            <option value="3">Transferencia</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label form-label-sm mb-1">Ref.</label>
                          <input type="text" className="form-control form-control-sm" placeholder="Nro ref."
                            value={nuevoPago.ref_pago}
                            onChange={(e) => setNuevoPago({ ...nuevoPago, ref_pago: e.target.value })} />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label form-label-sm mb-1">Nota</label>
                          <input type="text" className="form-control form-control-sm" placeholder="Observación"
                            value={nuevoPago.observacion}
                            onChange={(e) => setNuevoPago({ ...nuevoPago, observacion: e.target.value })} />
                        </div>
                        <div className="col-md-2">
                          <button className="btn btn-success btn-sm w-100" disabled={guardandoPago}
                            onClick={registrarPago}>
                            {guardandoPago ? <span className="spinner-border spinner-border-sm" /> : <><FiPlus className="me-1" />Pagar</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historial de pagos */}
                <h6 className="mb-2">Historial de Pagos ({pagosLista.length})</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Método</th>
                        <th>Ref.</th>
                        <th>Cajero</th>
                        <th>Estado</th>
                        {usuario?.rol === 'Administrador' && <th>Acc.</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pagosLista.length === 0 ? (
                        <tr><td colSpan={usuario?.rol === 'Administrador' ? 8 : 7} className="text-center text-muted py-3">No hay pagos registrados</td></tr>
                      ) : pagosLista.map((p, i) => (
                        <tr key={p.cod_pago} className={!p.estado ? 'text-decoration-line-through opacity-50' : ''}>
                          <td>{i + 1}</td>
                          <td><small>{new Date(p.fecha_pago).toLocaleString('es-HN', { dateStyle: 'short', timeStyle: 'short' })}</small></td>
                          <td><strong>{formatMoney(p.monto)}</strong></td>
                          <td>{metodosPago[p.metodo_pago] || p.metodo_pago}</td>
                          <td><small>{p.ref_pago || '-'}</small></td>
                          <td><small>{p.usuario?.nombre_usuario || '-'}</small></td>
                          <td>
                            <span className={`badge ${p.estado ? 'bg-success' : 'bg-danger'}`}>
                              {p.estado ? 'Activo' : 'Anulado'}
                            </span>
                          </td>
                          {usuario?.rol === 'Administrador' && (
                            <td>
                              {p.estado && (
                                <button className="btn btn-sm btn-outline-danger py-0" onClick={() => anularPago(p.cod_pago)} title="Anular pago">
                                  <FiXCircle size={12} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalPagos(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================================================================ */}
      {/* COMPROBANTE OCULTO PARA IMPRESIÓN (HU-FAC-06)                     */}
      {/* ================================================================ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <ComprobanteFactura ref={comprobanteRef} factura={comprobanteFactura} />
      </div>
    </div>
  );
};

export default Facturacion;
