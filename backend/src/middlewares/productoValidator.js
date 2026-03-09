import { body } from 'express-validator';
import { validarCampos } from './validar.js';
import CategoriaProducto from '../models/CategoriaProducto.js';

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
    .notEmpty().withMessage('El nombre del producto es obligatorio.')
    .isString().withMessage('El nombre debe ser texto.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
    .trim(),

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

  body('cod_isv')
    .notEmpty().withMessage('Debe seleccionar un tipo de ISV.')
    .isInt({ min: 1 }).withMessage('El código ISV debe ser un número entero válido.'),

  body('estado_producto')
    .optional()
    .isIn(['Activo', 'Inactivo', 'Descontinuado']).withMessage('Estado inválido. Valores: Activo, Inactivo, Descontinuado.'),

  body('cod_ubicacion')
    .optional({ values: 'null' })
    .isInt({ min: 1 }).withMessage('La ubicación debe ser un número entero válido.'),

  validarCampos, // // Middleware que retorna errores 400
];

// =======================
// ACTUALIZAR PRODUCTO (HU-05: permite múltiples campos)
// =======================
export const validarActualizarProducto = [
  body('cod_producto')
    .notEmpty().withMessage('cod_producto es obligatorio.')
    .isInt({ min: 1 }).withMessage('cod_producto debe ser un entero positivo.'),

  body('datos')
    .notEmpty().withMessage('datos es obligatorio.')
    .isObject().withMessage('datos debe ser un objeto.')
    .custom(async (datos) => {
      const keys = Object.keys(datos);
      if (keys.length === 0) throw new Error('datos no puede estar vacío.');

      const camposPermitidos = ['cod_categoria', 'nombre_producto', 'unidad_medida', 'precio_venta', 'cod_isv', 'estado_producto', 'cod_ubicacion'];

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
            break;
          case 'unidad_medida':
            if (!valor || typeof valor !== 'string' || valor.trim().length < 1) throw new Error('unidad_medida es obligatoria.');
            if (valor.trim().length > 10) throw new Error('unidad_medida no puede exceder 10 caracteres.');
            break;
          case 'precio_venta':
            if (Number(valor) <= 0) throw new Error('precio_venta debe ser mayor a 0.');
            if (Number(valor) > 999999.99) throw new Error('precio_venta no puede exceder 999,999.99.');
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
        }
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
// ELIMINAR PRODUCTO
// =======================
export const validarEliminarProducto = [
  body('cod_producto')
    .notEmpty().withMessage('cod_producto es obligatorio para eliminar.')
    .isInt({ min: 1 }).withMessage('cod_producto debe ser un entero positivo.'),

  validarCampos,
];
