import {Router} from 'express';
import {body} from 'express-validator';
import {validarCampos} from '../middlewares/validar.js';
import {autenticar,autorizar} from '../middlewares/auth.js';
import {listar,obtener,crear,actualizar,toggleEstado,eliminar} from '../controllers/proveedorController.js';

const router=Router();

// Regexs de validación
const regexCorreo=/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;
const regexLetras=/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

// Middleware global
router.use(autenticar);

// Obtener datos
router.get('/',listar);
router.get('/:id',obtener);

// Crear proveedor
router.post('/',[
  body('nombre_proveedor')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({min:2,max:100}).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(regexLetras).withMessage('El nombre solo permite letras'),

  body('telefono')
    .optional({checkFalsy:true})
    .matches(/^[0-9-]+$/).withMessage('Teléfono inválido')
    .isLength({min:8,max:9}).withMessage('El teléfono debe tener 8 dígitos'),

  body('correo')
    .optional({checkFalsy:true})
    .isLength({max:100}).withMessage('Correo demasiado largo')
    .matches(regexCorreo).withMessage('Correo inválido'),

  body('pais')
    .optional({checkFalsy:true})
    .matches(regexLetras).withMessage('El país solo permite letras')
    .isLength({max:50}).withMessage('País demasiado largo'),

  body('validado')
    .optional({checkFalsy:true})
    .isLength({max:100}).withMessage('Texto demasiado largo'),

  validarCampos
],crear);

// Actualizar proveedor
router.put('/:id',[
  body('nombre_proveedor')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({min:2,max:100}).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(regexLetras).withMessage('El nombre solo permite letras'),

  body('telefono')
    .optional({checkFalsy:true})
    .matches(/^[0-9-]+$/).withMessage('Teléfono inválido')
    .isLength({min:8,max:9}).withMessage('El teléfono debe tener 8 dígitos'),

  body('correo')
    .optional({checkFalsy:true})
    .isLength({max:100}).withMessage('Correo demasiado largo')
    .matches(regexCorreo).withMessage('Correo inválido'),

  body('pais')
    .optional({checkFalsy:true})
    .matches(regexLetras).withMessage('El país solo permite letras')
    .isLength({max:50}).withMessage('País demasiado largo'),

  body('validado')
    .optional({checkFalsy:true})
    .isLength({max:100}).withMessage('Texto demasiado largo'),

  validarCampos
],actualizar);

// Cambiar estado
router.patch('/:id/toggle-estado',toggleEstado);

// Eliminar (solo admin)
router.delete('/:id',autorizar('Administrador'),eliminar);

export default router;
