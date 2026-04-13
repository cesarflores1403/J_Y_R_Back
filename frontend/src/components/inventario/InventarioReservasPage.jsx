import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiDatabase, FiLock, FiPlus } from 'react-icons/fi';
import { inventarioReservasApi } from './inventarioReservas.api.js';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';
import ReservaForm from './ReservaForm.jsx';
import ReservasFiltros from './ReservasFiltros.jsx';
import ReservasTabla from './ReservasTabla.jsx';
import BootstrapPagination from '../common/BootstrapPagination.jsx';

const LIMITE_PAGINA = 10;

const filtrosIniciales = {
  fecha_desde: '',
  fecha_hasta: '',
  cod_producto: '',
  cod_ubicacion: '',
  estado: 'TODAS',
  referencia: '',
  pagina: 1,
  limite: LIMITE_PAGINA
};

const limpiarParamsConsulta = (params = {}) => {
  const limpio = {};
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'string' && valor.trim() === '') return;
    limpio[clave] = valor;
  });
  return limpio;
};

const normalizarCodProducto = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim();
  if (!texto) return '';

  if (/^\d+$/.test(texto)) {
    const cod = Number.parseInt(texto, 10);
    return Number.isNaN(cod) || cod < 1 ? '' : cod;
  }

  const matchCodigo = texto.match(/PROD-(\d{1,10})/i);
  if (matchCodigo?.[1]) {
    const cod = Number.parseInt(matchCodigo[1], 10);
    return Number.isNaN(cod) || cod < 1 ? '' : cod;
  }

  const matchNumero = texto.match(/\b(\d{1,10})\b/);
  if (matchNumero?.[1]) {
    const cod = Number.parseInt(matchNumero[1], 10);
    return Number.isNaN(cod) || cod < 1 ? '' : cod;
  }

  return '';
};

const normalizarCodUbicacion = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  const cod = Number.parseInt(texto, 10);
  return Number.isNaN(cod) || cod < 1 ? '' : cod;
};

const normalizarRespuesta = (payload, fallbackLimite = LIMITE_PAGINA) => {
  if (Array.isArray(payload?.data) && payload?.meta) {
    return {
      filas: payload.data,
      meta: {
        total: Number(payload.meta.total || 0),
        pagina: Number(payload.meta.page || 1),
        limite: Number(payload.meta.limit || fallbackLimite),
        totalPaginas: Number(payload.meta.totalPages || 1)
      }
    };
  }

  return {
    filas: Array.isArray(payload?.datos) ? payload.datos : [],
    meta: {
      total: Number(payload?.total || 0),
      pagina: Number(payload?.pagina || payload?.page || 1),
      limite: Number(payload?.limite || payload?.limit || fallbackLimite),
      totalPaginas: Number(payload?.totalPaginas || payload?.totalPages || 1)
    }
  };
};

const obtenerMensajeError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.mensaje;

  if (!error?.response) return 'No se pudo conectar con la API. Verifica backend y frontend corriendo.';
  if (status === 400) return serverMessage || 'Datos invalidos para reservas';
  if (status === 404) return serverMessage || 'Reserva o inventario no encontrado';
  if (status === 409) return serverMessage || 'Conflicto de estado o stock insuficiente';
  if (status === 401) return serverMessage || 'Sesion expirada. Inicia sesion nuevamente';
  if (status === 403) return serverMessage || 'No tienes permisos para operar reservas';
  return serverMessage || 'Error inesperado en reservas de inventario';
};

