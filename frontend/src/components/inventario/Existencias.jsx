import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiDatabase } from 'react-icons/fi';
import ExistenciasFiltros from './ExistenciasFiltros.jsx';
import ExistenciasTabla from './ExistenciasTabla.jsx';
import ExistenciasFormMinMax from './ExistenciasFormMinMax.jsx';
import { inventarioExistenciasApi } from './inventarioExistencias.api.js';

// // Estado inicial de filtros del listado
const filtrosIniciales = {
  cod_producto: '',
  producto: '',
  cod_ubicacion: '',
  ubicacion: '',
  pagina: 1,
  limite: 10,
  includeInactive: false
};

// // Normaliza error HTTP para mensajes amigables en UI
const obtenerMensajeError = (error, accion) => {
  // // Extraemos status HTTP si existe respuesta
  const status = error?.response?.status;
  // // Mensaje del backend en formato actual del proyecto
  const serverMessage = error?.response?.data?.message
    || error?.response?.data?.mensaje;

  // // Error 400 de validaciones de entrada
  if (status === 400) {
    return serverMessage || `Solicitud invalida al ${accion}`;
  }

  // // Error 404 para registro inexistente al actualizar
  if (status === 404) {
    return serverMessage || 'La existencia solicitada no existe';
  }

  // // Error 409 para conflictos de negocio
  if (status === 409) {
    return serverMessage || 'Conflicto al procesar la operacion';
  }

  // // Fallback genérico para errores inesperados
  return serverMessage || `Error inesperado al ${accion}`;
};

// // Normaliza el payload del backend soportando contrato nuevo (data+meta) y legacy
const normalizarRespuestaExistencias = (payload, fallbackLimite = 10) => {
  // // Si el backend ya devuelve data/meta (contrato nuevo)
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

  // // Fallback al contrato legacy actualmente usado en la UI (datos + pagina + limite)
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

// // Elimina params vacios para no disparar validaciones backend por strings vacios
const limpiarParamsConsulta = (params = {}) => {
  // // Construimos nuevo objeto solo con valores realmente informados por la UI
  const limpio = {};

  // // Recorremos pares clave/valor y descartamos vacios comunes
  Object.entries(params).forEach(([clave, valor]) => {
    // // Omitimos undefined y null porque representan ausencia de filtro
    if (valor === undefined || valor === null) return;
    // // Omitimos strings vacios o con solo espacios para filtros textuales/numericos
    if (typeof valor === 'string' && valor.trim() === '') return;
    // // Conservamos el resto de valores (incluye false para includeInactive)
    limpio[clave] = valor;
  });

  return limpio;
};

// // Normaliza el limite para que opere en bloques de 10 (10, 20, ... 100)
const normalizarLimite = (valor, fallback = 10) => {
  const parsed = Number.parseInt(valor, 10);
  if (Number.isNaN(parsed)) return fallback;
  const acotado = Math.min(100, Math.max(10, parsed));
  return Math.ceil(acotado / 10) * 10;
};

// // Permite usar codigo visual (PROD-0023) o id numerico (23) en el filtro de producto
const normalizarCodProducto = (valor) => {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).trim().toUpperCase();
  if (!texto) return '';

  // // Extraemos el bloque numerico final para soportar formatos PROD-0001 / 0001 / 1
  const match = texto.match(/(\d+)$/);
  if (!match) return '';

  const numero = Number.parseInt(match[1], 10);
  if (Number.isNaN(numero) || numero < 1) return '';
  return String(numero);
};

