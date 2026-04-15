import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { inventarioReservasApi } from './inventarioReservas.api.js';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';
import ReservaForm from './ReservaForm.jsx';
import ReservaAccionModal from './ReservaAccionModal.jsx';
import ReservasHeader from './ReservasHeader.jsx';
import ReservasFiltrosCard from './ReservasFiltrosCard.jsx';
import ReservasTablaCard from './ReservasTablaCard.jsx';
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
      <ReservasHeader
        total={meta.total}
        onNuevaReserva={() => setModalReservaAbierto(true)}
      />

      <ReservasFiltrosCard
        success={success}
        error={error}
        resumenPagina={resumenPagina}
        filtros={filtros}
        productos={productos}
        ubicaciones={ubicaciones}
        loading={loading}
        onChange={manejarCambioFiltro}
        onAplicar={aplicarFiltros}
        onLimpiar={limpiarFiltros}
      />

      <ReservasTablaCard
        inicioMostrado={inicioMostrado}
        finMostrado={finMostrado}
        total={meta.total}
        filas={filas}
        loading={loading}
        procesandoId={procesandoId}
        onLiberar={(reserva) => abrirAccion('liberar', reserva)}
        onConsumir={(reserva) => abrirAccion('consumir', reserva)}
      />

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
