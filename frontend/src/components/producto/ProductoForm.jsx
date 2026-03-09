import { useEffect, useState, useRef } from 'react'; // // Hooks
import { useIsv } from '../../hooks/useIsv.js'; // // Hook catálogo ISV
import { useCategorias } from '../../hooks/useCategorias.js'; // // Hook catálogo Categorías (HU-07)
import { useUbicaciones } from '../../hooks/useUbicaciones.js'; // // HU-10: Hook ubicaciones
import { FiCamera, FiX } from 'react-icons/fi';

const ProductoForm = ({ onSubmit, saving, selected, onCancelEdit, onSubirImagen }) => {
  const { catalogoIsv, loadingIsv } = useIsv(); // // Catálogo ISV desde BD
  const { categorias, loadingCategorias } = useCategorias(); // // Categorías dinámicas (HU-07)
  const { ubicaciones, loadingUbicaciones } = useUbicaciones(); // // HU-10: Ubicaciones

  const [form, setForm] = useState({
    cod_categoria: '',
    nombre_producto: '',
    unidad_medida: 'UND',
    precio_venta: '',
    cod_isv: '',
    estado_producto: 'Activo',
    cod_ubicacion: '',
  }); // // Estado form

  const [fieldErrors, setFieldErrors] = useState({}); // // Errores por campo
  const [formError, setFormError] = useState(''); // // Error general
  const isEdit = Boolean(selected?.cod_producto); // // Modo edición

  // HU-08: Estado de imagen
  const [imagenFile, setImagenFile] = useState(null); // // Archivo seleccionado
  const [imagenPreview, setImagenPreview] = useState(null); // // Preview URL
  const fileInputRef = useRef(null);

  // // Si seleccionan un producto, precarga el form
  useEffect(() => {
    if (!isEdit) {
      setImagenFile(null);
      setImagenPreview(null);
      return;
    }

    setForm({
      cod_categoria: selected.cod_categoria ?? '',
      nombre_producto: selected.nombre_producto ?? '',
      unidad_medida: selected.unidad_medida ?? 'UND',
      precio_venta: selected.precio_venta ?? '',
      cod_isv: selected.cod_isv ?? '',
      estado_producto: typeof selected.estado_producto === 'boolean'
        ? (selected.estado_producto ? 'Activo' : 'Inactivo')
        : (selected.estado_producto || 'Activo'),
      cod_ubicacion: selected.cod_ubicacion ?? '',
    });

    // HU-08: Mostrar imagen actual si existe
    if (selected.imagen_url) {
      const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
      setImagenPreview(`${API_URL}${selected.imagen_url}`);
    } else {
      setImagenPreview(null);
    }
    setImagenFile(null);
  }, [isEdit, selected]);

  // HU-08: Limpiar URL de preview al desmontar
  useEffect(() => {
    return () => {
      if (imagenPreview && imagenPreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreview);
      }
    };
  }, [imagenPreview]);

  // HU-08: Handler de selección de imagen
  const handleImagenChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
      setFormError('Solo se permiten imágenes JPG o PNG.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError('La imagen no puede exceder 2 MB.');
      e.target.value = '';
      return;
    }

    setImagenFile(file);
    if (imagenPreview && imagenPreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreview);
    }
    setImagenPreview(URL.createObjectURL(file));
    setFormError('');
  };

  const handleRemoveImagen = () => {
    setImagenFile(null);
    if (imagenPreview && imagenPreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreview);
    }
    setImagenPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al escribir
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // =====================================================
  // HU-03: Validación por campo con mensajes específicos
  // =====================================================
  const validar = () => {
    const errors = {};

    // Categoría (HU-07: validación dinámica)
    if (!form.cod_categoria) {
      errors.cod_categoria = 'Debe seleccionar una categoría.';
    } else if (categorias.length > 0 && !categorias.find(c => c.cod_categoria === Number(form.cod_categoria))) {
      errors.cod_categoria = 'Categoría no válida.';
    }

    // Nombre
    const nombre = form.nombre_producto.trim();
    if (!nombre) {
      errors.nombre_producto = 'El nombre del producto es obligatorio.';
    } else if (nombre.length < 2) {
      errors.nombre_producto = 'El nombre debe tener al menos 2 caracteres.';
    } else if (nombre.length > 100) {
      errors.nombre_producto = 'El nombre no puede exceder 100 caracteres.';
    }

    // Unidad de medida
    const unidad = form.unidad_medida.trim();
    if (!unidad) {
      errors.unidad_medida = 'La unidad de medida es obligatoria.';
    } else if (unidad.length > 10) {
      errors.unidad_medida = 'La unidad de medida no puede exceder 10 caracteres.';
    }

    // Precio
    const precio = Number(form.precio_venta);
    if (!form.precio_venta && form.precio_venta !== 0) {
      errors.precio_venta = 'El precio de venta es obligatorio.';
    } else if (isNaN(precio)) {
      errors.precio_venta = 'El precio debe ser un número válido.';
    } else if (precio <= 0) {
      errors.precio_venta = 'El precio de venta debe ser mayor a 0.';
    } else if (precio > 999999.99) {
      errors.precio_venta = 'El precio no puede exceder L. 999,999.99';
    }

    // ISV
    if (!form.cod_isv) {
      errors.cod_isv = 'Debe seleccionar un tipo de ISV.';
    }

    // Estado
    if (!['Activo', 'Inactivo', 'Descontinuado'].includes(form.estado_producto)) {
      errors.estado_producto = 'Estado inválido.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildCreatePayload = () => ({
    cod_categoria: Number(form.cod_categoria),
    nombre_producto: form.nombre_producto.trim(),
    unidad_medida: form.unidad_medida.trim().toUpperCase(),
    precio_venta: Number(form.precio_venta),
    cod_isv: Number(form.cod_isv),
    estado_producto: form.estado_producto,
    cod_ubicacion: form.cod_ubicacion ? Number(form.cod_ubicacion) : null,
  });

  // =====================================================
  // HU-05: Detectar TODOS los campos que cambiaron
  // pa_update los procesa 1 por 1 internamente en el modelo
  // =====================================================
  const buildUpdatePayload = () => {
    const original = selected || {};

    const next = {
      cod_categoria: Number(form.cod_categoria),
      nombre_producto: form.nombre_producto.trim(),
      unidad_medida: form.unidad_medida.trim().toUpperCase(),
      precio_venta: Number(form.precio_venta),
      cod_isv: Number(form.cod_isv),
      estado_producto: form.estado_producto,
      cod_ubicacion: form.cod_ubicacion ? Number(form.cod_ubicacion) : null,
    };

    const fields = [
      'cod_categoria',
      'nombre_producto',
      'unidad_medida',
      'precio_venta',
      'cod_isv',
      'estado_producto',
      'cod_ubicacion',
    ];

    // // Detecta TODOS los campos que cambiaron
    const changedData = {};
    for (const f of fields) {
      const a = original[f];
      const b = next[f];

      const normA = typeof b === 'number' ? Number(a) : String(a ?? '');
      const normB = typeof b === 'number' ? Number(b) : String(b ?? '');

      if (normA !== normB) {
        changedData[f] = next[f];
      }
    }

    if (Object.keys(changedData).length === 0 && !imagenFile) {
      throw new Error('No hay cambios para actualizar.');
    }

    return {
      cod_producto: selected.cod_producto,
      datos: changedData,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validar();
    if (!isValid) {
      setFormError('Corrige los campos marcados en rojo.');
      return;
    }

    setFormError('');
    setFieldErrors({});

    try {
      if (isEdit) {
        // HU-08: Si se seleccionó nueva imagen, subirla
        if (imagenFile && onSubirImagen) {
          await onSubirImagen(selected.cod_producto, imagenFile);
        }

        const payload = buildUpdatePayload(); // // HU-05: PUT múltiples campos
        if (payload.datos && Object.keys(payload.datos).length > 0) {
          await onSubmit(payload); // // Ejecuta UPDATE solo si hay campos cambiados
        }
      } else {
        const payload = buildCreatePayload(); // // POST
        const productoCreado = await onSubmit(payload); // // Ejecuta CREATE (await para esperar respuesta)

        // HU-08: Si se seleccionó imagen, subirla al producto recién creado
        if (imagenFile && productoCreado?.cod_producto && onSubirImagen) {
          await onSubirImagen(productoCreado.cod_producto, imagenFile);
        }

        // // Limpia form luego de crear exitosamente
        setForm({
          cod_categoria: '',
          nombre_producto: '',
          unidad_medida: 'UND',
          precio_venta: '',
          cod_isv: '',
          estado_producto: 'Activo',
          cod_ubicacion: '',
        });
        handleRemoveImagen();
      }
    } catch (err) {
      setFormError(err.message || 'Error en el formulario');
    }
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-header">
        <h3>{isEdit ? '✏️ Editar producto' : '➕ Crear producto'}</h3>
      </div>

      <div className="jyr-card-body">
        {/* HU-05: Detalle del producto en modo edición */}
        {isEdit && selected && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--jyr-info-bg)', color: 'var(--jyr-info)',
            fontSize: 13, fontWeight: 500, marginBottom: 16,
            border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>
              {selected.codigo_producto || `PROD-${String(selected.cod_producto).padStart(4, '0')}`}
            </span>
            <span>— Editando: <strong>{selected.nombre_producto}</strong></span>
          </div>
        )}

        {formError && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--jyr-warning-bg)', color: 'var(--jyr-warning)',
            fontSize: 13, fontWeight: 500, marginBottom: 16,
            border: '1px solid #fde68a'
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="jyr-form-group">
            <label className="jyr-form-label">Categoría</label>
            <select
              className={`jyr-form-control jyr-form-select ${fieldErrors.cod_categoria ? 'jyr-input-error' : ''}`}
              name="cod_categoria"
              value={form.cod_categoria}
              onChange={onChange}
              disabled={saving || loadingCategorias}
            >
              <option value="">-- Seleccionar --</option>
              {categorias.map((cat) => (
                <option key={cat.cod_categoria} value={cat.cod_categoria}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
            {fieldErrors.cod_categoria && <span className="jyr-field-error">{fieldErrors.cod_categoria}</span>}
          </div>

          <div className="jyr-form-group">
            <label className="jyr-form-label">Nombre del producto</label>
            <input
              className={`jyr-form-control ${fieldErrors.nombre_producto ? 'jyr-input-error' : ''}`}
              name="nombre_producto"
              placeholder="Ej: Filtro de aceite"
              value={form.nombre_producto}
              onChange={onChange}
              disabled={saving}
              maxLength={100}
            />
            {fieldErrors.nombre_producto && <span className="jyr-field-error">{fieldErrors.nombre_producto}</span>}
            <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
              {form.nombre_producto.trim().length}/100
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jyr-form-group">
              <label className="jyr-form-label">Unidad medida</label>
              <input
                className={`jyr-form-control ${fieldErrors.unidad_medida ? 'jyr-input-error' : ''}`}
                name="unidad_medida"
                value={form.unidad_medida}
                onChange={onChange}
                disabled={saving}
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
              />
              {fieldErrors.unidad_medida && <span className="jyr-field-error">{fieldErrors.unidad_medida}</span>}
            </div>

            <div className="jyr-form-group">
              <label className="jyr-form-label">Precio venta (L.)</label>
              <input
                className={`jyr-form-control ${fieldErrors.precio_venta ? 'jyr-input-error' : ''}`}
                name="precio_venta"
                type="number"
                step="0.01"
                min="0.01"
                max="999999.99"
                placeholder="0.00"
                value={form.precio_venta}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.precio_venta && <span className="jyr-field-error">{fieldErrors.precio_venta}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jyr-form-group">
              <label className="jyr-form-label">ISV (Impuesto)</label>
              <select
                className={`jyr-form-control jyr-form-select ${fieldErrors.cod_isv ? 'jyr-input-error' : ''}`}
                name="cod_isv"
                value={form.cod_isv}
                onChange={onChange}
                disabled={saving || loadingIsv}
              >
                <option value="">-- Seleccionar --</option>
                {catalogoIsv.map((isv) => (
                  <option key={isv.cod_isv} value={isv.cod_isv}>
                    {isv.descripcion} ({isv.porcentaje}%)
                  </option>
                ))}
              </select>
              {fieldErrors.cod_isv && <span className="jyr-field-error">{fieldErrors.cod_isv}</span>}
            </div>

            <div className="jyr-form-group">
              <label className="jyr-form-label">Estado del producto</label>
              <select
                className="jyr-form-control jyr-form-select"
                name="estado_producto"
                value={form.estado_producto}
                onChange={onChange}
                disabled={saving}
                style={{
                  fontWeight: 600,
                  color: form.estado_producto === 'Activo' ? 'var(--jyr-success, #16a34a)'
                    : form.estado_producto === 'Descontinuado' ? 'var(--jyr-warning, #d97706)'
                    : 'var(--jyr-danger, #dc2626)'
                }}
              >
                <option value="Activo">✅ Activo</option>
                <option value="Inactivo">🚫 Inactivo</option>
                <option value="Descontinuado">⚠️ Descontinuado</option>
              </select>
            </div>
          </div>

          {/* HU-10: Ubicación en bodega */}
          <div className="jyr-form-group">
            <label className="jyr-form-label">Ubicación en bodega</label>
            <select
              className="jyr-form-control jyr-form-select"
              name="cod_ubicacion"
              value={form.cod_ubicacion}
              onChange={onChange}
              disabled={saving || loadingUbicaciones}
            >
              <option value="">-- Sin ubicación asignada --</option>
              {ubicaciones
                .filter(u => u.estado_ubi === 'ACTIVA')
                .map((u) => (
                  <option key={u.cod_ubicacion} value={u.cod_ubicacion}>
                    Pasillo {u.pasillo} — Estantería {u.estanteria} — Nivel {u.nivel_1}{u.nivel_2 ? ` — Nivel 2: ${u.nivel_2}` : ''}{u.descripcion ? ` (${u.descripcion})` : ''}
                  </option>
                ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
              Estante/posición donde se almacena el producto
            </span>
          </div>

          {/* HU-08: Sección de imagen */}
          <div className="jyr-form-group">
            <label className="jyr-form-label">Imagen del producto</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {imagenPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={imagenPreview}
                    alt="Preview"
                    style={{
                      width: 72, height: 72, objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid var(--jyr-gray-200)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImagen}
                    title="Quitar imagen"
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      background: 'var(--jyr-danger, #dc2626)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 20, height: 20, fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0
                    }}
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 72, height: 72, borderRadius: 'var(--radius-sm)',
                    border: '2px dashed var(--jyr-gray-300)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--jyr-gray-400)',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--jyr-red)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--jyr-gray-300)'}
                >
                  <FiCamera size={22} />
                  <span style={{ fontSize: 10, marginTop: 2 }}>Subir</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  onChange={handleImagenChange}
                />
                <button
                  type="button"
                  className="jyr-btn jyr-btn-sm jyr-btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  style={{ fontSize: 12 }}
                >
                  <FiCamera size={13} style={{ marginRight: 4 }} />
                  {imagenPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                  JPG o PNG. Máx 2 MB.
                </p>
                {imagenFile && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--jyr-success, #16a34a)', fontWeight: 500 }}>
                    {imagenFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              className={`jyr-btn ${isEdit ? 'jyr-btn-primary' : 'jyr-btn-danger'}`}
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar producto'}
            </button>

            {isEdit && (
              <button
                type="button"
                className="jyr-btn jyr-btn-outline"
                disabled={saving}
                onClick={() => onCancelEdit && onCancelEdit()}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {isEdit && (
          <p style={{
            marginTop: 12, fontSize: 11, color: 'var(--jyr-gray-400)',
            fontStyle: 'italic'
          }}>
            * Modifica los campos que necesites y presiona "Actualizar".
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductoForm;
