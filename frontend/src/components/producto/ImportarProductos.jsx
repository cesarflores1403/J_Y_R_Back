import { useState, useRef } from 'react';
import { FiUpload, FiDownload, FiX, FiAlertTriangle, FiCheckCircle, FiFile } from 'react-icons/fi';
import { productoApi } from '../../services/producto.api.js';

// =====================================================
// HU-12: Componente de importación masiva de productos
// Permite subir CSV/Excel, muestra reporte de errores
// =====================================================

const ImportarProductos = ({ onImportSuccess }) => {
  const [archivo, setArchivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null); // { insertados, totalFilas, errores }
  const [errorGeneral, setErrorGeneral] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setErrorGeneral('Solo se permiten archivos CSV o Excel (.xlsx, .xls).');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorGeneral('El archivo no puede exceder 5 MB.');
      e.target.value = '';
      return;
    }

    setArchivo(file);
    setResultado(null);
    setErrorGeneral('');
  };

  const handleRemoveFile = () => {
    setArchivo(null);
    setResultado(null);
    setErrorGeneral('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportar = async () => {
    if (!archivo) return;

    setImportando(true);
    setResultado(null);
    setErrorGeneral('');

    try {
      const res = await productoApi.importar(archivo);
      setResultado(res.data);
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      if (err.data) {
        // Errores de validación por fila
        setResultado(err.data);
      } else {
        setErrorGeneral(err.message || 'Error al importar productos');
      }
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarPlantilla = () => {
    window.open(productoApi.getPlantillaUrl(), '_blank');
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-header">
        <h3>📥 Importar Productos</h3>
      </div>

      <div className="jyr-card-body">
        {/* Instrucciones */}
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--jyr-info-bg, #eff6ff)', color: 'var(--jyr-info, #2563eb)',
          fontSize: 13, marginBottom: 16, border: '1px solid #bfdbfe', lineHeight: 1.6
        }}>
          <strong>Instrucciones:</strong>
          <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>Descarga la <strong>plantilla CSV</strong> con las columnas requeridas.</li>
            <li>Llena los datos de los productos (una fila por producto).</li>
            <li>Sube el archivo CSV o Excel (.xlsx) y haz clic en <strong>Importar</strong>.</li>
          </ol>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--jyr-gray-500)' }}>
            <strong>Columnas requeridas:</strong> nombre_producto, cod_categoria, unidad_medida, precio_venta, cod_isv<br />
            <strong>Columnas opcionales:</strong> estado_producto, cod_ubicacion
          </p>
        </div>

        {/* Botón descargar plantilla */}
        <button
          className="jyr-btn jyr-btn-sm jyr-btn-outline"
          onClick={handleDescargarPlantilla}
          style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <FiDownload size={14} /> Descargar plantilla CSV
        </button>

        {/* Selector de archivo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          flexWrap: 'wrap'
        }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {archivo ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--jyr-gray-200)', background: '#fafafa'
            }}>
              <FiFile size={16} style={{ color: 'var(--jyr-gray-500)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{archivo.name}</span>
              <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                ({(archivo.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={handleRemoveFile}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--jyr-gray-400)', padding: 2
                }}
              >
                <FiX size={14} />
              </button>
            </div>
          ) : (
            <button
              className="jyr-btn jyr-btn-sm jyr-btn-outline"
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FiUpload size={14} /> Seleccionar archivo
            </button>
          )}

          {archivo && (
            <button
              className="jyr-btn jyr-btn-danger"
              onClick={handleImportar}
              disabled={importando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {importando ? (
                <>
                  <div className="jyr-spinner" style={{ width: 14, height: 14 }} />
                  Importando...
                </>
              ) : (
                <>
                  <FiUpload size={14} /> Importar productos
                </>
              )}
            </button>
          )}
        </div>

        {/* Error general */}
        {errorGeneral && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--jyr-warning-bg, #fef3c7)', color: 'var(--jyr-warning, #d97706)',
            fontSize: 13, fontWeight: 500, marginBottom: 16,
            border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <FiAlertTriangle size={16} /> {errorGeneral}
          </div>
        )}

        {/* Resultado exitoso */}
        {resultado && resultado.errores.length === 0 && resultado.insertados > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: '#f0fdf4', color: '#16a34a',
            fontSize: 14, fontWeight: 600, marginBottom: 16,
            border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <FiCheckCircle size={18} />
            Se importaron {resultado.insertados} producto(s) correctamente.
          </div>
        )}

        {/* Reporte de errores */}
        {resultado && resultado.errores.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: '#fef2f2', color: '#dc2626',
              fontSize: 13, fontWeight: 600,
              border: '1px solid #fecaca', borderBottom: 'none',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <FiAlertTriangle size={16} />
              Se encontraron errores en {resultado.errores.length} fila(s) de {resultado.totalFilas}.
              No se insertó ningún producto.
            </div>

            <div style={{
              maxHeight: 300, overflowY: 'auto',
              border: '1px solid #fecaca',
              borderRadius: '0 0 var(--radius-sm) var(--radius-sm)'
            }}>
              <table className="jyr-table" style={{ margin: 0, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 70, whiteSpace: 'nowrap' }}>Fila</th>
                    <th>Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.errores.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: '#dc2626', textAlign: 'center' }}>
                        {e.fila}
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {e.errores.map((msg, j) => (
                            <li key={j} style={{ color: 'var(--jyr-gray-600)' }}>{msg}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportarProductos;
