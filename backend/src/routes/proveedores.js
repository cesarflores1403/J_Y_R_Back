import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, obtener, crear, actualizar, eliminar, verificarDuplicado } from '../controllers/clienteController.js';

const router = Router();
const REGEX_TEXTO_CON_PUNTO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]+$/;
const REGEX_CORREO_PERMITIDO = /^[A-Za-z0-9@.]+$/;
const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

const validarCliente = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 10 }).withMessage('El nombre no puede exceder 10 caracteres')
    .matches(REGEX_SOLO_LETRAS).withMessage('El nombre solo permite letras y espacios'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ max: 10 }).withMessage('El apellido no puede exceder 10 caracteres')
    .matches(REGEX_SOLO_LETRAS).withMessage('El apellido solo permite letras y espacios'),
  body('dni')
    .trim()
    .notEmpty().withMessage('El DNI es requerido')
    .isLength({ min: 13, max: 13 }).withMessage('El DNI debe tener exactamente 13 dígitos')
    .matches(/^\d+$/).withMessage('El DNI solo permite números'),
  body('rtn')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 14, max: 14 }).withMessage('El RTN debe tener exactamente 14 dígitos')
    .matches(/^\d+$/).withMessage('El RTN solo permite números'),
  body('empresa')
    .trim()
    .notEmpty().withMessage('La empresa es requerida')
    .isLength({ max: 15 }).withMessage('La empresa no puede exceder 15 caracteres')
    .matches(REGEX_TEXTO_CON_PUNTO).withMessage('La empresa solo permite letras, números, espacios y punto'),
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .isLength({ min: 8, max: 8 }).withMessage('El teléfono debe tener exactamente 8 dígitos')
    .matches(/^\d+$/).withMessage('El teléfono solo permite números'),
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es requerido')
    .isLength({ max: 30 }).withMessage('El correo no puede exceder 30 caracteres')
    .matches(REGEX_CORREO_PERMITIDO).withMessage('El correo solo permite letras, números, @ y punto')
    .isEmail().withMessage('El correo no tiene un formato válido'),
  body('direccion')
    .trim()
    .notEmpty().withMessage('La dirección es requerida')
    .isLength({ max: 60 }).withMessage('La dirección no puede exceder 60 caracteres')
    .matches(REGEX_TEXTO_CON_PUNTO).withMessage('La dirección solo permite letras, números, espacios y punto'),
  validarCampos
];

router.use(autenticar);

router.get('/verificar-duplicado', verificarDuplicado);
router.get('/', listar);
router.get('/:id', obtener);

router.post('/', validarCliente, crear);

router.put('/:id', validarCliente, actualizar);

router.delete('/:id', eliminar);

export default router;
