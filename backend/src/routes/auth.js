import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { login, perfil, cambiarPassword, solicitarRecuperacion } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validarCampos
], login);

// GET /api/auth/perfil
router.get('/perfil', autenticar, perfil);

// PUT /api/auth/cambiar-password
router.put('/cambiar-password', autenticar, [
  body('password_actual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('password_nuevo').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  validarCampos
], cambiarPassword);

// POST /api/auth/solicitar-recuperacion
router.post('/solicitar-recuperacion', [
  body('correo').isEmail().withMessage('Correo inválido'),
  validarCampos
], solicitarRecuperacion);

export default router;
