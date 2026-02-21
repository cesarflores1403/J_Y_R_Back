import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listarPorFactura, registrarPago, anularPago } from '../controllers/pagoController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Listar pagos de una factura
router.get('/factura/:codFactura', listarPorFactura);

// Registrar un pago (Administrador y Cajero)
const validarRegistroPago = [
  body('cod_factura').isInt({ min: 1 }).withMessage('cod_factura es requerido'),
  body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  body('metodo_pago').isIn([1, 2, 3]).withMessage('Método de pago inválido (1=Efectivo, 2=Tarjeta, 3=Transferencia)'),
  body('ref_pago').optional().isString(),
  body('observacion').optional().isString(),
  validarCampos
];
router.post('/', autorizar('Administrador', 'Cajero'), validarRegistroPago, registrarPago);

// Anular un pago (solo Administrador)
router.patch('/:codPago/anular', autorizar('Administrador'), anularPago);

export default router;
