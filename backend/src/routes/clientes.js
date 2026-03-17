import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, obtener, crear, actualizar, eliminar, verificarDuplicado } from '../controllers/clienteController.js';

const router = Router();
const REGEX_TEXTO_CON_PUNTO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]+$/;
const REGEX_CORREO_PERMITIDO = /^[A-Za-z0-9@.]+$/;

const validarCliente = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('empresa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 15 }).withMessage('La empresa no puede exceder 15 caracteres')
    .matches(REGEX_TEXTO_CON_PUNTO).withMessage('La empresa solo permite letras, números, espacios y punto'),
  body('correo')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('El correo no puede exceder 30 caracteres')
    .matches(REGEX_CORREO_PERMITIDO).withMessage('El correo solo permite letras, números, @ y punto')
    .isEmail().withMessage('El correo no tiene un formato válido'),
  body('direccion')
    .optional({ checkFalsy: true })
    .trim()
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
