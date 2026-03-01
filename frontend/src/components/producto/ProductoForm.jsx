import { useEffect, useState } from 'react'; // // Hooks
import { useIsv } from '../../hooks/useIsv.js'; // // Hook catálogo ISV
import { useCategorias } from '../../hooks/useCategorias.js'; // // Hook catálogo Categorías (HU-07)

const ProductoForm = ({ onSubmit, saving, selected, onCancelEdit }) => {
  const { catalogoIsv, loadingIsv } = useIsv(); // // Catálogo ISV desde BD
  const { categorias, loadingCategorias } = useCategorias(); // // Categorías dinámicas (HU-07)

  const [form, setForm] = useState({
    cod_categoria: '',
    nombre_producto: '',
    unidad_medida: 'UND',
    precio_venta: '',
    cod_isv: '',
    estado_producto: 'Activo',
  }); // // Estado form

  const [fieldErrors, setFieldErrors] = useState({}); // // Errores por campo
  const [formError, setFormError] = useState(''); // // Error general
  const isEdit = Boolean(selected?.cod_producto); // // Modo edición

  // // Si seleccionan un producto, precarga el form
  useEffect(() => {
    if (!isEdit) return;

    setForm({
      cod_categoria: selected.cod_categoria ?? '',
      nombre_producto: selected.nombre_producto ?? '',
      unidad_medida: selected.unidad_medida ?? 'UND',
      precio_venta: selected.precio_venta ?? '',
      cod_isv: selected.cod_isv ?? '',
      estado_producto: typeof selected.estado_producto === 'boolean'
        ? (selected.estado_producto ? 'Activo' : 'Inactivo')
        : (selected.estado_producto || 'Activo'),
    });
  }, [isEdit, selected]);

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
    };

    const fields = [
      'cod_categoria',
      'nombre_producto',
      'unidad_medida',
      'precio_venta',
      'cod_isv',
      'estado_producto',
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

    if (Object.keys(changedData).length === 0) {
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
        const payload = buildUpdatePayload(); // // HU-05: PUT múltiples campos
        await onSubmit(payload); // // Ejecuta UPDATE (await para esperar respuesta)
      } else {
        const payload = buildCreatePayload(); // // POST
        await onSubmit(payload); // // Ejecuta CREATE (await para esperar respuesta)

        // // Limpia form luego de crear exitosamente
        setForm({
          cod_categoria: '',
          nombre_producto: '',
          unidad_medida: 'UND',
          precio_venta: '',
          cod_isv: '',
          estado_producto: 'Activo',
        });
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
