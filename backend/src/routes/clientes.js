import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, obtener, crear, actualizar, eliminar, verificarDuplicado } from '../controllers/clienteController.js';

const router = Router();

router.use(autenticar);

router.get('/verificar-duplicado', verificarDuplicado);
router.get('/', listar);
router.get('/:id', obtener);

router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  validarCampos
], crear);

router.put('/:id', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  validarCampos
], actualizar);

router.delete('/:id', eliminar);

export default router;
