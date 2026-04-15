import React, { useEffect, useState } from 'react';
import { FiDatabase, FiRefreshCw, FiDownloadCloud, FiUploadCloud, FiDownload, FiFile } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { backupSystemService } from '../../services/serviceIndex.js';
import { confirmDialog } from '../../utils/notifications.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const formatearFecha = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString('es-HN');
};

const obtenerNombreArchivo = (headers, fallbackName = 'backup.zip') => {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (!disposition) return fallbackName;

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallbackName;
};

const BackupSistema = () => {
  const { usuario } = useAuth();
  const puedeRestaurar = ['Administrador', 'Super Administrador'].includes(usuario?.rol);
  const [backups, setBackups] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [restaurando, setRestaurando] = useState('');
  const [descargando, setDescargando] = useState('');
  const [archivoBackup, setArchivoBackup] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const cargarBackups = async () => {
    setCargando(true);
    try {
      const { data } = await backupSystemService.listar();
      setBackups(Array.isArray(data?.datos) ? data.datos : []);
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo cargar la lista de backups');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBackups();
  }, []);

  const crearBackup = async () => {
    setEjecutando(true);
    try {
      const { data } = await backupSystemService.ejecutar();
      toast.success(data?.mensaje || 'Backup generado correctamente');
      await cargarBackups();
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo generar el backup');
    } finally {
      setEjecutando(false);
    }
  };

  const restaurar = async (backupFolder) => {
    const ok = await confirmDialog({
      variant: 'restore',
      title: 'Restaurar backup',
      text: 'Esta accion reemplaza los datos actuales del sistema. ¿Deseas continuar?',
      confirmText: 'Sí, restaurar'
    });

    if (!ok) return;

    const confirmacion = window.prompt('Escribe RESTAURAR para confirmar');
    if (confirmacion !== 'RESTAURAR') {
      toast.warn('Restauracion cancelada');
      return;
    }

    setRestaurando(backupFolder);
    try {
      const { data } = await backupSystemService.restaurar(backupFolder);
      toast.success(data?.mensaje || 'Backup restaurado correctamente');
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo restaurar el backup');
    } finally {
      setRestaurando('');
    }
  };

  const descargar = async (backupFolder) => {
    setDescargando(backupFolder);
    try {
      const response = await backupSystemService.descargar(backupFolder);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = obtenerNombreArchivo(response.headers, `${backupFolder.split('/').pop() || 'backup'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success('Backup descargado correctamente');
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo descargar el backup');
    } finally {
      setDescargando('');
    }
  };

  const restaurarDesdeArchivo = async () => {
    if (!archivoBackup) {
      toast.warn('Selecciona un archivo .zip para restaurar');
      return;
    }
 
    const ok = await confirmDialog({
      variant: 'restore',
      title: 'Restaurar desde archivo',
      text: 'Se reemplazaran los datos actuales con el backup subido. ¿Deseas continuar?',
      confirmText: 'Sí, restaurar'
    });

    if (!ok) return;

    const confirmacion = window.prompt('Escribe RESTAURAR para confirmar');
    if (confirmacion !== 'RESTAURAR') {
      toast.warn('Restauracion cancelada');
      return;
    }

    setSubiendoArchivo(true);
    try {
      const formData = new FormData();
      formData.append('backupFile', archivoBackup);
      const { data } = await backupSystemService.restaurarArchivo(formData);
      toast.success(data?.mensaje || 'Backup restaurado desde archivo correctamente');
      setArchivoBackup(null);
      const input = document.getElementById('backup-file-input');
      if (input) input.value = '';
      await cargarBackups();
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo restaurar desde archivo');
    } finally {
      setSubiendoArchivo(false);
    }
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
          <h4 className="mb-0 d-flex align-items-center gap-2">
            <FiDatabase /> Respaldos del Sistema
          </h4>
          <div className="d-flex gap-2">
            <button type="button" className="btn jyr-btn-secondary btn-sm" onClick={cargarBackups} disabled={cargando || ejecutando}>
              <FiRefreshCw /> Actualizar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={crearBackup} disabled={ejecutando}>
              <FiDownloadCloud /> {ejecutando ? 'Generando...' : 'Generar Backup'}
            </button>
          </div>
        </div>

        {puedeRestaurar && (
          <div className="border rounded p-3 mb-3">
            <h6 className="mb-2 d-flex align-items-center gap-2">
              <FiFile /> Restaurar desde archivo ZIP
            </h6>
            <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center">
              <input
                id="backup-file-input"
                type="file"
                className="form-control"
                accept=".zip"
                onChange={(e) => setArchivoBackup(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={restaurarDesdeArchivo}
                disabled={!archivoBackup || subiendoArchivo}
              >
                <FiUploadCloud className="me-1" />
                {subiendoArchivo ? 'Restaurando...' : 'Subir y Restaurar'}
              </button>
            </div>
            <small className="text-muted d-block mt-2">
              Usa un ZIP descargado desde este modulo para asegurar compatibilidad.
            </small>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Carpeta</th>
                <th>Creado</th>
                <th>BD</th>
                <th>Uploads</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="5" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted py-4">No hay backups disponibles</td></tr>
              ) : backups.map((bkp) => (
                <tr key={bkp.ruta_relativa}>
                  <td><code>{bkp.ruta_relativa}</code></td>
                  <td>{formatearFecha(bkp.creado_en)}</td>
                  <td>{bkp.tiene_db ? <span className="badge bg-success">Sí</span> : <span className="badge bg-danger">No</span>}</td>
                  <td>{bkp.incluye_uploads ? <span className="badge bg-success">Sí</span> : <span className="badge bg-secondary">No</span>}</td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={() => descargar(bkp.ruta_relativa)}
                      disabled={descargando === bkp.ruta_relativa}
                    >
                      <FiDownload className="me-1" />
                      {descargando === bkp.ruta_relativa ? 'Descargando...' : 'Descargar'}
                    </button>
                    {puedeRestaurar && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => restaurar(bkp.ruta_relativa)}
                        disabled={restaurando === bkp.ruta_relativa}
                      >
                        <FiUploadCloud className="me-1" />
                        {restaurando === bkp.ruta_relativa ? 'Restaurando...' : 'Restaurar'}
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
  );
};

export default BackupSistema;
