import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiDatabase } from 'react-icons/fi';
import ExistenciasFiltros from './ExistenciasFiltros.jsx';
import ExistenciasTabla from './ExistenciasTabla.jsx';
import ExistenciasFormMinMax from './ExistenciasFormMinMax.jsx';
import AlertasReposicionFiltros from './AlertasReposicionFiltros.jsx';
import AlertasReposicionTabla from './AlertasReposicionTabla.jsx';
import { inventarioExistenciasApi } from './inventarioExistencias.api.js';

// // Estado inicial de filtros del listado
const filtrosIniciales = {
  cod_producto: '',
  producto: '',
  cod_ubicacion: '',
  ubicacion: '',
  pagina: 1,
  limite: 15,
  includeInactive: false
};

// // Estado inicial de filtros para alertas de reposicion (HU stock bajo)
const filtrosAlertasIniciales = {
  cod_producto: '',
  producto: '',
  cod_ubicacion: '',
  ubicacion: '',
  solo_criticos: false,
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
  // // Version normalizada para detectar mensajes tecnicos que no deben mostrarse en UI
  const serverMessageLower = String(serverMessage || '').toLowerCase();

  // // Ocultamos error tecnico de columna faltante mientras se aplica el cambio de BD manual
  if (serverMessageLower.includes('stock_reservado') && serverMessageLower.includes('does not exist')) {
    return '';
  }

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
const normalizarRespuestaExistencias = (payload, fallbackLimite = 15) => {
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
    limite: 15,
    totalPaginas: 1
  });
  // // Estado de modal de edicion min/max
  const [modalAbierto, setModalAbierto] = useState(false);
  // // Registro seleccionado para editar min/max
  const [seleccionado, setSeleccionado] = useState(null);
  // // Error especifico del modal/form de min/max
  const [errorForm, setErrorForm] = useState('');
  // // Lista de alertas de reposicion para stock bajo
  const [alertas, setAlertas] = useState([]);
  // // Estado de carga de alertas de reposicion
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  // // Error especifico del bloque de alertas
  const [errorAlertas, setErrorAlertas] = useState('');
  // // Filtros editables para alertas
  const [filtrosAlertas, setFiltrosAlertas] = useState(filtrosAlertasIniciales);
  // // Query efectiva usada para consultar alertas
  const [consultaAlertas, setConsultaAlertas] = useState(filtrosAlertasIniciales);
  // // Metadata de paginacion de alertas
  const [metaAlertas, setMetaAlertas] = useState({
    total: 0,
    pagina: 1,
    limite: 10,
    totalPaginas: 1
  });

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
        limit: Number(consulta.limite || 15),
      });

      // // Request al backend usando servicio del modulo
      const { data } = await inventarioExistenciasApi.listar(paramsConsulta);

      // // Validamos contrato esperado con helper de respuesta
      if (data?.ok) {
        // // Unificamos contrato nuevo/legacy para mantener la vista incremental
        const normalizado = normalizarRespuestaExistencias(data.data, Number(paramsConsulta.limit || 15));
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

  // // Carga alertas de reposicion usando regla stock_disponible <= stock_minimo
  const cargarAlertasReposicion = useCallback(async () => {
    try {
      // // Activamos loading de alertas y limpiamos errores previos
      setLoadingAlertas(true);
      setErrorAlertas('');

      // // Enviamos aliases nuevos y legacy para mantener coherencia del modulo
      const paramsConsulta = limpiarParamsConsulta({
        ...consultaAlertas,
        page: Number(consultaAlertas.pagina || 1),
        limit: Number(consultaAlertas.limite || 10)
      });

      // // Request al endpoint de alertas de reposicion de inventario
      const { data } = await inventarioExistenciasApi.listarAlertasStockBajo(paramsConsulta);

      if (data?.ok) {
        // // Unificamos contrato nuevo/legacy para no duplicar logica de normalizacion
        const normalizado = normalizarRespuestaExistencias(data.data, Number(paramsConsulta.limit || 10));
        setAlertas(normalizado.filas);
        setMetaAlertas(normalizado.meta);
      } else {
        // // Manejo de respuesta invalida manteniendo contrato visual estable
        setAlertas([]);
        setMetaAlertas({ total: 0, pagina: 1, limite: consultaAlertas.limite, totalPaginas: 1 });
        setErrorAlertas('Respuesta invalida del servidor al listar alertas de reposicion');
      }
    } catch (err) {
      // // Error HTTP/validacion durante la consulta de alertas
      setAlertas([]);
      setMetaAlertas({ total: 0, pagina: 1, limite: consultaAlertas.limite, totalPaginas: 1 });
      setErrorAlertas(obtenerMensajeError(err, 'consultar alertas de reposicion'));
    } finally {
      // // Finalizamos loading de alertas
      setLoadingAlertas(false);
    }
  }, [consultaAlertas]);

  useEffect(() => {
    // // Carga inicial y recarga de alertas al cambiar filtros/paginacion de alertas
    cargarAlertasReposicion();
  }, [cargarAlertasReposicion]);

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
      // // Mantenemos claves legacy de la vista y dejamos que cargarExistencias envie aliases nuevos
      pagina: Number(filtros.pagina || 1),
      limite: Number(filtros.limite || 15)
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

  // // Actualiza un campo de filtro de alertas sin disparar request inmediata
  const manejarCambioFiltroAlertas = (campo, valor) => {
    setFiltrosAlertas((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // // Aplica filtros de alertas y reinicia pagina en 1
  const aplicarFiltrosAlertas = () => {
    setErrorAlertas('');
    setConsultaAlertas({
      ...filtrosAlertas,
      pagina: 1,
      limite: Number(filtrosAlertas.limite || 10)
    });
    setFiltrosAlertas((prev) => ({
      ...prev,
      pagina: 1
    }));
  };

  // // Limpia filtros de alertas y recarga consulta base
  const limpiarFiltrosAlertas = () => {
    setErrorAlertas('');
    setFiltrosAlertas(filtrosAlertasIniciales);
    setConsultaAlertas(filtrosAlertasIniciales);
  };

  // // Navega paginacion del bloque de alertas respetando limites actuales
  const cambiarPaginaAlertas = (nuevaPagina) => {
    if (nuevaPagina < 1) return;
    if (nuevaPagina > metaAlertas.totalPaginas) return;

    setConsultaAlertas((prev) => ({
      ...prev,
      pagina: nuevaPagina
    }));
    setFiltrosAlertas((prev) => ({
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

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          {/* // Conteo total para contexto del usuario */}
          Total registros: {meta.total}
        </small>
        <div className="btn-group">
          <button
            // // Boton pagina anterior
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => cambiarPagina(meta.pagina - 1)}
            disabled={loading || meta.pagina <= 1}
          >
            Anterior
          </button>
          <button
            // // Indicador de pagina actual
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled
          >
            Pagina {meta.pagina} de {meta.totalPaginas}
          </button>
          <button
            // // Boton pagina siguiente
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => cambiarPagina(meta.pagina + 1)}
            disabled={loading || meta.pagina >= meta.totalPaginas}
          >
            Siguiente
          </button>
        </div>
      </div>

      <hr className="my-4" />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <FiAlertTriangle />
          <h5 className="mb-0">Alertas de reposicion</h5>
        </div>
      </div>

      {errorAlertas && (
        // // Feedback de error para bloque de alertas de reposicion
        <div className="alert alert-danger" role="alert">
          {errorAlertas}
        </div>
      )}

      <AlertasReposicionFiltros
        // // Props de filtros del bloque de alertas
        filtros={filtrosAlertas}
        loading={loadingAlertas}
        onChange={manejarCambioFiltroAlertas}
        onAplicar={aplicarFiltrosAlertas}
        onLimpiar={limpiarFiltrosAlertas}
      />

      <AlertasReposicionTabla
        // // Props del listado de alertas de stock bajo
        filas={alertas}
        loading={loadingAlertas}
      />

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          {/* // Conteo total de alertas para contexto operativo */}
          Total alertas: {metaAlertas.total}
        </small>
        <div className="btn-group">
          <button
            // // Navega a la pagina anterior de alertas
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => cambiarPaginaAlertas(metaAlertas.pagina - 1)}
            disabled={loadingAlertas || metaAlertas.pagina <= 1}
          >
            Anterior
          </button>
          <button
            // // Indicador de pagina actual de alertas
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled
          >
            Pagina {metaAlertas.pagina} de {metaAlertas.totalPaginas}
          </button>
          <button
            // // Navega a la pagina siguiente de alertas
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => cambiarPaginaAlertas(metaAlertas.pagina + 1)}
            disabled={loadingAlertas || metaAlertas.pagina >= metaAlertas.totalPaginas}
          >
            Siguiente
          </button>
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
