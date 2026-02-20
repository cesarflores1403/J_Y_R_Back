import { useEffect, useState } from 'react'; // // Hooks
import { useIsv } from '../../hooks/useIsv.js'; // // Hook catálogo ISV

const ProductoForm = ({ onSubmit, saving, selected, onCancelEdit }) => {
  const { catalogoIsv, loadingIsv } = useIsv(); // // Catálogo ISV desde BD

  const [form, setForm] = useState({
    cod_categoria: 2,
    nombre_producto: '',
    unidad_medida: 'UND',
    precio_venta: '',
    cod_isv: '',
    estado_producto: true,
  }); // // Estado form

  const [formError, setFormError] = useState(''); // // Error validación
  const isEdit = Boolean(selected?.cod_producto); // // Modo edición

  // // Si seleccionan un producto, precarga el form
  useEffect(() => {
    if (!isEdit) return;

    setForm({
      cod_categoria: selected.cod_categoria ?? 2,
      nombre_producto: selected.nombre_producto ?? '',
      unidad_medida: selected.unidad_medida ?? 'UND',
      precio_venta: selected.precio_venta ?? '',
      cod_isv: selected.cod_isv ?? '',
      estado_producto: Boolean(selected.estado_producto),
    });
  }, [isEdit, selected]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target; // // Input
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value, // // checkbox vs texto
    }));
  };

  const validar = () => {
    if (![1, 2].includes(Number(form.cod_categoria))) return 'cod_categoria debe ser 1 o 2';
    if (!form.nombre_producto.trim()) return 'nombre_producto es requerido';
    if (!form.unidad_medida.trim()) return 'unidad_medida es requerido';
    if (Number(form.precio_venta) <= 0) return 'precio_venta debe ser mayor a 0';
    if (!form.cod_isv) return 'Debe seleccionar un tipo de ISV';
    return '';
  };

  const buildCreatePayload = () => ({
    cod_categoria: Number(form.cod_categoria),
    nombre_producto: form.nombre_producto.trim(),
    unidad_medida: form.unidad_medida.trim(),
    precio_venta: Number(form.precio_venta),
    cod_isv: Number(form.cod_isv),
    estado_producto: Boolean(form.estado_producto),
  });

  // =====================================================
  // pa_update: 1 campo por vez
  // Para edición: elegimos SOLO 1 campo que cambió
  // =====================================================
  const buildUpdatePayloadOneField = () => {
    const original = selected || {};

    const next = {
      cod_categoria: Number(form.cod_categoria),
      nombre_producto: form.nombre_producto.trim(),
      unidad_medida: form.unidad_medida.trim(),
      precio_venta: Number(form.precio_venta),
      cod_isv: Number(form.cod_isv),
      estado_producto: Boolean(form.estado_producto),
    };

    // // Lista de campos en orden de prioridad (solo 1 se manda)
    const fields = [
      'cod_categoria',
      'nombre_producto',
      'unidad_medida',
      'precio_venta',
      'cod_isv',
      'estado_producto',
    ];

    // // Detecta el primer cambio
    let changedField = null;
    for (const f of fields) {
      const a = original[f];
      const b = next[f];

      // // Normaliza comparaciones numéricas/boolean
      const normA =
        typeof b === 'number' ? Number(a) : typeof b === 'boolean' ? Boolean(a) : String(a ?? '');
      const normB =
        typeof b === 'number' ? Number(b) : typeof b === 'boolean' ? Boolean(b) : String(b ?? '');

      if (normA !== normB) {
        changedField = f;
        break;
      }
    }

    if (!changedField) {
      throw new Error('No hay cambios para actualizar');
    }

    return {
      cod_producto: selected.cod_producto,
      datos: {
        [changedField]: next[changedField],
      },
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // // Evita refresh

    const msg = validar(); // // Valida
    if (msg) {
      setFormError(msg); // // Muestra error
      return;
    }

    setFormError(''); // // Limpia error

    try {
      if (isEdit) {
        const payload = buildUpdatePayloadOneField(); // // PUT 1 campo

        // =====================================================
        // DEBUG TEMPORAL: Ver exactamente qué manda al backend
        // =====================================================
        console.log('UPDATE PAYLOAD =>', payload);

        onSubmit(payload); // // Ejecuta UPDATE
      } else {
        const payload = buildCreatePayload(); // // POST
        onSubmit(payload); // // Ejecuta CREATE

        // // Limpia form luego de crear
        setForm({
          cod_categoria: 2,
          nombre_producto: '',
          unidad_medida: 'UND',
          precio_venta: '',
          cod_isv: '',
          estado_producto: true,
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
              className="jyr-form-control jyr-form-select"
              name="cod_categoria"
              value={form.cod_categoria}
              onChange={onChange}
              disabled={saving}
            >
              <option value={1}>1 — Lubricantes</option>
              <option value={2}>2 — Repuestos</option>
            </select>
          </div>

          <div className="jyr-form-group">
            <label className="jyr-form-label">Nombre del producto</label>
            <input
              className="jyr-form-control"
              name="nombre_producto"
              placeholder="Ej: Filtro de aceite"
              value={form.nombre_producto}
              onChange={onChange}
              disabled={saving}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jyr-form-group">
              <label className="jyr-form-label">Unidad medida</label>
              <input
                className="jyr-form-control"
                name="unidad_medida"
                value={form.unidad_medida}
                onChange={onChange}
                disabled={saving}
              />
            </div>

            <div className="jyr-form-group">
              <label className="jyr-form-label">Precio venta (L.)</label>
              <input
                className="jyr-form-control"
                name="precio_venta"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.precio_venta}
                onChange={onChange}
                disabled={saving}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jyr-form-group">
              <label className="jyr-form-label">ISV (Impuesto)</label>
              <select
                className="jyr-form-control jyr-form-select"
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
            </div>

            <div className="jyr-form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 18 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 500
              }}>
                <input
                  type="checkbox"
                  name="estado_producto"
                  checked={form.estado_producto}
                  onChange={onChange}
                  disabled={saving}
                  style={{ width: 18, height: 18, accentColor: 'var(--jyr-red)' }}
                />
                {form.estado_producto ? (
                  <span className="jyr-badge jyr-badge-success">Activo</span>
                ) : (
                  <span className="jyr-badge jyr-badge-danger">Inactivo</span>
                )}
              </label>
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
            * En edición se actualiza 1 campo por vez (pa_update).
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductoForm;
