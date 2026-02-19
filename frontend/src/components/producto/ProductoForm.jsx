import { useEffect, useState } from 'react'; // // Hooks

const ProductoForm = ({ onSubmit, saving, selected, onCancelEdit }) => {
  const [form, setForm] = useState({
    cod_categoria: 2,
    nombre_producto: '',
    unidad_medida: 'UND',
    precio_venta: '',
    isv: 18,
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
      isv: selected.isv ?? 18,
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
    if (Number(form.isv) < 0) return 'isv no puede ser negativo';
    return '';
  };

  const buildCreatePayload = () => ({
    cod_categoria: Number(form.cod_categoria),
    nombre_producto: form.nombre_producto.trim(),
    unidad_medida: form.unidad_medida.trim(),
    precio_venta: Number(form.precio_venta),
    isv: Number(form.isv),
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
      isv: Number(form.isv),
      estado_producto: Boolean(form.estado_producto),
    };

    // // Lista de campos en orden de prioridad (solo 1 se manda)
    const fields = [
      'cod_categoria',
      'nombre_producto',
      'unidad_medida',
      'precio_venta',
      'isv',
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
          isv: 18,
          estado_producto: true,
        });
      }
    } catch (err) {
      setFormError(err.message || 'Error en el formulario');
    }
  };

  return (
    <div className="card">
      <div className="card-header">{isEdit ? 'Editar producto' : 'Crear producto'}</div>

      <div className="card-body">
        {formError && <div className="alert alert-warning">{formError}</div>}

        <form className="row g-2" onSubmit={handleSubmit}>
          <div className="col-12">
            <label className="form-label">cod_categoria (1 Lubricantes / 2 Repuestos)</label>
            <input
              className="form-control"
              name="cod_categoria"
              value={form.cod_categoria}
              onChange={onChange}
              disabled={saving}
            />
          </div>

          <div className="col-12">
            <label className="form-label">nombre_producto</label>
            <input
              className="form-control"
              name="nombre_producto"
              value={form.nombre_producto}
              onChange={onChange}
              disabled={saving}
            />
          </div>

          <div className="col-6">
            <label className="form-label">unidad_medida</label>
            <input
              className="form-control"
              name="unidad_medida"
              value={form.unidad_medida}
              onChange={onChange}
              disabled={saving}
            />
          </div>

          <div className="col-6">
            <label className="form-label">precio_venta</label>
            <input
              className="form-control"
              name="precio_venta"
              value={form.precio_venta}
              onChange={onChange}
              disabled={saving}
            />
          </div>

          <div className="col-6">
            <label className="form-label">isv</label>
            <input className="form-control" name="isv" value={form.isv} onChange={onChange} disabled={saving} />
          </div>

          <div className="col-6 d-flex align-items-end">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                name="estado_producto"
                checked={form.estado_producto}
                onChange={onChange}
                disabled={saving}
              />
              <label className="form-check-label">estado_producto</label>
            </div>
          </div>

          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary w-100" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Actualizar (1 campo)' : 'Guardar'}
            </button>

            {isEdit && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={saving}
                onClick={() => onCancelEdit && onCancelEdit()}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {isEdit && (
          <div className="form-text mt-2">
            * En edición: por regla del backend (pa_update) se actualiza solo 1 campo por vez.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductoForm;
