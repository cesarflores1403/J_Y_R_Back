import React, { useCallback, useEffect, useState } from 'react';
import { FiDatabase } from 'react-icons/fi';
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
  limite: 15,
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
    return serverMessage || `Solicitud inválida al ${accion}`;
  }

  // // Error 404 para registro inexistente al actualizar
  if (status === 404) {
    return serverMessage || 'La existencia solicitada no existe';
  }

  // // Error 409 para conflictos de negocio
  if (status === 409) {
    return serverMessage || 'Conflicto al procesar la operación';
  }

  // // Fallback genérico para errores inesperados
  return serverMessage || `Error inesperado al ${accion}`;
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

  // // Carga de existencias con filtros y paginacion actual
  const cargarExistencias = useCallback(async () => {
    try {
      // // Activamos indicador de carga y limpiamos errores previos
      setLoading(true);
      setError('');

      // // Request al backend usando servicio del modulo
      const { data } = await inventarioExistenciasApi.listar(consulta);

      // // Validamos contrato esperado con helper de respuesta
      if (data?.ok) {
        // // Cargamos filas recibidas desde backend
        setExistencias(Array.isArray(data.data?.datos) ? data.data.datos : []);
        // // Cargamos metadata de paginacion para UI
        setMeta({
          total: Number(data.data?.total || 0),
          pagina: Number(data.data?.pagina || 1),
          limite: Number(data.data?.limite || consulta.limite),
          totalPaginas: Number(data.data?.totalPaginas || 1)
        });
      } else {
        // // Si no cumple contrato de exito, mostramos error controlado
        setExistencias([]);
        setMeta({ total: 0, pagina: 1, limite: consulta.limite, totalPaginas: 1 });
        setError('Respuesta inválida del servidor al listar existencias');
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
        setSuccess('Mínimos y máximos actualizados correctamente');
        setModalAbierto(false);
        await cargarExistencias();
      } else {
        // // Error de contrato en respuesta de update
        setErrorForm('Respuesta inválida del servidor al actualizar min/max');
      }
    } catch (err) {
      // // Error específico del formulario de edicion
      setErrorForm(obtenerMensajeError(err, 'actualizar mínimos y máximos'));
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
            Página {meta.pagina} de {meta.totalPaginas}
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
