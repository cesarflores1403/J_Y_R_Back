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
  body('codigo_qr')
    .trim()
    .notEmpty()
    .withMessage('El codigo_qr es requerido'),
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
  body('codigo_qr')
    .trim()
    .notEmpty()
    .withMessage('El codigo_qr es requerido'),
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
