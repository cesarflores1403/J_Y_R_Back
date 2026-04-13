import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiDatabase, FiPlus } from 'react-icons/fi';
import BajaForm from './BajaForm.jsx';
import BajasFiltros from './BajasFiltros.jsx';
import BajasTabla from './BajasTabla.jsx';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import { inventarioBajasApi } from './inventarioBajas.api.js';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';
import BootstrapPagination from '../common/BootstrapPagination.jsx';

const LIMITE_PAGINA = 10;

const filtrosIniciales = {
  fecha_desde: '',
  fecha_hasta: '',
  cod_producto: '',
  cod_ubicacion: '',
  estado: 'TODAS',
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
  const cod = Number.parseInt(texto, 10);
  return Number.isNaN(cod) || cod < 1 ? '' : cod;
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

  if (status === 400) return serverMessage || 'Filtros invalidos para consultar bajas';
  if (status === 404) return serverMessage || 'No se encontro el recurso solicitado';
  return serverMessage || 'Error inesperado al consultar bajas';
};

const InventarioBajasPage = () => {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [consulta, setConsulta] = useState(filtrosIniciales);
  const [productos, setProductos] = useState([]);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: LIMITE_PAGINA,
    totalPaginas: 1
  });
  const [ultimaBaja, setUltimaBaja] = useState(null);
  const [anulandoId, setAnulandoId] = useState(null);
  const [feedbackAnulacion, setFeedbackAnulacion] = useState('');
  const [modalBajaAbierto, setModalBajaAbierto] = useState(false);
  const { ubicaciones } = useUbicaciones();

  const cargarBajas = useCallback(async () => {
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
        ...consulta,
        tipo: 'BAJA',
        estado: consulta.estado || 'TODAS',
        cod_producto: normalizarCodProducto(consulta.cod_producto),
        cod_ubicacion: normalizarCodUbicacion(consulta.cod_ubicacion),
        page: Number(consulta.pagina || 1),
        limit: Number(consulta.limite || LIMITE_PAGINA)
      });

      const { data } = await inventarioMovimientosApi.listar(params);

      if (data?.ok) {
        const normalizado = normalizarRespuesta(data.data, Number(params.limit || LIMITE_PAGINA));
        setFilas(normalizado.filas);
        setMeta(normalizado.meta);
      } else {
        setFilas([]);
        setMeta({ total: 0, pagina: 1, limite: Number(params.limit || LIMITE_PAGINA), totalPaginas: 1 });
        setError('Respuesta invalida del servidor al consultar bajas');
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
    cargarBajas();
  }, [cargarBajas]);

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

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const aplicarFiltros = () => {
    setError('');
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
    setFeedbackAnulacion('');
    setFiltros(filtrosIniciales);
    setConsulta(filtrosIniciales);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > meta.totalPaginas) return;
    setConsulta((prev) => ({ ...prev, pagina: nuevaPagina }));
    setFiltros((prev) => ({ ...prev, pagina: nuevaPagina }));
  };

  const manejarBajaRegistrada = async (resultado) => {
    setUltimaBaja(resultado || null);
    setFeedbackAnulacion('');
    await cargarBajas();
  };

  const anularBaja = async (fila) => {
    if (fila?.anulado) {
      setError('La baja seleccionada ya esta anulada');
      return;
    }

    const codMovimiento = Number(fila?.cod_movimiento || 0);
    if (!Number.isInteger(codMovimiento) || codMovimiento < 1) {
      setError('No se pudo identificar el movimiento de baja a anular');
      return;
    }

    const confirmar = window.confirm(`Se anulara la baja #${codMovimiento}. Deseas continuar?`);
    if (!confirmar) return;

    const motivo = window.prompt('Motivo de anulacion (opcional):', 'ANULACION_BAJA') || 'ANULACION_BAJA';

    try {
      setAnulandoId(codMovimiento);
      setError('');
      setFeedbackAnulacion('');

      const { data } = await inventarioBajasApi.anular(codMovimiento, {
        motivo: String(motivo).trim() || 'ANULACION_BAJA'
      });

      if (data?.ok) {
        setFeedbackAnulacion(`Baja #${codMovimiento} anulada correctamente`);
        await cargarBajas();
      } else {
        setError('Respuesta invalida del servidor al anular la baja');
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message || err?.response?.data?.mensaje;
      if (status === 409) {
        setError(serverMessage || 'No se puede anular la baja por reglas de stock o porque ya fue anulada');
      } else {
        setError(serverMessage || 'Error inesperado al anular la baja');
      }
    } finally {
      setAnulandoId(null);
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
              <FiAlertTriangle />
            </div>
            <div>
              <h5 className="mb-0">Bajas</h5>
              <p className="kdx-subtitle mb-0">Registro de dano o perdida con impacto en stock y trazabilidad en kardex.</p>
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
              onClick={() => setModalBajaAbierto(true)}
            >
              <FiPlus className="me-1" />
              Nueva baja
            </button>
          </div>
        </div>
      </div>

      {ultimaBaja?.resumen && (
        <div className="jyr-card">
          <div className="jyr-card-body">
            <h6 className="mb-2">Ultima baja aplicada</h6>
            <div><strong>Stock antes:</strong> {ultimaBaja.resumen.stock_antes}</div>
            <div><strong>Disponible antes:</strong> {ultimaBaja.resumen.stock_disponible_antes}</div>
            <div><strong>Cantidad:</strong> {ultimaBaja.resumen.cantidad_baja}</div>
            <div><strong>Stock despues:</strong> {ultimaBaja.resumen.stock_despues}</div>
          </div>
        </div>
      )}

      <div className="jyr-card kdx-filtros-card">
        <div className="jyr-card-body">
          {feedbackAnulacion && (
            <div className="alert alert-success kdx-error-alert" role="alert">
              {feedbackAnulacion}
            </div>
          )}
          {error && (
            <div className="alert alert-danger kdx-error-alert" role="alert">
              {error}
            </div>
          )}
          <BajasFiltros
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
            <span>Bajas registradas</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
          </div>
        </div>
        <div className="jyr-card-body p-0">
          <BajasTabla
            filas={filas}
            loading={loading}
            onAnular={anularBaja}
            anulandoId={anulandoId}
          />
        </div>
      </div>
      <BootstrapPagination
        pagina={meta.pagina}
        totalPaginas={meta.totalPaginas}
        onChange={cambiarPagina}
        loading={loading}
      />

      <BajaForm
        abierto={modalBajaAbierto}
        onClose={() => setModalBajaAbierto(false)}
        onBajaRegistrada={manejarBajaRegistrada}
        productos={productos}
      />
    </section>
  );
};

export default InventarioBajasPage;
