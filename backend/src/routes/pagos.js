import { Router } from 'express';
import { body, param } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listarPorFactura, registrarPago, anularPago } from '../controllers/pagoController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Listar pagos de una factura
router.get('/factura/:codFactura', [
  param('codFactura').isInt({ min: 1 }).withMessage('codFactura debe ser un entero positivo'),
  validarCampos
], listarPorFactura);

// Registrar un pago (Administrador y Cajero)
const validarRegistroPago = [
  body('cod_factura').isInt({ min: 1 }).withMessage('cod_factura es requerido'),
  body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  body('metodo_pago').isInt({ min: 1 }).withMessage('metodo_pago debe ser un entero positivo'),
  body('ref_pago').optional({ values: 'null' }).isString().isLength({ max: 200 }).withMessage('ref_pago no puede exceder 200 caracteres'),
  body('observacion').optional({ values: 'null' }).isString().isLength({ max: 1000 }).withMessage('observacion no puede exceder 1000 caracteres'),
  validarCampos
];
router.post('/', autorizar('Administrador', 'Cajero'), validarRegistroPago, registrarPago);

// Anular un pago (solo Administrador)
router.patch('/:codPago/anular', [
  param('codPago').isInt({ min: 1 }).withMessage('codPago debe ser un entero positivo'),
  validarCampos
], autorizar('Administrador'), anularPago);

export default router;
