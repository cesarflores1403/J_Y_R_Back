import { useEffect, useState, useRef } from 'react'; // // Hooks
import { useIsv } from '../../hooks/useIsv.js'; // // Hook catálogo ISV
import { useCategorias } from '../../hooks/useCategorias.js'; // // Hook catálogo Categorías (HU-07)
import { useUbicaciones } from '../../hooks/useUbicaciones.js'; // // HU-10: Hook ubicaciones
import { FiCamera, FiX } from 'react-icons/fi';
import { resolveApiBase } from '../../utils/runtimeApi.js';

const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s.,#()\/&+\-]*$/u;
const PRODUCT_NAME_FORMAT_MESSAGE = 'El nombre solo puede contener letras, números, espacios y los símbolos . , - / # ( ) & +.';
const PRODUCT_NAME_REPEATED_PATTERN = /^([\p{L}\p{N}])\1+$/u;
const PRODUCT_NAME_REPEATED_MESSAGE = 'El nombre no puede estar formado por un mismo carácter repetido.';

const ProductoForm = ({
  onSubmit,
  saving,
  selected,
  duplicateFrom,
  onCancelEdit,
  onSubirImagen,
  mostrarPrecioCosto = true,
  mostrarMargen = false,
}) => {
  const clavesEspecificacionFijas = ['Marca', 'Modelo', 'Año del carro'];

  const construirEspecificacionesBase = () => ([
    { clave: clavesEspecificacionFijas[0], valor: '' },
    { clave: clavesEspecificacionFijas[1], valor: '' },
    { clave: clavesEspecificacionFijas[2], valor: '' },
  ]);

  const { catalogoIsv, loadingIsv } = useIsv(); // // Catálogo ISV desde BD
  const { categorias, loadingCategorias } = useCategorias(); // // Categorías dinámicas (HU-07)
  const { ubicaciones, loadingUbicaciones } = useUbicaciones(); // // HU-10: Ubicaciones

  const [form, setForm] = useState({
    cod_categoria: '',
    nombre_producto: '',
    descripcion: '',
    unidad_medida: 'UND',
    precio_venta: '',
    precio_costo: '',
    stock_inicial: '',
    stock_nuevo: '',
    stock_agregar: '',
    cod_isv: '',
    estado_producto: 'Activo',
    cod_ubicacion: '',
    stock_minimo: '',
    punto_reorden: '',
  }); // // Estado form

  const [fieldErrors, setFieldErrors] = useState({}); // // Errores por campo
  const [formError, setFormError] = useState(''); // // Error general
  const [especificacionesRows, setEspecificacionesRows] = useState(construirEspecificacionesBase());
  const isEdit = Boolean(selected?.cod_producto); // // Modo edición

  // HU-08: Estado de imagen
  const [imagenFile, setImagenFile] = useState(null); // // Archivo seleccionado
  const [imagenPreview, setImagenPreview] = useState(null); // // Preview URL
  const fileInputRef = useRef(null);

  // // Precarga para edición o duplicado
  useEffect(() => {
    if (isEdit) {
      setForm({
        cod_categoria: selected.cod_categoria ?? '',
        nombre_producto: selected.nombre_producto ?? '',
        descripcion: selected.descripcion ?? '',
        unidad_medida: selected.unidad_medida ?? 'UND',
        precio_venta: selected.precio_venta ?? '',
        precio_costo: selected.precio_costo ?? '',
        stock_inicial: '',
        stock_nuevo: String(Number(selected.stock_total ?? 0)),
        stock_agregar: '',
        cod_isv: selected.cod_isv ?? '',
        estado_producto: typeof selected.estado_producto === 'boolean'
          ? (selected.estado_producto ? 'Activo' : 'Inactivo')
          : (selected.estado_producto || 'Activo'),
        cod_ubicacion: selected.cod_ubicacion ?? '',
        stock_minimo: selected.stock_minimo ?? '',
        punto_reorden: selected.punto_reorden ?? '',
      });
      setEspecificacionesRows(normalizarEspecificacionesRows(selected.especificaciones));

      // HU-08: Mostrar imagen actual si existe
      if (selected.imagen_url) {
        const API_URL = resolveApiBase();
        setImagenPreview(`${API_URL}${selected.imagen_url}`);
      } else {
        setImagenPreview(null);
      }
      setImagenFile(null);
      return;
    }

    if (duplicateFrom) {
      setForm({
        cod_categoria: duplicateFrom.cod_categoria ?? '',
        nombre_producto: `(Copia) ${duplicateFrom.nombre_producto ?? ''}`,
        descripcion: duplicateFrom.descripcion ?? '',
        unidad_medida: duplicateFrom.unidad_medida ?? 'UND',
        precio_venta: duplicateFrom.precio_venta ?? '',
        precio_costo: duplicateFrom.precio_costo ?? '',
        stock_inicial: '',
        stock_nuevo: '',
        stock_agregar: '',
        cod_isv: duplicateFrom.cod_isv ?? '',
        estado_producto: typeof duplicateFrom.estado_producto === 'boolean'
          ? (duplicateFrom.estado_producto ? 'Activo' : 'Inactivo')
          : (duplicateFrom.estado_producto || 'Activo'),
        cod_ubicacion: duplicateFrom.cod_ubicacion ?? '',
        stock_minimo: duplicateFrom.stock_minimo ?? '',
        punto_reorden: duplicateFrom.punto_reorden ?? '',
      });
      setEspecificacionesRows(normalizarEspecificacionesRows(duplicateFrom.especificaciones));

      // HU-14: no copiar imagen en duplicado
      setImagenFile(null);
      setImagenPreview(null);
      return;
    }

    setForm({
      cod_categoria: '',
      nombre_producto: '',
      descripcion: '',
      unidad_medida: 'UND',
      precio_venta: '',
      precio_costo: '',
      stock_inicial: '',
      stock_nuevo: '',
      stock_agregar: '',
      cod_isv: '',
      estado_producto: 'Activo',
      cod_ubicacion: '',
      stock_minimo: '',
      punto_reorden: '',
    });
    setEspecificacionesRows(construirEspecificacionesBase());

    setImagenFile(null);
    setImagenPreview(null);
  }, [isEdit, selected, duplicateFrom]);

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

  const normalizarEspecificacionesRows = (especificaciones) => {
    if (!especificaciones || typeof especificaciones !== 'object' || Array.isArray(especificaciones)) {
      return construirEspecificacionesBase();
    }

    const rows = Object.entries(especificaciones)
      .map(([clave, valor]) => ({
        clave: String(clave ?? '').trim(),
        valor: String(valor ?? '').trim(),
      }))
      .filter((item) => item.clave || item.valor);

    if (rows.length === 0) {
      return construirEspecificacionesBase();
    }

    const normalizarClave = (texto) => String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const mapValores = new Map(rows.map((item) => [normalizarClave(item.clave), item.valor]));
    const base = [
      { clave: clavesEspecificacionFijas[0], valor: mapValores.get('marca') || '' },
      { clave: clavesEspecificacionFijas[1], valor: mapValores.get('modelo') || '' },
      {
        clave: clavesEspecificacionFijas[2],
        valor: mapValores.get('ano del carro') || mapValores.get('ano') || mapValores.get('material') || ''
      },
    ];

    return base;
  };

  const construirEspecificaciones = () => {
    const entries = especificacionesRows
      .slice(0, clavesEspecificacionFijas.length)
      .map((item) => [String(item.clave || '').trim(), String(item.valor || '').trim()])
      .filter(([clave, valor]) => clave && valor);

    return entries.length > 0 ? Object.fromEntries(entries) : null;
  };

  const actualizarEspecificacion = (index, campo, value) => {
    setEspecificacionesRows((prev) => prev.map((row, i) => (
      i === index ? { ...row, [campo]: value } : row
    )));

    if (fieldErrors.especificaciones) {
      setFieldErrors((prev) => ({ ...prev, especificaciones: '' }));
    }
  };

  const calcularMargen = (precioVenta, precioCosto) => {
    const venta = Number(precioVenta);
    const costo = Number(precioCosto);

    if (!Number.isFinite(venta) || venta <= 0) return null;
    if (!Number.isFinite(costo) || costo < 0) return null;

    return Number((((venta - costo) / venta) * 100).toFixed(2));
  };

  const margenCalculado = calcularMargen(form.precio_venta, form.precio_costo);

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
    } else if (!PRODUCT_NAME_PATTERN.test(nombre)) {
      errors.nombre_producto = PRODUCT_NAME_FORMAT_MESSAGE;
    } else if (PRODUCT_NAME_REPEATED_PATTERN.test(nombre.replace(/\s+/g, ''))) {
      errors.nombre_producto = PRODUCT_NAME_REPEATED_MESSAGE;
    }

    const descripcion = String(form.descripcion ?? '').trim();
    if (descripcion.length > 500) {
      errors.descripcion = 'La descripción no puede exceder 500 caracteres.';
    }

    const especificacionesLimpias = especificacionesRows
      .slice(0, clavesEspecificacionFijas.length)
      .map((item) => ({
        clave: String(item.clave || '').trim(),
        valor: String(item.valor || '').trim(),
      }))
      .filter((item) => item.clave || item.valor);

    if (!errors.especificaciones) {
      const filaInvalida = especificacionesLimpias.find((item) => {
        if (!item.clave || !item.valor) return true;
        if (item.clave.length > 60) return true;
        if (item.valor.length > 120) return true;
        return false;
      });

      if (filaInvalida) {
        if (!filaInvalida.clave || !filaInvalida.valor) {
          errors.especificaciones = 'Cada especificación debe tener clave y valor.';
        } else if (filaInvalida.clave.length > 60) {
          errors.especificaciones = 'La clave de una especificación no puede exceder 60 caracteres.';
        } else {
          errors.especificaciones = 'El valor de una especificación no puede exceder 120 caracteres.';
        }
      }
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
    } else if (precio < 0) {
      errors.precio_venta = 'No se permiten números negativos.';
    } else if (precio <= 0) {
      errors.precio_venta = 'El precio de venta debe ser mayor a 0.';
    } else if (precio > 999999.99) {
      errors.precio_venta = 'El precio no puede exceder L. 999,999.99';
    }

    if (mostrarPrecioCosto && form.precio_costo !== '') {
      const costo = Number(form.precio_costo);
      if (isNaN(costo)) {
        errors.precio_costo = 'El precio de costo debe ser un número válido.';
      } else if (costo < 0) {
        errors.precio_costo = 'El precio de costo debe ser mayor o igual a 0.';
      } else if (costo > 999999.99) {
        errors.precio_costo = 'El precio de costo no puede exceder L. 999,999.99';
      }
    }

    // ISV
    if (!form.cod_isv) {
      errors.cod_isv = 'Debe seleccionar un tipo de ISV.';
    }

    // Estado
    if (!['Activo', 'Inactivo', 'Descontinuado'].includes(form.estado_producto)) {
      errors.estado_producto = 'Estado inválido.';
    }

    if (form.stock_minimo !== '' && (!Number.isInteger(Number(form.stock_minimo)) || Number(form.stock_minimo) < 0)) {
      errors.stock_minimo = 'El stock mínimo debe ser un entero mayor o igual a 0.';
    }

    if (form.punto_reorden !== '' && (!Number.isInteger(Number(form.punto_reorden)) || Number(form.punto_reorden) < 0)) {
      errors.punto_reorden = 'El punto de reorden debe ser un entero mayor o igual a 0.';
    }

    if (
      form.stock_minimo !== ''
      && form.punto_reorden !== ''
      && Number(form.punto_reorden) < Number(form.stock_minimo)
    ) {
      errors.punto_reorden = 'El punto de reorden no puede ser menor que el stock mínimo.';
    }

    // Stock inicial (solo creación)
    if (!isEdit) {
      const stockRaw = form.stock_inicial === '' ? '0' : String(form.stock_inicial);
      const stockInicial = Number(stockRaw);

      if (!Number.isInteger(stockInicial) || stockInicial < 0) {
        errors.stock_inicial = 'El stock inicial debe ser un entero mayor o igual a 0.';
      }

      if (stockInicial > 0 && !form.cod_ubicacion) {
        errors.cod_ubicacion = 'Debe seleccionar una ubicación para asignar stock inicial.';
      }
    } else {
      const stockAgregarRaw = form.stock_agregar === '' ? '0' : String(form.stock_agregar);
      const stockAgregar = Number(stockAgregarRaw);

      if (!Number.isInteger(stockAgregar) || stockAgregar < 0) {
        errors.stock_agregar = 'El stock a agregar debe ser un entero mayor o igual a 0.';
      }

      if (stockAgregar > 0 && !form.cod_ubicacion) {
        errors.cod_ubicacion = 'Debe seleccionar una ubicación para agregar stock.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildCreatePayload = () => ({
    cod_categoria: Number(form.cod_categoria),
    nombre_producto: form.nombre_producto.trim(),
    descripcion: form.descripcion.trim() || null,
    especificaciones: construirEspecificaciones(),
    unidad_medida: form.unidad_medida.trim().toUpperCase(),
    precio_venta: Number(form.precio_venta),
    ...(mostrarPrecioCosto
      ? { precio_costo: form.precio_costo === '' ? null : Number(form.precio_costo) }
      : {}),
    stock_inicial: form.stock_inicial === '' ? 0 : Number(form.stock_inicial),
    cod_isv: Number(form.cod_isv),
    estado_producto: form.estado_producto,
    cod_ubicacion: form.cod_ubicacion ? Number(form.cod_ubicacion) : null,
    stock_minimo: form.stock_minimo === '' ? null : Number(form.stock_minimo),
    punto_reorden: form.punto_reorden === '' ? null : Number(form.punto_reorden),
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
      descripcion: form.descripcion.trim() || null,
      especificaciones: construirEspecificaciones(),
      unidad_medida: form.unidad_medida.trim().toUpperCase(),
      precio_venta: Number(form.precio_venta),
      ...(mostrarPrecioCosto
        ? { precio_costo: form.precio_costo === '' ? null : Number(form.precio_costo) }
        : {}),
      cod_isv: Number(form.cod_isv),
      estado_producto: form.estado_producto,
      cod_ubicacion: form.cod_ubicacion ? Number(form.cod_ubicacion) : null,
      stock_minimo: form.stock_minimo === '' ? null : Number(form.stock_minimo),
      punto_reorden: form.punto_reorden === '' ? null : Number(form.punto_reorden),
    };

    const fields = [
      'cod_categoria',
      'nombre_producto',
      'descripcion',
      'especificaciones',
      'unidad_medida',
      'precio_venta',
      ...(mostrarPrecioCosto ? ['precio_costo'] : []),
      'cod_isv',
      'estado_producto',
      'cod_ubicacion',
      'stock_minimo',
      'punto_reorden',
    ];

    // // Detecta TODOS los campos que cambiaron
    const normalizarComparacion = (valor) => {
      if (valor === null || valor === undefined) return '';
      if (typeof valor === 'number') return Number(valor);
      if (typeof valor === 'object') {
        try {
          return JSON.stringify(valor, Object.keys(valor).sort());
        } catch {
          return JSON.stringify(valor);
        }
      }
      return String(valor);
    };

    const changedData = {};
    for (const f of fields) {
      const a = original[f];
      const b = next[f];

      const normA = normalizarComparacion(a);
      const normB = normalizarComparacion(b);

      if (normA !== normB) {
        changedData[f] = next[f];
      }
    }

    const stockAgregar = form.stock_agregar === '' ? 0 : Number(form.stock_agregar);

    if (Object.keys(changedData).length === 0 && !imagenFile && stockAgregar <= 0) {
      throw new Error('No hay cambios para actualizar.');
    }

    return {
      cod_producto: selected.cod_producto,
      datos: changedData,
      stock_agregar: stockAgregar,
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
        if ((payload.datos && Object.keys(payload.datos).length > 0) || Number(payload.stock_agregar || 0) > 0) {
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
          descripcion: '',
          unidad_medida: 'UND',
          precio_venta: '',
          precio_costo: '',
          stock_inicial: '',
          stock_nuevo: '',
          stock_agregar: '',
          cod_isv: '',
          estado_producto: 'Activo',
          cod_ubicacion: '',
          stock_minimo: '',
          punto_reorden: '',
        });
        setEspecificacionesRows(construirEspecificacionesBase());
        handleRemoveImagen();
      }
    } catch (err) {
      setFormError(err.message || 'Error en el formulario');
    }
  };

  return (
    <div className="jyr-card">
      <div className="jyr-card-header">
        <h3>
          {isEdit ? 'Editar producto' : 'Crear producto'}
        </h3>
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

          <div className="jyr-form-group">
            <label className="jyr-form-label">Descripción (opcional)</label>
            <textarea
              className={`jyr-form-control ${fieldErrors.descripcion ? 'jyr-input-error' : ''}`}
              name="descripcion"
              rows={4}
              maxLength={500}
              placeholder="Describe el producto, usos, compatibilidad y detalles relevantes"
              value={form.descripcion}
              onChange={onChange}
              disabled={saving}
              style={{ resize: 'vertical' }}
            />
            {fieldErrors.descripcion && <span className="jyr-field-error">{fieldErrors.descripcion}</span>}
            <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
              {form.descripcion.trim().length}/500
            </span>
          </div>

          <div className="jyr-form-group">
            <label className="jyr-form-label" style={{ marginBottom: 8 }}>Especificaciones técnicas (Marca, Modelo, Año del carro)</label>

            <div style={{
              border: '1px solid var(--jyr-gray-200)',
              borderRadius: 10,
              padding: 12,
              background: 'var(--jyr-gray-50, #f9fafb)'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jyr-gray-600)', marginBottom: 8 }}>
                Datos base del producto
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {especificacionesRows.slice(0, clavesEspecificacionFijas.length).map((item, idx) => (
                  <div
                    key={`spec-fixed-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '180px 1fr',
                      gap: 8,
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--jyr-gray-700)',
                        padding: '0 6px'
                      }}
                    >
                      {clavesEspecificacionFijas[idx]}
                    </span>

                    <input
                      className="jyr-form-control"
                      placeholder={idx === 0 ? 'Ej: Bosch' : idx === 1 ? 'Ej: Civic 2020' : 'Ej: 2018'}
                      maxLength={120}
                      value={item.valor}
                      onChange={(e) => actualizarEspecificacion(idx, 'valor', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            </div>

            {fieldErrors.especificaciones && <span className="jyr-field-error">{fieldErrors.especificaciones}</span>}
            <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
              Ejemplo: Marca = Bosch, Modelo = Civic 2020, Año del carro = 2018.
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mostrarPrecioCosto ? '1fr 1fr 1fr' : '1fr 1fr',
            gap: 16
          }}>
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
                min="0"
                max="999999.99"
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                placeholder="0.00"
                value={form.precio_venta}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.precio_venta && <span className="jyr-field-error">{fieldErrors.precio_venta}</span>}
            </div>

            {mostrarPrecioCosto && (
              <div className="jyr-form-group">
                <label className="jyr-form-label">Precio costo (L.)</label>
                <input
                  className={`jyr-form-control ${fieldErrors.precio_costo ? 'jyr-input-error' : ''}`}
                  name="precio_costo"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  placeholder="Opcional"
                  value={form.precio_costo}
                  onChange={onChange}
                  disabled={saving}
                />
                {fieldErrors.precio_costo && <span className="jyr-field-error">{fieldErrors.precio_costo}</span>}
              </div>
            )}
          </div>

          {mostrarMargen && mostrarPrecioCosto && (
            <div className="jyr-form-group">
              <label className="jyr-form-label">Margen de ganancia (automático)</label>
              <div
                className="jyr-form-control"
                style={{
                  background: 'var(--jyr-gray-50, #f9fafb)',
                  color: margenCalculado === null
                    ? 'var(--jyr-gray-500)'
                    : (margenCalculado >= 0 ? 'var(--jyr-success, #16a34a)' : 'var(--jyr-danger, #dc2626)'),
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {margenCalculado === null ? 'Completa precio venta y costo' : `${margenCalculado.toFixed(2)}%`}
              </div>
              <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                Fórmula: ((precio_venta - precio_costo) / precio_venta) × 100.
              </span>
            </div>
          )}

          {!isEdit && (
            <div className="jyr-form-group">
              <label className="jyr-form-label">Stock inicial</label>
              <input
                className={`jyr-form-control ${fieldErrors.stock_inicial ? 'jyr-input-error' : ''}`}
                name="stock_inicial"
                type="number"
                step="1"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault();
                }}
                placeholder="0"
                value={form.stock_inicial}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.stock_inicial && <span className="jyr-field-error">{fieldErrors.stock_inicial}</span>}
              <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                Cantidad con la que iniciará en inventario.
              </span>
            </div>
          )}

          {isEdit && (
            <div className="jyr-form-group">
              <label className="jyr-form-label">Stock total actual</label>
              <div
                className="jyr-form-control"
                style={{
                  background: 'var(--jyr-gray-50, #f9fafb)',
                  color: 'var(--jyr-gray-700)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {Number(selected?.stock_total ?? 0)}
              </div>
              <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                Cantidad existente antes de actualizar.
              </span>
            </div>
          )}

          {isEdit && (
            <div className="jyr-form-group">
              <label className="jyr-form-label">Agregar stock</label>
              <input
                className={`jyr-form-control ${fieldErrors.stock_agregar ? 'jyr-input-error' : ''}`}
                name="stock_agregar"
                type="number"
                step="1"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault();
                }}
                placeholder="0"
                value={form.stock_agregar}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.stock_agregar && <span className="jyr-field-error">{fieldErrors.stock_agregar}</span>}
              <span style={{ fontSize: 11, color: 'var(--jyr-gray-400)' }}>
                Si deseas sumar rápido sin recalcular, usa este campo.
              </span>
            </div>
          )}

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
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Descontinuado">Descontinuado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jyr-form-group">
              <label className="jyr-form-label">Stock mínimo (opcional)</label>
              <input
                className={`jyr-form-control ${fieldErrors.stock_minimo ? 'jyr-input-error' : ''}`}
                name="stock_minimo"
                type="number"
                step="1"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault();
                }}
                placeholder="Ej: 10"
                value={form.stock_minimo}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.stock_minimo && <span className="jyr-field-error">{fieldErrors.stock_minimo}</span>}
            </div>

            <div className="jyr-form-group">
              <label className="jyr-form-label">Punto de reorden (opcional)</label>
              <input
                className={`jyr-form-control ${fieldErrors.punto_reorden ? 'jyr-input-error' : ''}`}
                name="punto_reorden"
                type="number"
                step="1"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault();
                }}
                placeholder="Ej: 15"
                value={form.punto_reorden}
                onChange={onChange}
                disabled={saving}
              />
              {fieldErrors.punto_reorden && <span className="jyr-field-error">{fieldErrors.punto_reorden}</span>}
            </div>
          </div>

          {/* HU-10: Ubicación en bodega */}
          <div className="jyr-form-group">
            <label className="jyr-form-label">Ubicación en bodega</label>
            <select
              className={`jyr-form-control jyr-form-select ${fieldErrors.cod_ubicacion ? 'jyr-input-error' : ''}`}
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
            {fieldErrors.cod_ubicacion && <span className="jyr-field-error">{fieldErrors.cod_ubicacion}</span>}
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

          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="jyr-btn jyr-btn-primary"
              style={{ minWidth: 190 }}
              disabled={saving}
            >
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar producto'}
            </button>

            {isEdit && (
              <button
                type="button"
                className="jyr-btn jyr-btn-outline"
                style={{ minWidth: 140 }}
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
