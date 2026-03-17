import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, listarRoles, crear, actualizar, toggleEstado, eliminar } from '../controllers/usuarioController.js';

const router = Router();
router.use(autenticar);

// Administrador puede visualizar usuarios. Super Administrador también por bypass en middleware.
router.get('/roles', autorizar('Administrador'), listarRoles);
router.get('/', autorizar('Administrador'), listar);

router.post('/', [
  autorizar('Super Administrador'),
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validarCampos
], crear);

router.put('/:id', [
  autorizar('Administrador'),
  body('nombre_usuario').optional().notEmpty().withMessage('El nombre de usuario es requerido'),
  body('contrasena').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('cod_rol').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Rol inválido'),
  validarCampos
], actualizar);

router.patch('/:id/toggle-estado', autorizar('Super Administrador'), toggleEstado);
router.delete('/:id', autorizar('Super Administrador'), eliminar);

export default router;