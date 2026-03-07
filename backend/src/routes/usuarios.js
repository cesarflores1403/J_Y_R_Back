import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, listarRoles, crear, actualizar, toggleEstado, eliminar } from '../controllers/usuarioController.js';

const router = Router();
router.use(autenticar);

router.get('/roles', listarRoles);
router.get('/', listar);

router.post('/', [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validarCampos
], crear);

router.put('/:id', [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  validarCampos
], actualizar);

router.patch('/:id/toggle-estado', toggleEstado);
router.delete('/:id', eliminar);

export default router;