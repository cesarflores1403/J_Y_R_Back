import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, obtener, crear, actualizar, toggleEstado } from '../controllers/proveedorController.js';

const router = Router();

router.use(autenticar);

router.get('/', listar);
router.get('/:id', obtener);

router.post('/', [
  body('nombre_proveedor').notEmpty().withMessage('El nombre es requerido'),
  validarCampos
], crear);

router.put('/:id', [
  body('nombre_proveedor').notEmpty().withMessage('El nombre es requerido'),
  validarCampos
], actualizar);

router.patch('/:id/toggle-estado', toggleEstado);

export default router;
