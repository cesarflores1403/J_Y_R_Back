import { body } from 'express-validator';
import { validarCampos } from './validar.js';
import CategoriaProducto from '../models/CategoriaProducto.js';

const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s.,#()\/&+\-]*$/u;
const PRODUCT_NAME_FORMAT_MESSAGE = 'El nombre solo puede contener letras, números, espacios y los símbolos . , - / # ( ) & +.';
const PRODUCT_NAME_REPEATED_PATTERN = /^([\p{L}\p{N}])\1+$/u;
const PRODUCT_NAME_REPEATED_MESSAGE = 'El nombre no puede estar formado por un mismo carácter repetido.';
const hasRepeatedProductName = (value) => PRODUCT_NAME_REPEATED_PATTERN.test(String(value || '').trim().replace(/\s+/g, ''));

// =====================================================
// HU-03: Validaciones de producto con express-validator
// Mensajes por campo, reglas mínimas del catálogo
// =====================================================

// =======================
// CREAR PRODUCTO
// =======================
export const validarCrearProducto = [
  body('cod_categoria')
    .notEmpty().withMessage('La categoría es obligatoria.')
    .isInt({ min: 1 }).withMessage('La categoría debe ser un número entero válido.')
    .custom(async (val) => {
      const cat = await CategoriaProducto.findByPk(val);
      if (!cat) throw new Error('La categoría seleccionada no existe.');
      if (!cat.estado_categoria) throw new Error('La categoría seleccionada está inactiva.');
      return true;
    }),

  body('nombre_producto')
    .trim()
    .notEmpty().withMessage('El nombre del producto es obligatorio.')
    .isString().withMessage('El nombre debe ser texto.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
    .matches(PRODUCT_NAME_PATTERN).withMessage(PRODUCT_NAME_FORMAT_MESSAGE)
    .custom((value) => {
      if (hasRepeatedProductName(value)) throw new Error(PRODUCT_NAME_REPEATED_MESSAGE);
      return true;
    }),

  body('descripcion')
    .optional({ values: 'null' })
    .isString().withMessage('La descripción debe ser texto.')
    .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres.')
    .trim(),

  body('especificaciones')
    .optional({ values: 'null' })
    .isObject().withMessage('Las especificaciones deben enviarse como un objeto clave-valor.')
    .custom((val) => {
      const entries = Object.entries(val || {});
      if (entries.length > 30) throw new Error('No se permiten más de 30 especificaciones.');

      for (const [clave, valor] of entries) {
        if (!String(clave || '').trim()) throw new Error('Cada especificación debe tener una clave válida.');
        if (!String(valor || '').trim()) throw new Error('Cada especificación debe tener un valor válido.');
        if (String(clave).trim().length > 60) throw new Error('La clave de una especificación no puede exceder 60 caracteres.');
        if (String(valor).trim().length > 120) throw new Error('El valor de una especificación no puede exceder 120 caracteres.');
      }

      return true;
    }),

  body('unidad_medida')
    .notEmpty().withMessage('La unidad de medida es obligatoria.')
    .isString().withMessage('La unidad de medida debe ser texto.')
    .isLength({ min: 1, max: 10 }).withMessage('La unidad de medida debe tener entre 1 y 10 caracteres.')
    .trim(),

  body('precio_venta')
    .notEmpty().withMessage('El precio de venta es obligatorio.')
    .isFloat({ gt: 0 }).withMessage('El precio de venta debe ser mayor a 0.')
    .custom((val) => {
      if (Number(val) > 999999.99) throw new Error('El precio no puede exceder L. 999,999.99');
      return true;
    }),

  body('precio_costo')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('El precio de costo debe ser mayor o igual a 0.')
    .custom((val) => {
      if (Number(val) > 999999.99) throw new Error('El precio de costo no puede exceder L. 999,999.99');
      return true;
    }),

  body('cod_isv')
    .notEmpty().withMessage('Debe seleccionar un tipo de ISV.')
    .isInt({ min: 1 }).withMessage('El código ISV debe ser un número entero válido.'),

  body('estado_producto')
    .optional()
    .isIn(['Activo', 'Inactivo', 'Descontinuado']).withMessage('Estado inválido. Valores: Activo, Inactivo, Descontinuado.'),

  body('cod_ubicacion')
    .optional({ values: 'null' })
    .isInt({ min: 1 }).withMessage('La ubicación debe ser un número entero válido.'),

  body('stock_minimo')
    .optional({ values: 'null' })
    .isInt({ min: 0 }).withMessage('stock_minimo debe ser un entero mayor o igual a 0.'),

  body('punto_reorden')
    .optional({ values: 'null' })
    .isInt({ min: 0 }).withMessage('punto_reorden debe ser un entero mayor o igual a 0.')
    .custom((val, { req }) => {
      if (val === undefined || val === null || val === '') return true;
      const stockMinimo = req.body?.stock_minimo;
      if (stockMinimo === undefined || stockMinimo === null || stockMinimo === '') return true;
      if (Number(val) < Number(stockMinimo)) {
        throw new Error('punto_reorden no puede ser menor que stock_minimo.');
      }
      return true;
    }),

  body('stock_inicial')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock inicial debe ser un número entero mayor o igual a 0.')
    .custom((val, { req }) => {
      const stockInicial = Number(val || 0);
      const codUbicacion = req.body?.cod_ubicacion;

      if (stockInicial > 0 && (codUbicacion === undefined || codUbicacion === null || codUbicacion === '')) {
        throw new Error('Debe seleccionar una ubicación para asignar stock inicial.');
      }

      return true;
    }),

  validarCampos, // // Middleware que retorna errores 400
];

// =======================
// ACTUALIZAR PRODUCTO (HU-05: permite múltiples campos)
// =======================
export const validarActualizarProducto = [
  body('cod_producto')
    .notEmpty().withMessage('cod_producto es obligatorio.')
    .isInt({ min: 1 }).withMessage('cod_producto debe ser un entero positivo.'),

  body('stock_agregar')
    .optional()
    .isInt({ min: 0 }).withMessage('stock_agregar debe ser un entero mayor o igual a 0.'),

  body('stock_nuevo')
    .optional({ values: 'null' })
    .isInt({ min: 0 }).withMessage('stock_nuevo debe ser un entero mayor o igual a 0.'),

  body('datos')
    .optional()
    .isObject().withMessage('datos debe ser un objeto.')
    .custom(async (datos) => {
      if (datos === undefined) return true;

      const keys = Object.keys(datos);
      if (keys.length === 0) return true;

      const camposPermitidos = ['cod_categoria', 'nombre_producto', 'descripcion', 'especificaciones', 'unidad_medida', 'precio_venta', 'precio_costo', 'cod_isv', 'estado_producto', 'cod_ubicacion', 'stock_minimo', 'punto_reorden'];

      // Validar cada campo enviado
      for (const campo of keys) {
        const valor = datos[campo];

        if (!camposPermitidos.includes(campo)) {
          throw new Error(`Campo "${campo}" no es un campo válido de producto.`);
        }

        switch (campo) {
          case 'cod_categoria':
            {
              const cat = await CategoriaProducto.findByPk(Number(valor));
              if (!cat) throw new Error('cod_categoria no existe.');
              if (!cat.estado_categoria) throw new Error('La categoría seleccionada está inactiva.');
            }
            break;
          case 'nombre_producto':
            if (!valor || typeof valor !== 'string' || valor.trim().length < 2) throw new Error('nombre_producto debe tener al menos 2 caracteres.');
            if (valor.trim().length > 100) throw new Error('nombre_producto no puede exceder 100 caracteres.');
            if (!PRODUCT_NAME_PATTERN.test(valor.trim())) throw new Error(PRODUCT_NAME_FORMAT_MESSAGE);
            if (hasRepeatedProductName(valor)) throw new Error(PRODUCT_NAME_REPEATED_MESSAGE);
            break;
          case 'descripcion':
            if (valor !== null && typeof valor !== 'string') throw new Error('descripcion debe ser texto o null.');
            if (valor !== null && valor.trim().length > 500) throw new Error('descripcion no puede exceder 500 caracteres.');
            break;
          case 'especificaciones':
            if (valor !== null && (typeof valor !== 'object' || Array.isArray(valor))) {
              throw new Error('especificaciones debe ser un objeto clave-valor o null.');
            }
            if (valor !== null) {
              const entries = Object.entries(valor || {});
              if (entries.length > 30) throw new Error('No se permiten más de 30 especificaciones.');

              for (const [clave, valorEspecificacion] of entries) {
                if (!String(clave || '').trim()) throw new Error('Cada especificación debe tener una clave válida.');
                if (!String(valorEspecificacion || '').trim()) throw new Error('Cada especificación debe tener un valor válido.');
                if (String(clave).trim().length > 60) throw new Error('La clave de una especificación no puede exceder 60 caracteres.');
                if (String(valorEspecificacion).trim().length > 120) throw new Error('El valor de una especificación no puede exceder 120 caracteres.');
              }
            }
            break;
          case 'unidad_medida':
            if (!valor || typeof valor !== 'string' || valor.trim().length < 1) throw new Error('unidad_medida es obligatoria.');
            if (valor.trim().length > 10) throw new Error('unidad_medida no puede exceder 10 caracteres.');
            break;
          case 'precio_venta':
            if (Number(valor) <= 0) throw new Error('precio_venta debe ser mayor a 0.');
            if (Number(valor) > 999999.99) throw new Error('precio_venta no puede exceder 999,999.99.');
            break;
          case 'precio_costo':
            if (valor !== null && valor !== '' && Number(valor) < 0) throw new Error('precio_costo debe ser mayor o igual a 0.');
            if (valor !== null && valor !== '' && Number(valor) > 999999.99) throw new Error('precio_costo no puede exceder 999,999.99.');
            break;
          case 'cod_isv':
            if (!Number.isInteger(Number(valor)) || Number(valor) < 1) throw new Error('cod_isv debe ser un entero positivo.');
            break;
          case 'estado_producto':
            if (!['Activo', 'Inactivo', 'Descontinuado'].includes(valor)) throw new Error('estado_producto inválido.');
            break;
          case 'cod_ubicacion':
            if (valor !== null && (!Number.isInteger(Number(valor)) || Number(valor) < 1)) throw new Error('cod_ubicacion debe ser un entero positivo o null.');
            break;
          case 'stock_minimo':
            if (valor !== null && (!Number.isInteger(Number(valor)) || Number(valor) < 0)) throw new Error('stock_minimo debe ser un entero mayor o igual a 0 o null.');
            break;
          case 'punto_reorden':
            if (valor !== null && (!Number.isInteger(Number(valor)) || Number(valor) < 0)) throw new Error('punto_reorden debe ser un entero mayor o igual a 0 o null.');
            if (datos.stock_minimo !== undefined && datos.stock_minimo !== null && Number(valor) < Number(datos.stock_minimo)) {
              throw new Error('punto_reorden no puede ser menor que stock_minimo.');
            }
            break;
        }
      }

      return true;
    }),

  body().custom((_, { req }) => {
    const datos = req.body?.datos;
    const tieneCambiosCatalogo = datos && typeof datos === 'object' && !Array.isArray(datos) && Object.keys(datos).length > 0;
    const stockAgregar = Number(req.body?.stock_agregar || 0);
    const stockNuevoDefinido = req.body?.stock_nuevo !== undefined && req.body?.stock_nuevo !== null && req.body?.stock_nuevo !== '';
    const stockNuevo = stockNuevoDefinido ? Number(req.body?.stock_nuevo) : null;

    const stockAgregarValido = Number.isInteger(stockAgregar) && stockAgregar > 0;
    const stockNuevoValido = stockNuevoDefinido && Number.isInteger(stockNuevo) && stockNuevo >= 0;

    if (!tieneCambiosCatalogo && !stockAgregarValido && !stockNuevoValido) {
      throw new Error('Debe enviar al menos un campo en datos, un stock_agregar mayor a 0 o un stock_nuevo válido.');
    }

    return true;
  }),

  validarCampos,
];

// =======================
// CAMBIAR ESTADO
// =======================
export const validarCambiarEstado = [
  body('cod_producto')
    .notEmpty().withMessage('cod_producto es obligatorio.')
    .isInt({ min: 1 }).withMessage('cod_producto debe ser un entero positivo.'),

  body('estado')
    .notEmpty().withMessage('estado es obligatorio.')
    .isIn(['Activo', 'Inactivo', 'Descontinuado']).withMessage('Estado inválido. Valores permitidos: Activo, Inactivo, Descontinuado.'),

  validarCampos,
];

// =======================
// CAMBIAR ESTADO MASIVO
// =======================
export const validarCambiarEstadoMasivo = [
  body('cod_productos')
    .isArray({ min: 1 }).withMessage('cod_productos debe ser un arreglo con al menos 1 producto.')
    .custom((arr) => {
      if (!Array.isArray(arr)) return false;
      const ids = arr.map(Number);
      if (ids.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('Todos los cod_productos deben ser enteros positivos.');
      }
      const unicos = new Set(ids);
      if (unicos.size !== ids.length) {
        throw new Error('No se permiten cod_productos repetidos.');
      }
      return true;
    }),

  body('estado')
    .notEmpty().withMessage('estado es obligatorio.')
    .isIn(['Activo', 'Inactivo', 'Descontinuado']).withMessage('Estado inválido. Valores permitidos: Activo, Inactivo, Descontinuado.'),

  validarCampos,
];

// =======================
// ELIMINAR PRODUCTO
// =======================
export const validarEliminarProducto = [
  body('cod_producto')
    .notEmpty().withMessage('cod_producto es obligatorio para eliminar.')
    .isInt({ min: 1 }).withMessage('cod_producto debe ser un entero positivo.'),

  validarCampos,
];