const ReservaAccionModal = ({
  abierto = false,
  tipo = '',
  reserva = null,
  loading = false,
  onClose,
  onConfirm
}) => {
  const [form, setForm] = useState({
    motivo: '',
    referencia: '',
    observaciones: ''
  });

  useEffect(() => {
    if (!abierto) {
      setForm({
        motivo: '',
        referencia: '',
        observaciones: ''
      });
    }
  }, [abierto, tipo, reserva?.cod_reserva]);

  if (!abierto || !reserva) return null;

  const cerrarModal = () => {
    if (loading) return;
    if (typeof onClose === 'function') onClose();
  };

  const esLiberar = tipo === 'liberar';
  const titulo = esLiberar ? 'Liberar reserva' : 'Consumir reserva';
  const boton = esLiberar ? 'Liberar reserva' : 'Consumir reserva';
  const botonClase = esLiberar ? 'btn btn-warning' : 'btn jyr-btn-primary';

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrarModal();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{titulo}</h5>
            <button type="button" className="btn-close" onClick={cerrarModal} disabled={loading} />
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (typeof onConfirm === 'function') {
                await onConfirm({
                  motivo: String(form.motivo || '').trim(),
                  referencia: String(form.referencia || '').trim(),
                  observaciones: String(form.observaciones || '').trim()
                });
              }
            }}
          >
            <div className="modal-body">
              <div className="alert alert-light border mb-3">
                <strong>Reserva:</strong> #{reserva.cod_reserva} <br />
                <strong>Producto:</strong> {reserva.nombre_producto || reserva.cod_producto} <br />
                <strong>Cantidad:</strong> {reserva.cantidad}
              </div>

              {esLiberar ? (
                <div className="mb-3">
                  <label className="form-label">Motivo (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.motivo}
                    onChange={(event) => setForm((prev) => ({ ...prev, motivo: event.target.value }))}
                    maxLength={200}
                    placeholder="Motivo de liberacion"
                  />
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label">Referencia (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.referencia}
                    onChange={(event) => setForm((prev) => ({ ...prev, referencia: event.target.value }))}
                    maxLength={200}
                    placeholder="Referencia de consumo"
                  />
                </div>
              )}

              <div className="mb-2">
                <label className="form-label">Observaciones (opcional)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={form.observaciones}
                  onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                  maxLength={500}
                  placeholder="Notas de la operacion"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={botonClase} disabled={loading}>
                {loading ? 'Procesando...' : boton}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const InventarioReservasPage = () => {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [consulta, setConsulta] = useState(filtrosIniciales);
  const [productos, setProductos] = useState([]);
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: LIMITE_PAGINA,
    totalPaginas: 1
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalReservaAbierto, setModalReservaAbierto] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [accionModal, setAccionModal] = useState({
    abierto: false,
    tipo: '',
    reserva: null
  });

  const { ubicaciones, loadingUbicaciones } = useUbicaciones();

  const cargarReservas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (consulta.fecha_desde && consulta.fecha_hasta) {
        const desde = new Date(consulta.fecha_desde);
        const hasta = new Date(consulta.fecha_hasta);
        if (!Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime()) && desde > hasta) {
          setFilas([]);
          setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
          setError('fecha_desde no puede ser mayor que fecha_hasta');
          return;
        }
      }

      const params = limpiarParamsConsulta({
        page: Number(consulta.pagina || 1),
        limit: Number(consulta.limite || LIMITE_PAGINA),
        cod_producto: normalizarCodProducto(consulta.cod_producto),
        cod_ubicacion: normalizarCodUbicacion(consulta.cod_ubicacion),
        estado: consulta.estado || 'TODAS',
        referencia: String(consulta.referencia || '').trim(),
        fecha_desde: consulta.fecha_desde || undefined,
        fecha_hasta: consulta.fecha_hasta || undefined
      });

      const { data } = await inventarioReservasApi.listar(params);

      if (data?.ok) {
        const normalizado = normalizarRespuesta(data.data, Number(params.limit || LIMITE_PAGINA));
        setFilas(normalizado.filas);
        setMeta(normalizado.meta);
      } else {
        setFilas([]);
        setMeta({ total: 0, pagina: 1, limite: Number(params.limit || LIMITE_PAGINA), totalPaginas: 1 });
        setError('Respuesta invalida del servidor al consultar reservas');
      }
    } catch (err) {
      setFilas([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPaginas: 1 }));
      setError(obtenerMensajeError(err));
    } finally {
      setLoading(false);
    }
  }, [consulta]);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const { data } = await inventarioMovimientosApi.listarProductos();
        setProductos(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setProductos([]);
      }
    };
    cargarProductos();
  }, []);

  const resumenPagina = useMemo(() => ({
    activas: filas.filter((item) => String(item.estado || '').toUpperCase() === 'ACTIVA').length,
    liberadas: filas.filter((item) => String(item.estado || '').toUpperCase() === 'LIBERADA').length,
    consumidas: filas.filter((item) => String(item.estado || '').toUpperCase() === 'CONSUMIDA').length
  }), [filas]);

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const aplicarFiltros = () => {
    setError('');
    setSuccess('');
    setConsulta({
      ...filtros,
      pagina: 1,
      limite: Number(filtros.limite || LIMITE_PAGINA)
    });
    setFiltros((prev) => ({
      ...prev,
      pagina: 1
    }));
  };

  const limpiarFiltros = () => {
    setError('');
    setSuccess('');
    setFiltros(filtrosIniciales);
    setConsulta(filtrosIniciales);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > meta.totalPaginas) return;
    setConsulta((prev) => ({ ...prev, pagina: nuevaPagina }));
    setFiltros((prev) => ({ ...prev, pagina: nuevaPagina }));
  };

  const manejarReservaRegistrada = async () => {
    setSuccess('Reserva registrada correctamente');
    setError('');
    await cargarReservas();
  };

  const abrirAccion = (tipo, reserva) => {
    setAccionModal({
      abierto: true,
      tipo,
      reserva
    });
  };

  const cerrarAccion = () => {
    if (procesandoId) return;
    setAccionModal({
      abierto: false,
      tipo: '',
      reserva: null
    });
  };

  const confirmarAccion = async (payload) => {
    try {
      const codReserva = Number(accionModal?.reserva?.cod_reserva || 0);
      if (!Number.isInteger(codReserva) || codReserva < 1) {
        setError('No se pudo identificar la reserva seleccionada');
        return;
      }

      setProcesandoId(codReserva);
      setError('');
      setSuccess('');

      if (accionModal.tipo === 'liberar') {
        const { data } = await inventarioReservasApi.liberar(codReserva, {
          motivo: payload?.motivo || '',
          observaciones: payload?.observaciones || ''
        });
        if (!data?.ok) {
          setError('Respuesta invalida al liberar reserva');
          return;
        }
        setSuccess(`Reserva #${codReserva} liberada correctamente`);
      } else {
        const { data } = await inventarioReservasApi.consumir(codReserva, {
          referencia: payload?.referencia || '',
          observaciones: payload?.observaciones || ''
        });
        if (!data?.ok) {
          setError('Respuesta invalida al consumir reserva');
          return;
        }
        setSuccess(`Reserva #${codReserva} consumida correctamente`);
      }

      cerrarAccion();
      await cargarReservas();
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setProcesandoId(null);
    }
  };

  const inicioMostrado = meta.total > 0 ? ((meta.pagina - 1) * meta.limite) + 1 : 0;
  const finMostrado = meta.total > 0 ? Math.min(meta.pagina * meta.limite, meta.total) : 0;
  return (
    <section className="kdx-shell mt-4">
      <div className="kdx-hero">
        <div className="kdx-hero-head">
          <div className="kdx-title-wrap">
            <div className="kdx-title-icon">
              <FiLock />
            </div>
            <div>
              <h5 className="mb-0">Reservas</h5>
              <p className="kdx-subtitle mb-0">Reserva de stock por producto y ubicacion con seguimiento de estado.</p>
            </div>
          </div>

          <div className="ubi-hero-actions">
            <div className="kdx-mini-kpi">
              <span className="kdx-mini-kpi-label">Total</span>
              <strong>{meta.total}</strong>
            </div>
            <button
              type="button"
              className="btn kdx-btn kdx-btn-accent"
              onClick={() => setModalReservaAbierto(true)}
            >
              <FiPlus className="me-1" />
              Nueva reserva
            </button>
          </div>
        </div>
      </div>

      <div className="jyr-card kdx-filtros-card">
        <div className="jyr-card-body">
          {success && (
            <div className="alert alert-success kdx-error-alert" role="alert">
              {success}
            </div>
          )}
          {error && (
            <div className="alert alert-danger kdx-error-alert" role="alert">
              {error}
            </div>
          )}

          <div className="alert alert-light border mb-3">
            <strong>En pagina:</strong> Activas {resumenPagina.activas} | Liberadas {resumenPagina.liberadas} | Consumidas {resumenPagina.consumidas}
          </div>

          <ReservasFiltros
            filtros={filtros}
            productos={productos}
            ubicaciones={ubicaciones}
            loading={loading}
            onChange={manejarCambioFiltro}
            onAplicar={aplicarFiltros}
            onLimpiar={limpiarFiltros}
          />
        </div>
      </div>

      <div className="jyr-card kdx-table-card">
        <div className="kdx-table-topbar">
          <div className="kdx-table-topbar-left">
            <FiDatabase />
            <span>Reservas registradas</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
          </div>
        </div>
        <div className="jyr-card-body p-0">
          <ReservasTabla
            filas={filas}
            loading={loading}
            procesandoId={procesandoId}
            onLiberar={(reserva) => abrirAccion('liberar', reserva)}
            onConsumir={(reserva) => abrirAccion('consumir', reserva)}
          />
        </div>
      </div>

      <BootstrapPagination
        pagina={meta.pagina}
        totalPaginas={meta.totalPaginas}
        onChange={cambiarPagina}
        loading={loading}
      />

      <ReservaForm
        abierto={modalReservaAbierto}
        onClose={() => setModalReservaAbierto(false)}
        onReservaRegistrada={manejarReservaRegistrada}
        productos={productos}
        ubicaciones={ubicaciones}
        loadingUbicaciones={loadingUbicaciones}
      />

      <ReservaAccionModal
        abierto={accionModal.abierto}
        tipo={accionModal.tipo}
        reserva={accionModal.reserva}
        loading={Boolean(procesandoId)}
        onClose={cerrarAccion}
        onConfirm={confirmarAccion}
      />
    </section>
  );
};

export default InventarioReservasPage;
