import React, { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiDatabase, FiMinusCircle, FiPlus } from 'react-icons/fi';
import SalidaForm from './SalidaForm.jsx';
import SalidasFiltros from './SalidasFiltros.jsx';
import SalidasTabla from './SalidasTabla.jsx';
import { inventarioMovimientosApi } from './inventarioMovimientos.api.js';
import { inventarioSalidasApi } from './inventarioSalidas.api.js';
import { useUbicaciones } from '../../hooks/useUbicaciones.js';

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

  if (status === 400) return serverMessage || 'Filtros invalidos para consultar salidas';
  if (status === 404) return serverMessage || 'No se encontro el recurso solicitado';
  return serverMessage || 'Error inesperado al consultar salidas';
};

const construirPaginasVisibles = (paginaActual, totalPaginas, maxVisibles = 5) => {
  if (totalPaginas <= 1) return [1];
  if (totalPaginas <= maxVisibles) {
    return Array.from({ length: totalPaginas }, (_, idx) => idx + 1);
  }

  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, inicio + maxVisibles - 1);
  inicio = Math.max(1, fin - maxVisibles + 1);

  const paginas = [];
  if (inicio > 1) paginas.push(1);
  if (inicio > 2) paginas.push('...');
  for (let pagina = inicio; pagina <= fin; pagina += 1) paginas.push(pagina);
  if (fin < totalPaginas - 1) paginas.push('...');
  if (fin < totalPaginas) paginas.push(totalPaginas);

  return paginas;
};

const InventarioSalidasPage = () => {
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
  const [ultimaSalida, setUltimaSalida] = useState(null);
  const [anulandoId, setAnulandoId] = useState(null);
  const [feedbackAnulacion, setFeedbackAnulacion] = useState('');
  const [modalSalidaAbierto, setModalSalidaAbierto] = useState(false);
  const { ubicaciones } = useUbicaciones();

  const cargarSalidas = useCallback(async () => {
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
        tipo: 'SALIDA',
        // // Excluye salidas tecnicas de anulacion de entradas para no contaminar este submodulo
        excluir_ref_tipo: 'ANULACION_ENTRADA',
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
        setError('Respuesta invalida del servidor al consultar salidas');
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
    cargarSalidas();
  }, [cargarSalidas]);

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

  const manejarSalidaRegistrada = async (resultado) => {
    setUltimaSalida(resultado || null);
    setFeedbackAnulacion('');
    await cargarSalidas();
  };

  const anularSalida = async (fila) => {
    if (fila?.anulado) {
      setError('La salida seleccionada ya esta anulada');
      return;
    }

    const codMovimiento = Number(fila?.cod_movimiento || 0);
    if (!Number.isInteger(codMovimiento) || codMovimiento < 1) {
      setError('No se pudo identificar el movimiento de salida a anular');
      return;
    }

    const confirmar = window.confirm(`Se anulara la salida #${codMovimiento}. Deseas continuar?`);
    if (!confirmar) return;

    const motivo = window.prompt('Motivo de anulacion (opcional):', 'ANULACION_SALIDA') || 'ANULACION_SALIDA';

    try {
      setAnulandoId(codMovimiento);
      setError('');
      setFeedbackAnulacion('');

      const { data } = await inventarioSalidasApi.anular(codMovimiento, {
        motivo: String(motivo).trim() || 'ANULACION_SALIDA'
      });

      if (data?.ok) {
        setFeedbackAnulacion(`Salida #${codMovimiento} anulada correctamente`);
        await cargarSalidas();
      } else {
        setError('Respuesta invalida del servidor al anular la salida');
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message || err?.response?.data?.mensaje;
      if (status === 409) {
        setError(serverMessage || 'No se puede anular la salida por reglas de stock o porque ya fue anulada');
      } else {
        setError(serverMessage || 'Error inesperado al anular la salida');
      }
    } finally {
      setAnulandoId(null);
    }
  };

  const inicioMostrado = meta.total > 0 ? ((meta.pagina - 1) * meta.limite) + 1 : 0;
  const finMostrado = meta.total > 0 ? Math.min(meta.pagina * meta.limite, meta.total) : 0;
  const paginasVisibles = construirPaginasVisibles(meta.pagina, meta.totalPaginas);

  return (
    <section className="kdx-shell mt-4">
      <div className="kdx-hero">
        <div className="kdx-hero-head">
          <div className="kdx-title-wrap">
            <div className="kdx-title-icon">
              <FiMinusCircle />
            </div>
            <div>
              <h5 className="mb-0">Salidas</h5>
              <p className="kdx-subtitle mb-0">Registro de egresos con control de stock disponible y trazabilidad en kardex.</p>
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
              onClick={() => setModalSalidaAbierto(true)}
            >
              <FiPlus className="me-1" />
              Nueva salida
            </button>
          </div>
        </div>
      </div>

      {ultimaSalida?.resumen && (
        <div className="jyr-card">
          <div className="jyr-card-body">
            <h6 className="mb-2">Ultima salida aplicada</h6>
            <div><strong>Stock antes:</strong> {ultimaSalida.resumen.stock_antes}</div>
            <div><strong>Disponible antes:</strong> {ultimaSalida.resumen.stock_disponible_antes}</div>
            <div><strong>Cantidad:</strong> {ultimaSalida.resumen.cantidad_salida}</div>
            <div><strong>Stock despues:</strong> {ultimaSalida.resumen.stock_despues}</div>
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
          <SalidasFiltros
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
            <span>Salidas registradas</span>
          </div>
          <div className="kdx-table-topbar-right">
            Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
          </div>
        </div>
        <div className="jyr-card-body p-0">
          <SalidasTabla
            filas={filas}
            loading={loading}
            onAnular={anularSalida}
            anulandoId={anulandoId}
          />
        </div>
      </div>

      <div className="kdx-pagination-bar">
        <span className="kdx-pagination-summary">
          Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
        </span>

        <div className="kdx-pagination-controls">
          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPagina(meta.pagina - 1)}
            disabled={loading || meta.pagina <= 1}
            aria-label="Pagina anterior"
          >
            <FiChevronLeft size={15} />
          </button>

          {paginasVisibles.map((pagina, index) => (
            <button
              key={`${pagina}-${index}`}
              type="button"
              className={`kdx-page-btn ${pagina === meta.pagina ? 'is-active' : ''} ${pagina === '...' ? 'is-ellipsis' : ''}`}
              onClick={() => (typeof pagina === 'number' ? cambiarPagina(pagina) : undefined)}
              disabled={loading || pagina === '...'}
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            className="kdx-page-btn kdx-page-btn-nav"
            onClick={() => cambiarPagina(meta.pagina + 1)}
            disabled={loading || meta.pagina >= meta.totalPaginas}
            aria-label="Pagina siguiente"
          >
            <FiChevronRight size={15} />
          </button>

          <span className="kdx-page-state">
            Pagina {meta.pagina} de {meta.totalPaginas}
          </span>
        </div>
      </div>

      <SalidaForm
        abierto={modalSalidaAbierto}
        onClose={() => setModalSalidaAbierto(false)}
        onSalidaRegistrada={manejarSalidaRegistrada}
        productos={productos}
      />
    </section>
  );
};

export default InventarioSalidasPage;
