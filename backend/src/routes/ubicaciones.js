import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, obtener, crear, actualizar, eliminar, desactivar, reactivar } from '../controllers/ubicacionController.js';

const router = Router();

router.use(autenticar);

router.get('/', [
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive debe ser true o false'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('search debe ser texto de hasta 120 caracteres'),
  query('buscar')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('buscar debe ser texto de hasta 120 caracteres'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un entero mayor o igual a 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limit debe ser un entero entre 1 y 200'),
  validarCampos
], listar);

router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de ubicacion debe ser numerico')
], validarCampos, obtener);

router.post('/', [
  body('pasillo')
    .trim()
    .notEmpty()
    .withMessage('El pasillo es requerido'),
  body('estanteria')
    .trim()
    .notEmpty()
    .withMessage('La estanteria es requerida'),
  body('nivel_1')
    .trim()
    .notEmpty()
    .withMessage('El nivel_1 es requerido'),
  body('codigo_producto')
    .trim()
    .notEmpty()
    .withMessage('El codigo_producto es requerido'),
  body('nivel_2')
    .optional({ nullable: true })
    .trim(),
  body('descripcion')
    .optional({ nullable: true })
    .trim(),
  validarCampos
], crear);

router.put('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de ubicacion debe ser numerico'),
  body('pasillo')
    .trim()
    .notEmpty()
    .withMessage('El pasillo es requerido'),
  body('estanteria')
    .trim()
    .notEmpty()
    .withMessage('La estanteria es requerida'),
  body('nivel_1')
    .trim()
    .notEmpty()
    .withMessage('El nivel_1 es requerido'),
  body('codigo_producto')
    .trim()
    .notEmpty()
    .withMessage('El codigo_producto es requerido'),
  body('nivel_2')
    .optional({ nullable: true })
    .trim(),
  body('descripcion')
    .optional({ nullable: true })
    .trim(),
  validarCampos
], actualizar);

router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de ubicacion debe ser numerico'),
  validarCampos
], eliminar);

router.patch('/:id/desactivar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de ubicacion debe ser numerico'),
  validarCampos
], desactivar);

router.patch('/:id/reactivar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de ubicacion debe ser numerico'),
  validarCampos
], reactivar);

export default router;

