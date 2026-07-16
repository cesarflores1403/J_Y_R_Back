import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { loginRateLimit } from '../middlewares/loginRateLimit.js';
import { validatePasswordPolicy, passwordPolicyMessage } from '../utils/passwordPolicy.js';
import { login, perfil, cambiarPassword, solicitarRecuperacion } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginRateLimit, [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validarCampos
], login);

// GET /api/auth/perfil
router.get('/perfil', autenticar, perfil);

// PUT /api/auth/cambiar-password
router.put('/cambiar-password', autenticar, [
  body('password_actual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('password_nuevo').custom((value, { req }) => {
    if (validatePasswordPolicy(value, { username: req.usuario?.nombre_usuario }).length > 0) {
      throw new Error(passwordPolicyMessage);
    }
    return true;
  }),
  validarCampos
], cambiarPassword);

// POST /api/auth/solicitar-recuperacion
router.post('/solicitar-recuperacion', [
  body('nombre_usuario')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ max: 50 }).withMessage('El nombre de usuario excede el máximo permitido'),
  validarCampos
], solicitarRecuperacion);

export default router;