const Existencias = () => {
  // // Lista de existencias de inventario
  const [existencias, setExistencias] = useState([]);
  // // Estado de carga para listado principal
  const [loading, setLoading] = useState(true);
  // // Estado de guardado para update min/max
  const [saving, setSaving] = useState(false);
  // // Mensaje de error global de la vista
  const [error, setError] = useState('');
  // // Mensaje de exito para feedback post update
  const [success, setSuccess] = useState('');
  // // Filtros editables en el formulario de filtros
  const [filtros, setFiltros] = useState(filtrosIniciales);
  // // Query efectiva usada por useEffect para recargar datos
  const [consulta, setConsulta] = useState(filtrosIniciales);
  // // Totales de paginacion devueltos por backend
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    limite: 10,
    totalPaginas: 1
  });
  // // Estado de modal de edicion min/max
  const [modalAbierto, setModalAbierto] = useState(false);
  // // Registro seleccionado para editar min/max
  const [seleccionado, setSeleccionado] = useState(null);
  // // Error especifico del modal/form de min/max
  const [errorForm, setErrorForm] = useState('');
  // // Resumen compacto de alertas de reposicion
  const [resumenAlertas, setResumenAlertas] = useState({
    criticas: 0,
    sinExistencia: 0,
    bajoMinimo: 0
  });
  // // Estado de carga del panel resumen de alertas
  const [loadingResumenAlertas, setLoadingResumenAlertas] = useState(true);
  // // Error del panel resumen de alertas
  const [errorResumenAlertas, setErrorResumenAlertas] = useState('');

  // // Carga de existencias con filtros y paginacion actual
  const cargarExistencias = useCallback(async () => {
    try {
      // // Activamos indicador de carga y limpiamos errores previos
      setLoading(true);
      setError('');

      // // Enviamos aliases nuevos y legacy para transicion segura sin romper backend existente
      const paramsConsulta = limpiarParamsConsulta({
        ...consulta,
        page: Number(consulta.pagina || 1),
        limit: normalizarLimite(consulta.limite, 10),
      });

      // // Request al backend usando servicio del modulo
      const { data } = await inventarioExistenciasApi.listar(paramsConsulta);

      // // Validamos contrato esperado con helper de respuesta
      if (data?.ok) {
        // // Unificamos contrato nuevo/legacy para mantener la vista incremental
        const normalizado = normalizarRespuestaExistencias(data.data, Number(paramsConsulta.limit || 10));
        // // Cargamos filas recibidas desde backend
        setExistencias(normalizado.filas);
        // // Cargamos metadata de paginacion para UI
        setMeta(normalizado.meta);
      } else {
        // // Si no cumple contrato de exito, mostramos error controlado
        setExistencias([]);
        setMeta({ total: 0, pagina: 1, limite: consulta.limite, totalPaginas: 1 });
        setError('Respuesta invalida del servidor al listar existencias');
      }
    } catch (err) {
      // // Error HTTP/validacion en la consulta
      setExistencias([]);
      setMeta({ total: 0, pagina: 1, limite: consulta.limite, totalPaginas: 1 });
      setError(obtenerMensajeError(err, 'consultar existencias'));
    } finally {
      // // Finalizamos estado de carga
      setLoading(false);
    }
  }, [consulta]);

  useEffect(() => {
    // // Carga inicial y recarga cuando cambia consulta (filtros/paginacion)
    cargarExistencias();
  }, [cargarExistencias]);

  // // Carga resumen compacto de alertas reutilizando endpoint existente
  const cargarResumenAlertas = useCallback(async () => {
    try {
      // // Activamos loading del panel y limpiamos errores previos
      setLoadingResumenAlertas(true);
      setErrorResumenAlertas('');

      // // Reutilizamos filtros principales (sin paginacion) para alinear contexto de la vista
      const filtrosBase = limpiarParamsConsulta({
        cod_producto: consulta.cod_producto,
        producto: consulta.producto,
        cod_ubicacion: consulta.cod_ubicacion,
        ubicacion: consulta.ubicacion,
        includeInactive: consulta.includeInactive
      });

      // // Consulta 1: total de alertas de reposicion (disponible <= minimo)
      // // Consulta 2: total sin existencia (solo criticos)
      const [respuestaAlertas, respuestaSinExistencia] = await Promise.all([
        inventarioExistenciasApi.listarAlertasStockBajo({
          ...filtrosBase,
          page: 1,
          limit: 1
        }),
        inventarioExistenciasApi.listarAlertasStockBajo({
          ...filtrosBase,
          page: 1,
          limit: 1,
          solo_criticos: true
        })
      ]);

      const payloadAlertas = respuestaAlertas?.data;
      const payloadSinExistencia = respuestaSinExistencia?.data;

      if (!payloadAlertas?.ok || !payloadSinExistencia?.ok) {
        throw new Error('Respuesta invalida al consultar resumen de alertas');
      }

      // // Tomamos totales globales desde meta del endpoint sin requerir tabla detallada
      const metaAlertas = normalizarRespuestaExistencias(payloadAlertas.data, 1).meta;
      const metaSinExistencia = normalizarRespuestaExistencias(payloadSinExistencia.data, 1).meta;

      const totalAlertasCriticas = Number(metaAlertas.total || 0);
      const totalSinExistencia = Number(metaSinExistencia.total || 0);

      setResumenAlertas({
        criticas: totalAlertasCriticas,
        sinExistencia: totalSinExistencia,
        bajoMinimo: Math.max(0, totalAlertasCriticas - totalSinExistencia)
      });
    } catch (err) {
      // // Error de consulta para panel resumen
      setResumenAlertas({
        criticas: 0,
        sinExistencia: 0,
        bajoMinimo: 0
      });
      setErrorResumenAlertas(obtenerMensajeError(err, 'consultar resumen de alertas'));
    } finally {
      // // Finalizamos loading del panel resumen
      setLoadingResumenAlertas(false);
    }
  }, [
    consulta.cod_producto,
    consulta.producto,
    consulta.cod_ubicacion,
    consulta.ubicacion,
    consulta.includeInactive
  ]);

  useEffect(() => {
    // // Recarga resumen de alertas cuando cambia el contexto de filtros principales
    cargarResumenAlertas();
  }, [cargarResumenAlertas]);

  // // Actualiza un campo de filtro localmente sin disparar request inmediato
  const manejarCambioFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Aplica filtros actuales y reinicia pagina en 1
  const aplicarFiltros = () => {
    // // Limpiamos mensajes de feedback al relanzar consulta
    setError('');
    setSuccess('');
    // // Actualizamos query efectiva para que useEffect recargue datos
    setConsulta({
      ...filtros,
      // // Normalizamos codigo de producto para que backend reciba siempre cod_producto numerico
      cod_producto: normalizarCodProducto(filtros.cod_producto),
      // // Mantenemos claves legacy de la vista y dejamos que cargarExistencias envie aliases nuevos
      pagina: Number(filtros.pagina || 1),
      limite: normalizarLimite(filtros.limite, 10)
    });
  };

  // // Restablece filtros al estado inicial y recarga listado base
  const limpiarFiltros = () => {
    setError('');
    setSuccess('');
    setFiltros(filtrosIniciales);
    setConsulta(filtrosIniciales);
  };

  // // Cambia pagina manteniendo filtros actuales aplicados
  const cambiarPagina = (nuevaPagina) => {
    // // Evitamos pagina menor a 1
    if (nuevaPagina < 1) return;
    // // Evitamos pagina mayor al total disponible
    if (nuevaPagina > meta.totalPaginas) return;
    // // Actualizamos consulta para recargar desde backend
    setConsulta((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
    // // Reflejamos pagina en formulario de filtros para consistencia visual
    setFiltros((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
  };

  // // Abre modal para editar min/max de una fila especifica
  const abrirEdicion = (fila) => {
    setSeleccionado(fila);
    setErrorForm('');
    setModalAbierto(true);
  };

  // // Cierra modal y limpia errores de formulario
  const cerrarEdicion = () => {
    if (saving) return;
    setModalAbierto(false);
    setErrorForm('');
  };

  // // Ejecuta update de min/max desde modal
  const guardarMinMax = async (payload) => {
    try {
      // // Activamos estado de guardado y limpiamos mensajes previos
      setSaving(true);
      setErrorForm('');
      setError('');
      setSuccess('');

      // // Request PUT para actualizar min/max de la existencia seleccionada
      const { data } = await inventarioExistenciasApi.actualizarMinMax(
        seleccionado.cod_inventario,
        payload
      );

      // // Si backend responde ok, cerramos modal y recargamos listado
      if (data?.ok) {
        setSuccess('Minimos y maximos actualizados correctamente');
        setModalAbierto(false);
        await cargarExistencias();
      } else {
        // // Error de contrato en respuesta de update
        setErrorForm('Respuesta invalida del servidor al actualizar min/max');
      }
    } catch (err) {
      // // Error específico del formulario de edicion
      setErrorForm(obtenerMensajeError(err, 'actualizar minimos y maximos'));
    } finally {
      // // Fin de proceso de guardado
      setSaving(false);
    }
  };

  // // Rango mostrado en paginacion para UX compacta tipo "Mostrando X-Y de N"
  const inicioMostrado = meta.total > 0
    ? ((meta.pagina - 1) * meta.limite) + 1
    : 0;
  const finMostrado = meta.total > 0
    ? Math.min(meta.pagina * meta.limite, meta.total)
    : 0;

  // // Construye paginas visibles con elipsis para navegacion compacta
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

    for (let pagina = inicio; pagina <= fin; pagina += 1) {
      paginas.push(pagina);
    }

    if (fin < totalPaginas - 1) paginas.push('...');
    if (fin < totalPaginas) paginas.push(totalPaginas);

    return paginas;
  };

  const paginasVisibles = construirPaginasVisibles(meta.pagina, meta.totalPaginas);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiDatabase />
          <h3 className="mb-0">Existencias</h3>
        </div>
      </div>

      {success && (
        // // Feedback de exito post actualizacion min/max
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {error && (
        // // Feedback de error de filtros/listado
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="jyr-card mb-4">
        <div className="jyr-card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <FiAlertTriangle />
            <h5 className="mb-0">Resumen de alertas de reposicion</h5>
          </div>

          {errorResumenAlertas && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {errorResumenAlertas}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="border rounded p-3 h-100 bg-danger-subtle border-danger-subtle">
                <div className="small text-danger fw-semibold">Alertas criticas</div>
                <div className="h4 mb-0">
                  {loadingResumenAlertas ? '...' : resumenAlertas.criticas}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded p-3 h-100 bg-dark text-light">
                <div className="small text-light-emphasis fw-semibold">Productos sin existencia</div>
                <div className="h4 mb-0">
                  {loadingResumenAlertas ? '...' : resumenAlertas.sinExistencia}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded p-3 h-100 bg-warning-subtle border-warning-subtle">
                <div className="small text-warning-emphasis fw-semibold">Productos bajo minimo</div>
                <div className="h4 mb-0">
                  {loadingResumenAlertas ? '...' : resumenAlertas.bajoMinimo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExistenciasFiltros
        // // Props de filtro controlado
        filtros={filtros}
        loading={loading}
        onChange={manejarCambioFiltro}
        onAplicar={aplicarFiltros}
        onLimpiar={limpiarFiltros}
      />

      <ExistenciasTabla
        // // Props del listado principal
        filas={existencias}
        loading={loading}
        onEditar={abrirEdicion}
      />

      <div
        style={{
          marginTop: 10,
          padding: '12px 14px',
          border: '1px solid var(--jyr-gray-200)',
          borderRadius: 12,
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--jyr-gray-500)' }}>
          Mostrando {inicioMostrado}-{finMostrado} de {meta.total}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => cambiarPagina(meta.pagina - 1)}
            disabled={loading || meta.pagina <= 1}
            aria-label="Pagina anterior"
            style={{
              minWidth: 36,
              height: 36,
              border: '1px solid var(--jyr-gray-200)',
              background: '#fff',
              color: '#0f172a',
              padding: 0
            }}
          >
            <FiChevronLeft size={15} />
          </button>

          {paginasVisibles.map((pagina, index) => (
            <button
              // // Elipsis se renderiza como boton deshabilitado solo visual
              key={`${pagina}-${index}`}
              type="button"
              className="btn btn-sm"
              onClick={() => (typeof pagina === 'number' ? cambiarPagina(pagina) : undefined)}
              disabled={loading || pagina === '...'}
              style={{
                minWidth: 36,
                height: 36,
                border: '1px solid var(--jyr-gray-200)',
                background: pagina === meta.pagina ? '#0b0f19' : '#fff',
                color: pagina === meta.pagina ? '#fff' : '#111827',
                fontWeight: pagina === meta.pagina ? 700 : 500,
                padding: '0 10px'
              }}
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => cambiarPagina(meta.pagina + 1)}
            disabled={loading || meta.pagina >= meta.totalPaginas}
            aria-label="Pagina siguiente"
            style={{
              minWidth: 36,
              height: 36,
              border: '1px solid var(--jyr-gray-200)',
              background: '#fff',
              color: '#0f172a',
              padding: 0
            }}
          >
            <FiChevronRight size={15} />
          </button>

          <span
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: 'var(--jyr-gray-500)',
              whiteSpace: 'nowrap'
            }}
          >
            Pagina {meta.pagina} de {meta.totalPaginas}
          </span>
        </div>
      </div>

      <ExistenciasFormMinMax
        // // Props de modal/form de actualizacion
        abierto={modalAbierto}
        saving={saving}
        error={errorForm}
        existencia={seleccionado}
        onCerrar={cerrarEdicion}
        onGuardar={guardarMinMax}
      />
    </div>
  );
};

export default Existencias;
