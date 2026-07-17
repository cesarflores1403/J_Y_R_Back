import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { loginRateLimiter } from '../middlewares/loginRateLimiter.js';
import { login, perfil, cambiarPassword, solicitarRecuperacion } from '../controllers/authController.js';

const router = Router();

// Caracteres permitidos en autenticación. Bloquean emojis, caracteres no
// controlados, símbolos típicos de inyección SQL (comillas ' " ` , plecas |,
// punto y coma ; y barra invertida \ ) y corchetes angulares de HTML (< >).
const USUARIO_PERMITIDO = /^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ._@-]+$/;
const PASSWORD_PERMITIDO = /^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ !@#$%^&*()_+\-=[\]{}:,./?~]+$/;
// Secuencias de inyección SQL que no se detectan por caracteres sueltos (-- , /* , */).
const SIN_PATRON_SQL = /^(?!.*(--|\/\*|\*\/)).*$/s;
// Rechaza cualquier corchete angular (prevención de inyección de etiquetas HTML/XSS).
const SIN_HTML = /^[^<>]*$/s;

// POST /api/auth/login
router.post('/login', loginRateLimiter, [
  body('nombre_usuario')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ max: 50 }).withMessage('El nombre de usuario no puede exceder los 50 caracteres')
    .matches(USUARIO_PERMITIDO).withMessage('El usuario solo admite letras, números y los símbolos . _ - @')
    .matches(SIN_PATRON_SQL).withMessage('Se ingresaron caracteres no permitidos')
    .matches(SIN_HTML).withMessage('Se ingresaron caracteres no permitidos'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    // El valor no se recorta (una contraseña puede tener espacios), pero se rechaza si es solo espacios.
    .custom((valor) => typeof valor === 'string' && valor.trim().length > 0).withMessage('La contraseña no puede contener solo espacios')
    .isLength({ max: 64 }).withMessage('La contraseña no puede exceder los 64 caracteres')
    .matches(PASSWORD_PERMITIDO).withMessage('La contraseña contiene caracteres no permitidos')
    .matches(SIN_PATRON_SQL).withMessage('Se ingresaron caracteres no permitidos')
    .matches(SIN_HTML).withMessage('Se ingresaron caracteres no permitidos'),
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
  body('nombre_usuario')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ max: 50 }).withMessage('El nombre de usuario excede el máximo permitido')
    .matches(USUARIO_PERMITIDO).withMessage('El usuario solo admite letras, números y los símbolos . _ - @')
    .matches(SIN_PATRON_SQL).withMessage('Se ingresaron caracteres no permitidos')
    .matches(SIN_HTML).withMessage('Se ingresaron caracteres no permitidos'),
  validarCampos
], solicitarRecuperacion);

export default router;
