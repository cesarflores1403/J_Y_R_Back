import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiCopy, FiExternalLink, FiLink2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { empresaConfigService } from '../../services/serviceIndex.js';

const FORMATEO_FECHA = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};

const formatearFecha = (valor) => {
  if (!valor) return 'Sin datos';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin datos';
  return fecha.toLocaleString('es-HN', FORMATEO_FECHA);
};

const UrlSistema = () => {
  const [estado, setEstado] = useState({
    url: '',
    activa: false,
    detalle: '',
    status: null,
    verificadaEn: '',
    archivoActualizadoEn: '',
    cargando: true,
    error: ''
  });

  const cargarUrlSistema = async ({ silencioso = false } = {}) => {
    if (!silencioso) {
      setEstado((prev) => ({ ...prev, cargando: true, error: '' }));
    }

    try {
      const { data } = await empresaConfigService.obtenerUrlSistema();
      const datos = data?.datos || {};

      setEstado({
        url: datos.url || '',
        activa: Boolean(datos.activa),
        detalle: datos.detalle || '',
        status: datos.status ?? null,
        verificadaEn: datos.verificada_en || '',
        archivoActualizadoEn: datos.archivo_actualizado_en || '',
        cargando: false,
        error: ''
      });
    } catch (error) {
      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error: error?.response?.data?.mensaje || 'No se pudo obtener la URL del sistema'
      }));
    }
  };

  useEffect(() => {
    cargarUrlSistema();

    const intervalo = setInterval(() => {
      cargarUrlSistema({ silencioso: true });
    }, 10000);

    return () => clearInterval(intervalo);
  }, []);

  const estadoBadge = useMemo(() => {
    if (!estado.url) return { clase: 'bg-secondary', texto: 'Sin URL pública' };
    if (estado.activa) return { clase: 'bg-success', texto: 'Activa y funcionando' };
    return { clase: 'bg-danger', texto: 'No disponible' };
  }, [estado.url, estado.activa]);

  const copiarUrl = async () => {
    if (!estado.url) return;
    try {
      await navigator.clipboard.writeText(estado.url);
      toast.success('URL copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar la URL');
    }
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
          <h4 className="mb-0 d-flex align-items-center gap-2">
            <FiLink2 /> URL del Sistema
          </h4>
          <button
            className="btn jyr-btn-secondary btn-sm"
            type="button"
            onClick={() => cargarUrlSistema()}
            disabled={estado.cargando}
          >
            <FiRefreshCw /> {estado.cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <p className="text-muted mb-3">
          Esta URL se actualiza automaticamente y muestra la direccion publica mas reciente del sistema.
        </p>

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <span className={`badge ${estadoBadge.clase}`}>{estadoBadge.texto}</span>
          {estado.status ? <span className="text-muted small">HTTP {estado.status}</span> : null}
        </div>

        <div className="mb-3">
          <label className="form-label">URL pública actual</label>
          <div
            className="form-control"
            style={{ minHeight: 48, whiteSpace: 'normal', wordBreak: 'break-all', display: 'flex', alignItems: 'center' }}
          >
            {estado.url || 'No hay URL pública disponible'}
          </div>
          <div className="d-grid gap-2 d-md-flex mt-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={copiarUrl}
              disabled={!estado.url}
              title="Copiar URL"
            >
              <FiCopy className="me-1" /> Copiar
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => window.open(estado.url, '_blank', 'noopener,noreferrer')}
              disabled={!estado.url}
              title="Abrir URL"
            >
              <FiExternalLink className="me-1" /> Abrir enlace
            </button>
          </div>
        </div>

        <div className="small text-muted">
          <div>Detalle: {estado.detalle || 'Sin detalles'}</div>
          <div>Ultima verificacion: {formatearFecha(estado.verificadaEn)}</div>
          <div>Ultimo cambio detectado: {formatearFecha(estado.archivoActualizadoEn)}</div>
        </div>

        {estado.error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {estado.error}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UrlSistema;
